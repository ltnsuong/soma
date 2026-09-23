// When to try the model again, and when to give up.
//
// Groq's on-demand tier caps OUTPUT tokens per minute for the whole
// organisation — 1000 at the time of writing. One Synergy Scan asks for 600 for
// the agent conversation and 600 more for the report, back to back, so a single
// scan can exceed it by itself; with two people scanning at once it always
// does. The client's reaction was invisible: App.tsx pre-seeds five hardcoded
// conversation turns and only replaces them if the model returns parseable
// JSON, so a refused call silently became canned text and the product's
// headline feature looked like a template.
//
// Groq's refusal says exactly how long to wait ("Please try again in 7.68s"),
// which is enough to just... wait. That is what this module decides.
//
// Two things it deliberately will not do:
//
//   Retry what cannot succeed. A 400 is a malformed request; trying again
//   produces the same 400 a second later and doubles the latency.
//
//   Wait without a bound. OTPM resets over a minute, so an over-budget moment
//   can ask for a 45-second wait. Nobody is holding a phone for that. Past the
//   cap we fail fast and let the caller degrade, which is the honest outcome.
//
// Pure decision logic: no network, no timers, no clock of its own.

/** Attempts in total, including the first. Two retries is enough for a blip. */
export const MAX_ATTEMPTS = 3

/**
 * Longest we will ever sleep for one retry.
 *
 * Calibrated against what Groq actually asks for, not a round number: the two
 * refusals observed in production wanted 7.68s and 9.12s, so a cap of 8s
 * rejected the second one and failed fast for the sake of 1.12 seconds. OTPM
 * frees up over a rolling minute, so asks cluster in this range whenever the
 * budget is only slightly over.
 */
export const MAX_SLEEP_MS = 10000

/**
 * Longest we will spend sleeping across all retries of one request.
 *
 * One 10s retry fits; two do not, which is deliberate. If the first wait did
 * not clear the window, the organisation is over budget rather than briefly
 * unlucky, and a second long wait only moves the failure later.
 */
export const MAX_TOTAL_SLEEP_MS = 12000

/** Used when the provider says to back off but not how long. */
export const DEFAULT_SLEEP_MS = 1200

/**
 * Is this status worth trying again?
 *
 * 429 is the rate limit this exists for. 5xx covers the provider briefly
 * falling over. Everything else — 400, 401, 404 — is a request that will fail
 * identically next time.
 */
export function isRetryableStatus(status) {
  return status === 429 || (status >= 500 && status < 600)
}

/**
 * How long Groq asked us to wait, in ms, or null if it did not say.
 *
 * Reads the `retry-after` header first (seconds, per RFC 9110) and falls back
 * to the sentence in the error body, which is where Groq actually puts the
 * useful number: "Please try again in 7.68s".
 */
export function providerDelayMs(headers = {}, body = '') {
  const fromHeader = headerDelayMs(headers)
  return fromHeader ?? sentenceDelayMs(body)
}

/** `retry-after`, in seconds per RFC 9110, or null. */
function headerDelayMs(headers) {
  const raw = headers['retry-after'] ?? headers['Retry-After']
  if (raw == null) return null
  const secs = Number(String(raw).trim())
  // A negative or unparseable value is not a delay; fall through to the body.
  return Number.isFinite(secs) && secs >= 0 ? Math.round(secs * 1000) : null
}

/** The number in "Please try again in 7.68s", which is where Groq puts it. */
function sentenceDelayMs(body) {
  const text = typeof body === 'string' ? body : JSON.stringify(body ?? '')
  // Milliseconds first: "350ms" also matches the seconds pattern otherwise.
  for (const [re, scale] of [[/try again in\s*([\d.]+)\s*ms/i, 1], [/try again in\s*([\d.]+)\s*s/i, 1000]]) {
    const m = text.match(re)
    if (!m) continue
    const n = Number(m[1])
    if (Number.isFinite(n)) return Math.round(n * scale)
  }
  return null
}

/** What planRetry assumes when the caller does not say. */
const PLAN_DEFAULTS = {
  status: 0,
  headers: {},
  body: '',
  attempt: 1,
  sleptMs: 0,
  maxAttempts: MAX_ATTEMPTS,
  maxSleepMs: MAX_SLEEP_MS,
  maxTotalSleepMs: MAX_TOTAL_SLEEP_MS,
}

/** Why we would not retry at all, before any delay is worked out. */
function refusalReason(status, attempt, maxAttempts) {
  if (!isRetryableStatus(status)) return 'not_retryable'
  if (attempt >= maxAttempts) return 'out_of_attempts'
  return null
}

/**
 * Decide what to do after one failed attempt.
 *
 * `attempt` is 1-based and counts the try that just failed.
 *
 * Returns { retry: false } to give up, or { retry: true, sleepMs } to wait
 * that long and try again. Giving up is not an error path — the caller returns
 * the provider's own status and message, exactly as it does today.
 */
export function planRetry(opts = {}) {
  // Merged rather than destructured with defaults: eight parameter defaults is
  // eight branches, and the caps are configuration, not arguments anyone passes.
  const { status, headers, body, attempt, sleptMs, maxAttempts, maxSleepMs, maxTotalSleepMs } =
    { ...PLAN_DEFAULTS, ...opts }

  const blocked = refusalReason(status, attempt, maxAttempts)
  if (blocked) return { retry: false, reason: blocked }

  const asked = providerDelayMs(headers, body)
  const sleepMs = asked ?? DEFAULT_SLEEP_MS

  // A wait longer than a person will hold for is not worth having. Fail now and
  // let the caller degrade rather than freezing the screen and degrading anyway.
  if (sleepMs > maxSleepMs) return { retry: false, reason: 'wait_too_long', wantedMs: sleepMs }
  if (sleptMs + sleepMs > maxTotalSleepMs) return { retry: false, reason: 'budget_spent' }

  return { retry: true, sleepMs, reason: asked == null ? 'default_backoff' : 'provider_asked' }
}
