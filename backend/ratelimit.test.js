import { describe, it, expect } from 'vitest'
import {
  createLimiter, checkAiRequest, retryAfterSeconds, clientIp,
  ANON, USER, GLOBAL, BUDGETS,
} from './ratelimit.js'

const T0 = 1_700_000_000_000

describe('counting inside a window', () => {
  it('allows a caller up to their budget', () => {
    const l = createLimiter({ [ANON]: { limit: 3, windowMs: 1000 } })
    expect(l.hit(ANON, 'a', T0).ok).toBe(true)
    expect(l.hit(ANON, 'a', T0).ok).toBe(true)
    expect(l.hit(ANON, 'a', T0).ok).toBe(true)
    expect(l.hit(ANON, 'a', T0).ok).toBe(false)
  })

  it('keeps callers separate', () => {
    const l = createLimiter({ [ANON]: { limit: 1, windowMs: 1000 } })
    l.hit(ANON, 'a', T0)
    // One noisy IP must not spend anyone else's budget.
    expect(l.hit(ANON, 'b', T0).ok).toBe(true)
  })

  it('reopens once the window passes', () => {
    const l = createLimiter({ [ANON]: { limit: 1, windowMs: 1000 } })
    l.hit(ANON, 'a', T0)
    expect(l.hit(ANON, 'a', T0 + 999).ok).toBe(false)
    expect(l.hit(ANON, 'a', T0 + 1000).ok).toBe(true)
  })

  it('reports how long to wait', () => {
    const l = createLimiter({ [ANON]: { limit: 1, windowMs: 5000 } })
    l.hit(ANON, 'a', T0)
    expect(l.hit(ANON, 'a', T0 + 1500).retryAfterMs).toBe(3500)
  })

  it('refuses a kind it has no budget for, rather than allowing it', () => {
    const l = createLimiter({ [ANON]: { limit: 1, windowMs: 1000 } })
    expect(() => l.hit('made-up', 'a', T0)).toThrow(/unknown rate limit kind/)
  })
})

describe('the AI request decision', () => {
  const budgets = {
    [ANON]: { limit: 2, windowMs: 1000 },
    [USER]: { limit: 5, windowMs: 1000 },
    [GLOBAL]: { limit: 100, windowMs: 1000 },
  }

  it('gives a signed-in user the larger budget', () => {
    const l = createLimiter(budgets)
    for (let i = 0; i < 5; i++) {
      expect(checkAiRequest(l, { userId: 'u1', ip: '1.1.1.1' }, T0).ok).toBe(true)
    }
    expect(checkAiRequest(l, { userId: 'u1', ip: '1.1.1.1' }, T0).ok).toBe(false)
  })

  it('holds anonymous callers to the smaller one', () => {
    const l = createLimiter(budgets)
    expect(checkAiRequest(l, { ip: '1.1.1.1' }, T0).ok).toBe(true)
    expect(checkAiRequest(l, { ip: '1.1.1.1' }, T0).ok).toBe(true)
    const third = checkAiRequest(l, { ip: '1.1.1.1' }, T0)
    expect(third.ok).toBe(false)
    expect(third.scope).toBe(ANON)
  })

  it('counts a signed-in user by id, not by address', () => {
    // Otherwise a household or an office behind one NAT shares one budget.
    const l = createLimiter(budgets)
    for (let i = 0; i < 5; i++) checkAiRequest(l, { userId: 'u1', ip: '1.1.1.1' }, T0)
    expect(checkAiRequest(l, { userId: 'u2', ip: '1.1.1.1' }, T0).ok).toBe(true)
  })

  it('stops everyone when the global budget is gone', () => {
    // The per-caller limits only bind per caller. Without this, enough distinct
    // IPs staying just under their own limit still empty the key.
    const l = createLimiter({ ...budgets, [GLOBAL]: { limit: 2, windowMs: 1000 } })
    expect(checkAiRequest(l, { userId: 'u1' }, T0).ok).toBe(true)
    expect(checkAiRequest(l, { userId: 'u2' }, T0).ok).toBe(true)
    const blocked = checkAiRequest(l, { userId: 'u3' }, T0)
    expect(blocked.ok).toBe(false)
    expect(blocked.scope).toBe(GLOBAL)
  })

  it('does not charge the global budget for requests it already rejected', () => {
    // A blocked abuser must not be able to burn everyone else's headroom.
    const l = createLimiter({ ...budgets, [GLOBAL]: { limit: 3, windowMs: 1000 } })
    checkAiRequest(l, { ip: '1.1.1.1' }, T0)   // anon 1, global 1
    checkAiRequest(l, { ip: '1.1.1.1' }, T0)   // anon 2, global 2
    checkAiRequest(l, { ip: '1.1.1.1' }, T0)   // anon over — global untouched
    checkAiRequest(l, { ip: '1.1.1.1' }, T0)   // still untouched
    expect(checkAiRequest(l, { userId: 'u9' }, T0).ok).toBe(true)
  })

  it('falls back to a key when there is neither user nor address', () => {
    const l = createLimiter(budgets)
    expect(checkAiRequest(l, {}, T0).ok).toBe(true)
  })
})

describe('housekeeping', () => {
  it('drops expired windows so the map does not grow forever', () => {
    const l = createLimiter({ [ANON]: { limit: 1, windowMs: 1000 } })
    l.hit(ANON, 'a', T0)
    l.hit(ANON, 'b', T0)
    expect(l.size()).toBe(2)
    expect(l.sweep(T0 + 1000)).toBe(2)
    expect(l.size()).toBe(0)
  })

  it('keeps windows that are still open', () => {
    const l = createLimiter({ [ANON]: { limit: 1, windowMs: 1000 } })
    l.hit(ANON, 'a', T0)
    expect(l.sweep(T0 + 500)).toBe(0)
  })
})

describe('the shipped budgets', () => {
  it('leaves room for a full onboarding without an account', () => {
    // The First Conversation is 13 beats plus one script translation, and it
    // runs before signup. If anonymous cannot finish it, nobody signs up.
    expect(BUDGETS[ANON].limit).toBeGreaterThan(14 * 2)
  })

  it('gives signed-in users more than anonymous ones', () => {
    expect(BUDGETS[USER].limit).toBeGreaterThan(BUDGETS[ANON].limit)
  })
})

describe('reading the caller address', () => {
  it('takes the first entry of the forwarded chain', () => {
    // Railway appends its own hop, so the last entry is the proxy, not the user.
    expect(clientIp({ 'x-forwarded-for': '9.9.9.9, 10.0.0.1' })).toBe('9.9.9.9')
  })

  it('falls back when there is no forwarded header', () => {
    expect(clientIp({}, '7.7.7.7')).toBe('7.7.7.7')
    expect(clientIp({})).toBe('unknown')
  })

  it('ignores an empty forwarded header', () => {
    expect(clientIp({ 'x-forwarded-for': '  ' }, '7.7.7.7')).toBe('7.7.7.7')
  })
})

describe('retryAfterSeconds', () => {
  it('rounds up, and never tells a client to retry immediately', () => {
    expect(retryAfterSeconds(1500)).toBe(2)
    expect(retryAfterSeconds(1)).toBe(1)
    expect(retryAfterSeconds(0)).toBe(1)
  })
})
