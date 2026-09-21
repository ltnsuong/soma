// Who is allowed to spend the Groq key, and how fast.
//
// /ai/chat and /ai/transcribe were open: no auth, no limit. Every AI action in
// SOMA funnels through one shared GROQ_API_KEY, so a single script pointed at
// those routes drains the quota for every real user at once — and the app shows
// no error when that happens, it just goes quiet.
//
// Pure decision logic: no express, no clock of its own, no network. The caller
// passes `now`. Counting lives here so it can be tested; the 429 lives in
// server.js.
//
// The store is an in-memory Map, which is honest about today's deployment: one
// Railway instance, one process. A second instance would give each its own
// counts and double the real limit. Move this to the database before scaling
// horizontally — the same note applies to tgLoginTokens in server.js.

/** A signed-in user is a known person; an anonymous caller is an IP we hope is one. */
export const ANON = 'anon'
export const USER = 'user'
export const GLOBAL = 'global'

// Windows are in milliseconds; budgets are requests per window.
//
// Anonymous has to stay usable: the First Conversation runs during onboarding,
// before an account exists, and that is 13 beats plus a script translation. 40
// an hour covers a full onboarding twice over and still stops a scraper cold.
//
// The global budget is the backstop. It exists because the per-caller limits
// only bind per caller — a hundred IPs staying under 40 each would still empty
// the key. Set it near the provider's own ceiling, not near expected usage.
export const BUDGETS = {
  [ANON]: { limit: 40, windowMs: 60 * 60 * 1000 },
  [USER]: { limit: 240, windowMs: 60 * 60 * 1000 },
  [GLOBAL]: { limit: 1200, windowMs: 60 * 1000 },
}

/**
 * Fixed-window counters. A sliding window would be fairer at the boundary, but
 * this is a spend guard, not a fairness guarantee, and the failure mode of a
 * fixed window (briefly allowing 2x at a window edge) is well under the margin
 * the global budget leaves.
 */
export function createLimiter(budgets = BUDGETS) {
  const windows = new Map()

  /** Count one request against `key`. Returns whether it may proceed. */
  function hit(kind, id, now) {
    const budget = budgets[kind]
    if (!budget) throw new Error(`unknown rate limit kind: ${kind}`)
    const key = `${kind}:${id}`
    const w = windows.get(key)

    if (!w || now >= w.resetAt) {
      windows.set(key, { count: 1, resetAt: now + budget.windowMs })
      return { ok: true, remaining: budget.limit - 1, retryAfterMs: 0 }
    }
    if (w.count >= budget.limit) {
      return { ok: false, remaining: 0, retryAfterMs: w.resetAt - now }
    }
    w.count++
    return { ok: true, remaining: budget.limit - w.count, retryAfterMs: 0 }
  }

  /** Drop windows that have expired, so the Map does not grow without bound. */
  function sweep(now) {
    let dropped = 0
    for (const [key, w] of windows) {
      if (now >= w.resetAt) { windows.delete(key); dropped++ }
    }
    return dropped
  }

  return { hit, sweep, size: () => windows.size }
}

/**
 * Decide on one AI request.
 *
 * The global budget is checked FIRST and counted only when the caller would
 * otherwise be allowed — charging it for requests we are already rejecting
 * would let a single blocked abuser exhaust everyone else's headroom.
 */
export function checkAiRequest(limiter, { userId, ip }, now = Date.now()) {
  const kind = userId ? USER : ANON
  const id = userId || ip || 'unknown'

  const caller = limiter.hit(kind, id, now)
  if (!caller.ok) {
    return { ok: false, scope: kind, retryAfterMs: caller.retryAfterMs }
  }

  const global = limiter.hit(GLOBAL, 'all', now)
  if (!global.ok) {
    return { ok: false, scope: GLOBAL, retryAfterMs: global.retryAfterMs }
  }

  return { ok: true, scope: kind, remaining: caller.remaining }
}

/** Seconds, rounded up — what a Retry-After header wants. */
export const retryAfterSeconds = (ms) => Math.max(1, Math.ceil(ms / 1000))

/**
 * The caller's address behind Railway's proxy. `req.ip` is the proxy unless
 * express is told to trust it, so read the forwarded chain's first entry.
 * Spoofable by design — which is why the global budget exists.
 */
export function clientIp(headers = {}, fallback = '') {
  const fwd = headers['x-forwarded-for']
  if (typeof fwd === 'string' && fwd.trim()) return fwd.split(',')[0].trim()
  return fallback || 'unknown'
}
