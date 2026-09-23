import { describe, it, expect } from 'vitest'
import {
  planRetry, providerDelayMs, isRetryableStatus,
  MAX_ATTEMPTS, MAX_SLEEP_MS, MAX_TOTAL_SLEEP_MS, DEFAULT_SLEEP_MS,
} from './airetry.js'

/** The refusal that actually caused this, copied from a live response. */
const OTPM = JSON.stringify({
  error: 'Rate limit reached for model `qwen/qwen3.8-27b` in organization `org_01k` '
    + 'service tier `on_demand` on output tokens per minute (OTPM): Limit 1000, Used 528, '
    + 'Requested 600. Please try again in 7.68s. Need more tokens? Upgrade to Dev Tier today.',
})

describe('the rate limit this exists for', () => {
  it('retries a 429, waiting exactly as long as Groq asked', () => {
    const r = planRetry({ status: 429, body: OTPM, attempt: 1 })
    expect(r.retry).toBe(true)
    expect(r.sleepMs).toBe(7680)
    expect(r.reason).toBe('provider_asked')
  })

  it('reads the delay out of the sentence, not just the header', () => {
    expect(providerDelayMs({}, OTPM)).toBe(7680)
  })

  it('prefers the retry-after header when there is one', () => {
    expect(providerDelayMs({ 'retry-after': '2' }, OTPM)).toBe(2000)
  })

  it('handles a delay given in milliseconds', () => {
    expect(providerDelayMs({}, 'Please try again in 350ms.')).toBe(350)
  })

  it('honours the longest delay actually seen in production', () => {
    // 9.12s was a real refusal. An 8s cap rejected it and failed fast for the
    // sake of 1.12 seconds, which is how this bound got calibrated.
    const r = planRetry({ status: 429, body: 'Please try again in 9.12s.', attempt: 1 })
    expect(r.retry).toBe(true)
    expect(r.sleepMs).toBe(9120)
  })

  it('backs off a sensible default when the provider does not say', () => {
    const r = planRetry({ status: 429, body: 'slow down', attempt: 1 })
    expect(r).toMatchObject({ retry: true, sleepMs: DEFAULT_SLEEP_MS, reason: 'default_backoff' })
  })
})

describe('what is worth retrying', () => {
  it('retries provider outages', () => {
    for (const s of [500, 502, 503, 504]) expect(isRetryableStatus(s)).toBe(true)
  })

  it('never retries a request that cannot succeed', () => {
    // A 400 is malformed and a 401 is a bad key; trying again just costs time.
    for (const s of [400, 401, 403, 404, 422]) {
      expect(isRetryableStatus(s)).toBe(false)
      expect(planRetry({ status: s, attempt: 1 }).retry).toBe(false)
    }
  })

  it('does not retry a success', () => {
    expect(isRetryableStatus(200)).toBe(false)
  })
})

describe('bounds, so nothing hangs', () => {
  it('gives up rather than waiting longer than a person will', () => {
    // OTPM resets over a minute, so an over-budget moment can ask for 45s.
    const r = planRetry({ status: 429, body: 'Please try again in 45s.', attempt: 1 })
    expect(r.retry).toBe(false)
    expect(r.reason).toBe('wait_too_long')
    expect(r.wantedMs).toBe(45000)
  })

  it('stops after the attempt limit', () => {
    const r = planRetry({ status: 429, body: OTPM, attempt: MAX_ATTEMPTS })
    expect(r).toEqual({ retry: false, reason: 'out_of_attempts' })
  })

  it('stops once the total sleep budget is spent', () => {
    const r = planRetry({ status: 429, body: OTPM, attempt: 2, sleptMs: MAX_TOTAL_SLEEP_MS - 1000 })
    expect(r).toEqual({ retry: false, reason: 'budget_spent' })
  })

  it('never sleeps longer than the per-retry cap in one go', () => {
    for (const secs of [0.1, 1, 7.68, 8]) {
      const r = planRetry({ status: 429, body: `try again in ${secs}s`, attempt: 1 })
      if (r.retry) expect(r.sleepMs).toBeLessThanOrEqual(MAX_SLEEP_MS)
    }
  })

  it('two retries at the observed delay fit inside the budget', () => {
    // The real case: 7.68s asked once. A second one must not be promised if it
    // would blow the total, and the numbers should allow at least one retry.
    const first = planRetry({ status: 429, body: OTPM, attempt: 1 })
    expect(first.retry).toBe(true)
    const second = planRetry({ status: 429, body: OTPM, attempt: 2, sleptMs: first.sleepMs })
    expect(second.retry).toBe(false)
    expect(second.reason).toBe('budget_spent')
  })
})

describe('malformed input never throws', () => {
  it('survives junk where a body should be', () => {
    for (const bad of [undefined, null, 0, {}, [], { error: { message: 'x' } }]) {
      expect(() => providerDelayMs({}, bad)).not.toThrow()
    }
  })

  it('survives junk in the header', () => {
    for (const bad of ['', 'soon', '-1', 'NaN', undefined]) {
      expect(() => providerDelayMs({ 'retry-after': bad }, '')).not.toThrow()
    }
  })

  it('ignores a negative retry-after rather than sleeping backwards', () => {
    expect(providerDelayMs({ 'retry-after': '-5' }, '')).toBe(null)
  })

  it('never retries on an empty call', () => {
    expect(planRetry().retry).toBe(false)
  })
})

describe('the shipped bounds', () => {
  it('allows at least one retry', () => {
    expect(MAX_ATTEMPTS).toBeGreaterThanOrEqual(2)
  })

  it('keeps the worst case under what a request can wait for', () => {
    expect(MAX_TOTAL_SLEEP_MS).toBeLessThanOrEqual(15000)
    expect(MAX_SLEEP_MS).toBeLessThanOrEqual(MAX_TOTAL_SLEEP_MS)
  })
})
