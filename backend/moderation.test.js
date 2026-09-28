import { describe, it, expect } from 'vitest'
import {
  REPORT_REASONS, MAX_DETAIL_LENGTH, MAX_REPORTS_PER_DAY,
  normalizeReason, normalizeDetail, isUrgent,
  validateBlock, validateReport,
  blockedIds, canInteract, filterBlocked, underReportLimit,
} from './moderation.js'

const A = 'user-a', B = 'user-b', C = 'user-c'

describe('a block works in both directions', () => {
  // The reason this module exists. A one-way block is a mute: the person you
  // blocked keeps seeing you, and keeps finding ways to make contact.
  it('hides the blocked person from the blocker', () => {
    const blocked = blockedIds([{ blocker_id: A, blocked_id: B }], A)
    expect(canInteract(B, blocked)).toBe(false)
  })

  it('hides the blocker from the blocked person', () => {
    const blocked = blockedIds([{ blocker_id: A, blocked_id: B }], B)
    expect(canInteract(A, blocked)).toBe(false)
  })

  it('leaves everyone else alone', () => {
    const blocked = blockedIds([{ blocker_id: A, blocked_id: B }], A)
    expect(canInteract(C, blocked)).toBe(true)
  })

  it('ignores rows that do not involve me', () => {
    // A widened query must not quietly hide strangers.
    const blocked = blockedIds([{ blocker_id: B, blocked_id: C }], A)
    expect(blocked.size).toBe(0)
    expect(canInteract(B, blocked)).toBe(true)
    expect(canInteract(C, blocked)).toBe(true)
  })

  it('accepts camelCase rows too', () => {
    const blocked = blockedIds([{ blockerId: A, blockedId: B }], A)
    expect(canInteract(B, blocked)).toBe(false)
  })
})

describe('a block we could not read fails closed', () => {
  // Same posture as an unknown age band. An empty feed is recoverable;
  // surfacing someone to the person who blocked them is not.
  it('refuses when the block set is missing', () => {
    for (const bad of [undefined, null, [], {}, 'nope', 0]) {
      expect(canInteract(B, bad)).toBe(false)
    }
  })

  it('returns nobody rather than everybody when the rows are unreadable', () => {
    for (const bad of [undefined, null, 'rows', 42]) {
      expect(blockedIds(bad, A).size).toBe(0)
    }
  })

  it('filters to an empty list when the block set is unusable', () => {
    const people = [{ user_id: B }, { user_id: C }]
    expect(filterBlocked(people, null)).toEqual([])
  })

  it('refuses an id that is not an id', () => {
    const blocked = blockedIds([], A)
    for (const bad of [undefined, null, '', '   ', 0, {}]) {
      expect(canInteract(bad, blocked)).toBe(false)
    }
  })
})

describe('filtering a list of people', () => {
  it('drops the blocked and keeps the rest', () => {
    const blocked = blockedIds([{ blocker_id: A, blocked_id: B }], A)
    const out = filterBlocked([{ user_id: B }, { user_id: C }], blocked)
    expect(out).toEqual([{ user_id: C }])
  })

  it('reads userId and id as well as user_id', () => {
    const blocked = blockedIds([{ blocker_id: A, blocked_id: B }], A)
    expect(filterBlocked([{ userId: B }, { id: C }], blocked)).toEqual([{ id: C }])
  })

  it('survives a list that is not a list', () => {
    expect(filterBlocked(null, new Set())).toEqual([])
  })
})

describe('refusing blocks that make no sense', () => {
  it('refuses to let someone block themselves', () => {
    expect(validateBlock(A, A)).toEqual({ ok: false, reason: 'self_block' })
  })

  it('refuses a missing user on either side', () => {
    expect(validateBlock(A, undefined).ok).toBe(false)
    expect(validateBlock('', B).ok).toBe(false)
    expect(validateBlock('  ', B).reason).toBe('missing_user')
  })

  it('allows an ordinary block', () => {
    expect(validateBlock(A, B)).toEqual({ ok: true })
  })
})

describe('report reasons are a fixed list', () => {
  it('accepts every shipped reason', () => {
    for (const r of REPORT_REASONS) expect(normalizeReason(r)).toBe(r)
  })

  it('is case and whitespace insensitive', () => {
    expect(normalizeReason('  HARASSMENT ')).toBe('harassment')
  })

  it('refuses an unknown reason rather than coercing it to other', () => {
    // Coercing would file a report nobody can act on, and hide a client bug.
    expect(normalizeReason('rude')).toBe(null)
    expect(normalizeReason('')).toBe(null)
    for (const bad of [undefined, null, 42, {}, []]) expect(normalizeReason(bad)).toBe(null)
  })

  it('carries the reasons a human must look at today', () => {
    expect(isUrgent('underage')).toBe(true)
    expect(isUrgent('safety_concern')).toBe(true)
    expect(isUrgent('spam')).toBe(false)
    expect(isUrgent('nonsense')).toBe(false)
  })

  it('still lists underage, which is what the age bands cannot catch', () => {
    // Band separation trusts a self-declared date of birth. This is the only
    // way anyone can tell us that declaration was a lie.
    expect(REPORT_REASONS).toContain('underage')
  })
})

describe('report detail', () => {
  it('trims', () => {
    expect(normalizeDetail('  they kept messaging  ')).toBe('they kept messaging')
  })

  it('caps length rather than refusing', () => {
    const out = normalizeDetail('x'.repeat(MAX_DETAIL_LENGTH + 500))
    expect(out.length).toBe(MAX_DETAIL_LENGTH)
  })

  it('turns anything that is not a string into an empty string', () => {
    for (const bad of [undefined, null, 42, {}, []]) expect(normalizeDetail(bad)).toBe('')
  })
})

describe('validating a report', () => {
  it('accepts a real one and hands back the normalized reason', () => {
    expect(validateReport(A, B, ' Harassment ')).toEqual({ ok: true, normalized: 'harassment' })
  })

  it('refuses self-reports with their own reason', () => {
    expect(validateReport(A, A, 'spam')).toEqual({ ok: false, reason: 'self_report' })
  })

  it('refuses a reason it does not recognise', () => {
    expect(validateReport(A, B, 'vibes')).toEqual({ ok: false, reason: 'bad_reason' })
  })

  it('refuses a missing user before it looks at the reason', () => {
    expect(validateReport(A, '', 'spam')).toEqual({ ok: false, reason: 'missing_user' })
  })
})

describe('somebody filing reports all day is the abuse', () => {
  it('allows a normal number', () => {
    expect(underReportLimit(0)).toBe(true)
    expect(underReportLimit(MAX_REPORTS_PER_DAY - 1)).toBe(true)
  })

  it('stops at the limit', () => {
    expect(underReportLimit(MAX_REPORTS_PER_DAY)).toBe(false)
    expect(underReportLimit(MAX_REPORTS_PER_DAY + 10)).toBe(false)
  })

  it('refuses a count that is not a count', () => {
    for (const bad of [undefined, null, -1, 1.5, '3', {}]) expect(underReportLimit(bad)).toBe(false)
  })
})
