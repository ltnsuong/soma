import { describe, it, expect } from 'vitest'
import {
  pickNudge, driftingPerson, emptyDomains, isQuiet, localHour,
  DOMAINS, MAX_PER_WEEK, DRIFT_DAYS, AWAY_DAYS, NUDGE_VOICE,
} from './nudges.js'

const NOW = Date.parse('2026-09-20T14:00:00Z')   // 14:00 UTC, comfortably awake
const daysAgo = (n, from = NOW) => new Date(from - n * 86400000).toISOString()

const memories = (n = 5) =>
  Array.from({ length: n }, (_, i) => ({ domain: DOMAINS[i % DOMAINS.length], content: `thing ${i}` }))

const state = (over = {}) => ({
  profile: { memories: memories(), circle: [] },
  lastNudgeAt: daysAgo(10),
  sentThisWeek: 0,
  lastActiveAt: daysAgo(2),
  tzOffsetMinutes: 0,
  hasPushToken: true,
  ...over,
})

describe('staying quiet', () => {
  it('says nothing when there is nothing to say', () => {
    // Every domain covered, nobody drifting, active recently.
    const all = DOMAINS.map(d => ({ domain: d, content: 'x' }))
    expect(pickNudge(state({ profile: { memories: all, circle: [] } }), NOW)).toBeNull()
  })

  it('never messages someone it barely knows', () => {
    // Two memories is not enough to say anything that is not filler.
    expect(pickNudge(state({ profile: { memories: memories(2), circle: [] } }), NOW)).toBeNull()
  })

  it('does not message someone who opened the app today', () => {
    expect(pickNudge(state({ lastActiveAt: daysAgo(0.2) }), NOW)).toBeNull()
  })

  it('respects the weekly ceiling', () => {
    expect(pickNudge(state({ sentThisWeek: MAX_PER_WEEK }), NOW)).toBeNull()
  })

  it('does not message twice in two days', () => {
    expect(pickNudge(state({ lastNudgeAt: daysAgo(1) }), NOW)).toBeNull()
  })

  it('stays silent with no push token', () => {
    expect(pickNudge(state({ hasPushToken: false }), NOW)).toBeNull()
  })

  it('never sends at night, wherever they are', () => {
    // 14:00 UTC is 02:00 in UTC+12. JS reports that offset as -720.
    expect(pickNudge(state({ tzOffsetMinutes: -720 }), NOW)).toBeNull()
  })
})

describe('quiet hours', () => {
  it('converts to local time using the JS offset sign', () => {
    expect(localHour(NOW, 0)).toBe(14)
    expect(localHour(NOW, -120)).toBe(16)   // UTC+2
    expect(localHour(NOW, 300)).toBe(9)     // UTC-5
  })

  it('covers night on both sides of midnight', () => {
    const at = h => Date.parse(`2026-09-20T${String(h).padStart(2, '0')}:00:00Z`)
    expect(isQuiet(at(22))).toBe(true)
    expect(isQuiet(at(3))).toBe(true)
    expect(isQuiet(at(9))).toBe(false)
    expect(isQuiet(at(20))).toBe(false)
  })
})

describe('what it decides to say', () => {
  it('raises a drifting person before anything else', () => {
    const n = pickNudge(state({
      profile: {
        memories: memories(10),           // every domain covered
        circle: [{ name: 'Ana', relationship: 'sister', lastSeen: daysAgo(40) }],
      },
    }), NOW)
    expect(n.kind).toBe('reconnect')
    expect(n.person).toBe('Ana')
    expect(n.brief).toContain('Ana')
  })

  it('picks the most neglected person, not the first', () => {
    const circle = [
      { name: 'Rui', lastSeen: daysAgo(20) },
      { name: 'Ana', lastSeen: daysAgo(90) },
    ]
    expect(driftingPerson(circle, NOW).name).toBe('Ana')
  })

  it('leaves recently-contacted people alone', () => {
    expect(driftingPerson([{ name: 'Rui', lastSeen: daysAgo(DRIFT_DAYS - 1) }], NOW)).toBeNull()
  })

  it('reads the latest interaction rather than lastSeen when it has one', () => {
    const p = [{ name: 'Rui', lastSeen: daysAgo(90), interactions: [{ date: daysAgo(1) }] }]
    expect(driftingPerson(p, NOW)).toBeNull()
  })

  it('asks about a life area they have never mentioned', () => {
    const only = [{ domain: 'health', content: 'runs' }, { domain: 'health', content: 'sleeps badly' }, { domain: 'career', content: 'nurse' }]
    const n = pickNudge(state({ profile: { memories: only, circle: [] } }), NOW)
    expect(n.kind).toBe('gap')
    expect(DOMAINS).toContain(n.domain)
    expect(['health', 'career']).not.toContain(n.domain)
  })

  it('falls back to a return nudge only when nothing better exists', () => {
    const all = DOMAINS.map(d => ({ domain: d, content: 'x' }))
    const n = pickNudge(state({
      profile: { memories: all, circle: [] },
      lastActiveAt: daysAgo(AWAY_DAYS + 3),
    }), NOW)
    expect(n.kind).toBe('return')
    expect(n.brief).toContain('days')
  })

  it('quotes their own words back when returning', () => {
    const all = [{ domain: 'health', content: 'Training for a marathon' }, ...DOMAINS.map(d => ({ domain: d, content: 'x' }))]
    const n = pickNudge(state({ profile: { memories: all, circle: [] }, lastActiveAt: daysAgo(9) }), NOW)
    expect(n.brief).toContain('Training for a marathon')
  })
})

describe('emptyDomains', () => {
  it('lists only what is missing', () => {
    expect(emptyDomains([{ domain: 'health' }])).not.toContain('health')
    expect(emptyDomains([{ domain: 'health' }])).toContain('finance')
  })

  it('returns nothing when every area is covered', () => {
    expect(emptyDomains(DOMAINS.map(d => ({ domain: d })))).toEqual([])
  })
})

describe('the voice brief', () => {
  it('forbids the things that make a notification feel automated', () => {
    for (const banned of ['just checking in', 'therapy-speak', 'being an AI']) {
      expect(NUDGE_VOICE).toContain(banned)
    }
  })

  it('keeps it to notification length', () => {
    expect(NUDGE_VOICE).toContain('120 characters')
  })
})
