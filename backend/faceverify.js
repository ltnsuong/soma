// Deciding whether the person holding the phone is the person in the photo.
//
// The claim a verified badge makes is narrow and worth stating exactly: *a live
// selfie of this person matched their main profile photo*. That is what stops
// the common harm — someone using a stranger's photos — because passing requires
// producing a face that matches the stolen picture, which the thief cannot do.
//
// It is NOT a liveness guarantee. A determined attacker holding a printed photo
// or a phone screen in front of the camera can still defeat it; the random
// gesture below raises that bar but does not close it. Real anti-spoofing needs
// a dedicated liveness SDK (depth, texture, challenge-response video). Do not
// let the badge's copy promise more than the paragraph above.
//
// Pure decision logic: no express, no network, no clock of its own, no image
// handling. The caller passes `now` and the provider's result. This is where the
// thresholds live so they can be argued with in a test rather than in production.

/** Similarity, 0–100, at or above which two faces are the same person. */
export const SIMILARITY_THRESHOLD = 92

/**
 * How long a challenge stays usable. Short on purpose: the gesture only means
 * something if there is no time to go and stage it.
 */
export const CHALLENGE_TTL_MS = 2 * 60 * 1000

/** Biggest selfie we will accept, in bytes of decoded image. */
export const MAX_IMAGE_BYTES = 4 * 1024 * 1024

/**
 * The gesture the user is asked to make. One is drawn at random per attempt, so
 * a photo saved from a previous attempt shows the wrong pose.
 *
 * Every one of these has to be describable in a short line, visible in a
 * head-and-shoulders frame, and doable by someone holding a phone one-handed.
 * Nothing that assumes two working hands or a particular face.
 */
export const GESTURES = [
  'look_left',
  'look_right',
  'look_up',
  'smile',
  'open_mouth',
  'raise_eyebrows',
]

/** Verdicts. `review` is the only safe answer when we genuinely do not know. */
export const VERIFIED = 'verified'
export const REJECTED = 'rejected'
export const RETRY = 'retry'
export const REVIEW = 'review'

/**
 * Pick a gesture. `rand` is injected so a test can pin it; it must behave like
 * Math.random (0 inclusive, 1 exclusive).
 */
export function pickGesture(rand = Math.random) {
  const i = Math.floor(rand() * GESTURES.length)
  // Guard the edge where rand() returns exactly 1, or something silly.
  return GESTURES[Math.min(Math.max(i, 0), GESTURES.length - 1)]
}

/** Has this challenge gone stale? */
export function isChallengeFresh(issuedAt, now, ttlMs = CHALLENGE_TTL_MS) {
  if (typeof issuedAt !== 'number' || !Number.isFinite(issuedAt)) return false
  if (issuedAt > now) return false        // clock skew or a forged timestamp
  return now - issuedAt < ttlMs
}

/**
 * Pull the bytes out of a data URL.
 *
 * Returns `{ ok: false, reason }` rather than throwing: this runs on a request
 * carrying user-supplied input, and every rejection here needs a reason the
 * client can turn into a sentence.
 */
export function readImage(dataUrl, maxBytes = MAX_IMAGE_BYTES) {
  if (typeof dataUrl !== 'string' || !dataUrl) return { ok: false, reason: 'no_image' }
  const m = dataUrl.match(/^data:image\/(jpeg|jpg|png);base64,([A-Za-z0-9+/=]+)$/)
  if (!m) return { ok: false, reason: 'bad_image' }
  const base64 = m[2]
  // 4 base64 chars encode 3 bytes; padding trims up to 2. Computed rather than
  // decoded so an oversized payload is refused before it costs any memory.
  const padding = base64.endsWith('==') ? 2 : base64.endsWith('=') ? 1 : 0
  const bytes = Math.floor((base64.length * 3) / 4) - padding
  if (bytes <= 0) return { ok: false, reason: 'bad_image' }
  if (bytes > maxBytes) return { ok: false, reason: 'image_too_large' }
  return { ok: true, base64, bytes, mime: `image/${m[1] === 'jpg' ? 'jpeg' : m[1]}` }
}

/**
 * Anything wrong with *how many* faces are in the two pictures, or null.
 *
 * The reference is the user's own main photo: a landscape or a group shot
 * cannot be compared against, and that is a fixable mistake about which picture
 * is first — not a failed verification, and not their face's fault.
 */
function faceCountProblem({ referenceFaces, selfieFaces }) {
  if (referenceFaces === 0) return 'no_reference_face'
  if (referenceFaces > 1) return 'many_reference_faces'
  if (selfieFaces === 0) return 'no_face'
  if (selfieFaces > 1) return 'many_faces'
  return null
}

/**
 * Turn a face-comparison result into a verdict.
 *
 * `match` is what the provider adapter returned:
 *   { ok: true,  similarity, selfieFaces, referenceFaces }
 *   { ok: false, reason }                       — provider could not answer
 *
 * The rule that matters most: an answer we could not obtain is never a pass.
 * Any unknown — provider down, no credentials, an error we did not anticipate —
 * lands on `review`, which leaves the badge off until a person says otherwise.
 */
export function decideVerification({
  match,
  challengeIssuedAt,
  now = Date.now(),
  threshold = SIMILARITY_THRESHOLD,
  ttlMs = CHALLENGE_TTL_MS,
} = {}) {
  if (!isChallengeFresh(challengeIssuedAt, now, ttlMs)) {
    return { verdict: RETRY, reason: 'challenge_expired' }
  }

  if (!match || match.ok !== true) {
    const reason = (match && match.reason) || 'provider_unavailable'
    // Things the user can fix are a retry; everything else is ours to look at.
    const userFixable = ['no_image', 'bad_image', 'image_too_large']
    return userFixable.includes(reason)
      ? { verdict: RETRY, reason }
      : { verdict: REVIEW, reason }
  }

  const counted = faceCountProblem(match)
  if (counted) return { verdict: RETRY, reason: counted }

  // Deliberately not Number(): Number(null) is 0, which is finite, and would
  // read a missing score as a confident mismatch — telling someone they failed
  // when we never got an answer.
  const similarity = match.similarity
  if (typeof similarity !== 'number' || !Number.isFinite(similarity)) {
    return { verdict: REVIEW, reason: 'no_similarity' }
  }

  return similarity >= threshold
    ? { verdict: VERIFIED, reason: 'match', similarity }
    : { verdict: REJECTED, reason: 'low_similarity', similarity }
}

/** Does this verdict earn the badge? One place, so nothing else has to guess. */
export const grantsBadge = (verdict) => verdict === VERIFIED
