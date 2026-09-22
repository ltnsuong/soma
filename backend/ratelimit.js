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
/** Face verification attempts, which cost money per call and prove identity. */
export const FACE = 'face'

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
  // Verification is a handful of attempts, not an activity. Someone holding up
  // photos of different people until one passes is exactly the attack the badge
  // exists to stop, and each attempt bills us for two provider calls. Six an
  // hour is enough to recover from bad light, a group photo, and a stale
  // challenge in a row, and still leaves brute force pointless.
  [FACE]: { limit: 6, windowMs: 60 * 60 * 1000 },
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

/**
 * Decide on one face-verification attempt.
 *
 * Always per-user: the route requires auth, so there is no anonymous case, and
 * an IP-keyed limit would punish everyone behind one office NAT. No global
 * budget either — the per-user limit already bounds total spend at a level a
 * shared AI key does not.
 */
export function checkFaceAttempt(limiter, userId, now = Date.now()) {
  if (!userId) return { ok: false, scope: FACE, retryAfterMs: 0 }
  const r = limiter.hit(FACE, userId, now)
  return r.ok
    ? { ok: true, scope: FACE, remaining: r.remaining }
    : { ok: false, scope: FACE, retryAfterMs: r.retryAfterMs }
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
