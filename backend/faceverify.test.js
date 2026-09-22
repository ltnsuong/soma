import { describe, it, expect } from 'vitest'
import {
  decideVerification, pickGesture, isChallengeFresh, readImage, grantsBadge,
  GESTURES, SIMILARITY_THRESHOLD, CHALLENGE_TTL_MS, MAX_IMAGE_BYTES,
  VERIFIED, REJECTED, RETRY, REVIEW,
} from './faceverify.js'

const NOW = 1_700_000_000_000
const fresh = NOW - 1000

/** A provider answer that passes, unless a test says otherwise. */
const match = (over = {}) => ({
  ok: true, similarity: 97, selfieFaces: 1, referenceFaces: 1, ...over,
})

describe('the badge is earned', () => {
  it('passes a confident match', () => {
    const r = decideVerification({ match: match(), challengeIssuedAt: fresh, now: NOW })
    expect(r.verdict).toBe(VERIFIED)
    expect(grantsBadge(r.verdict)).toBe(true)
  })

  it('passes exactly at the threshold', () => {
    const r = decideVerification({
      match: match({ similarity: SIMILARITY_THRESHOLD }), challengeIssuedAt: fresh, now: NOW,
    })
    expect(r.verdict).toBe(VERIFIED)
  })

  it('rejects just below it', () => {
    const r = decideVerification({
      match: match({ similarity: SIMILARITY_THRESHOLD - 0.1 }), challengeIssuedAt: fresh, now: NOW,
    })
    expect(r.verdict).toBe(REJECTED)
    expect(r.reason).toBe('low_similarity')
  })

  it('rejects a different person outright', () => {
    const r = decideVerification({ match: match({ similarity: 12 }), challengeIssuedAt: fresh, now: NOW })
    expect(r.verdict).toBe(REJECTED)
  })
})

describe('an answer we do not have is never a pass', () => {
  // The whole point of this module. If any of these ever returns `verified`,
  // an outage becomes a way to mint verified accounts.
  it('sends a provider outage to review', () => {
    const r = decideVerification({
      match: { ok: false, reason: 'provider_unavailable' }, challengeIssuedAt: fresh, now: NOW,
    })
    expect(r.verdict).toBe(REVIEW)
    expect(grantsBadge(r.verdict)).toBe(false)
  })

  it('sends an unconfigured provider to review', () => {
    const r = decideVerification({
      match: { ok: false, reason: 'not_configured' }, challengeIssuedAt: fresh, now: NOW,
    })
    expect(r.verdict).toBe(REVIEW)
  })

  it('sends an unrecognised failure to review rather than guessing', () => {
    const r = decideVerification({
      match: { ok: false, reason: 'something_new_from_the_vendor' }, challengeIssuedAt: fresh, now: NOW,
    })
    expect(r.verdict).toBe(REVIEW)
  })

  it('treats a missing match object as unknown, not as a pass', () => {
    for (const bad of [undefined, null, {}, { ok: 'yes' }, { ok: 1 }]) {
      expect(decideVerification({ match: bad, challengeIssuedAt: fresh, now: NOW }).verdict)
        .not.toBe(VERIFIED)
    }
  })

  it('reviews a result that carries no similarity number', () => {
    for (const s of [undefined, null, 'high', NaN]) {
      const r = decideVerification({ match: match({ similarity: s }), challengeIssuedAt: fresh, now: NOW })
      expect(r.verdict).toBe(REVIEW)
      expect(r.reason).toBe('no_similarity')
    }
  })

  it('never passes on an empty call', () => {
    expect(decideVerification().verdict).not.toBe(VERIFIED)
  })
})

describe('what the user can fix themselves', () => {
  it('asks again when the selfie has no face', () => {
    const r = decideVerification({ match: match({ selfieFaces: 0 }), challengeIssuedAt: fresh, now: NOW })
    expect(r).toEqual({ verdict: RETRY, reason: 'no_face' })
  })

  it('asks again when someone else is in frame', () => {
    // Otherwise a friend standing behind you could be the one who matches.
    const r = decideVerification({ match: match({ selfieFaces: 2 }), challengeIssuedAt: fresh, now: NOW })
    expect(r).toEqual({ verdict: RETRY, reason: 'many_faces' })
  })

  it('asks again when the main photo shows no face', () => {
    // A landscape or a back-of-the-head shot cannot be a reference. This is a
    // fixable mistake about which photo is first, not a failed verification.
    const r = decideVerification({ match: match({ referenceFaces: 0 }), challengeIssuedAt: fresh, now: NOW })
    expect(r).toEqual({ verdict: RETRY, reason: 'no_reference_face' })
  })

  it('asks again when the main photo is a group shot', () => {
    const r = decideVerification({ match: match({ referenceFaces: 3 }), challengeIssuedAt: fresh, now: NOW })
    expect(r).toEqual({ verdict: RETRY, reason: 'many_reference_faces' })
  })

  it('checks the photo itself before blaming the provider', () => {
    for (const reason of ['no_image', 'bad_image', 'image_too_large']) {
      expect(decideVerification({ match: { ok: false, reason }, challengeIssuedAt: fresh, now: NOW }))
        .toEqual({ verdict: RETRY, reason })
    }
  })
})

describe('the challenge expires', () => {
  it('refuses a stale challenge before anything else', () => {
    // Even a perfect match: the gesture only means something while it is fresh.
    const r = decideVerification({
      match: match(), challengeIssuedAt: NOW - CHALLENGE_TTL_MS - 1, now: NOW,
    })
    expect(r).toEqual({ verdict: RETRY, reason: 'challenge_expired' })
  })

  it('accepts one issued a moment ago', () => {
    expect(isChallengeFresh(NOW - 1, NOW)).toBe(true)
  })

  it('refuses one with no timestamp at all', () => {
    for (const bad of [undefined, null, '123', NaN, Infinity]) {
      expect(isChallengeFresh(bad, NOW)).toBe(false)
    }
  })

  it('refuses a timestamp from the future', () => {
    // A client that sets its own clock forward must not get a longer window.
    expect(isChallengeFresh(NOW + 1000, NOW)).toBe(false)
  })

  it('treats the exact TTL boundary as expired', () => {
    expect(isChallengeFresh(NOW - CHALLENGE_TTL_MS, NOW)).toBe(false)
  })
})

describe('the gesture', () => {
  it('only ever returns one from the list', () => {
    for (const r of [0, 0.5, 0.999999]) expect(GESTURES).toContain(pickGesture(() => r))
  })

  it('stays in range if rand misbehaves', () => {
    for (const r of [1, 1.5, -0.2]) expect(GESTURES).toContain(pickGesture(() => r))
  })

  it('can produce every gesture', () => {
    const seen = new Set()
    for (let i = 0; i < GESTURES.length; i++) seen.add(pickGesture(() => i / GESTURES.length))
    expect(seen.size).toBe(GESTURES.length)
  })
})

describe('reading the image', () => {
  const b64 = (bytes) => Buffer.alloc(bytes).toString('base64')

  it('accepts a jpeg data url', () => {
    const r = readImage(`data:image/jpeg;base64,${b64(900)}`)
    expect(r.ok).toBe(true)
    expect(r.mime).toBe('image/jpeg')
  })

  it('normalises jpg to jpeg', () => {
    expect(readImage(`data:image/jpg;base64,${b64(90)}`).mime).toBe('image/jpeg')
  })

  it('accepts png', () => {
    expect(readImage(`data:image/png;base64,${b64(90)}`).mime).toBe('image/png')
  })

  it('measures size without decoding', () => {
    expect(readImage(`data:image/jpeg;base64,${b64(3000)}`).bytes).toBe(3000)
  })

  it('refuses an image over the cap', () => {
    const r = readImage(`data:image/jpeg;base64,${b64(MAX_IMAGE_BYTES + 1)}`)
    expect(r).toEqual({ ok: false, reason: 'image_too_large' })
  })

  it('refuses anything that is not an image data url', () => {
    // Including an svg, which can carry script.
    for (const bad of [
      'https://example.com/me.jpg',
      'data:text/html;base64,PHNjcmlwdD4=',
      'data:image/svg+xml;base64,PHN2Zz48L3N2Zz4=',
      'data:image/gif;base64,R0lGOD',
      'data:image/jpeg;base64,not base64!',
    ]) {
      expect(readImage(bad).ok).toBe(false)
    }
  })

  it('refuses nothing at all', () => {
    for (const bad of [undefined, null, '', 0, {}]) {
      expect(readImage(bad)).toEqual({ ok: false, reason: 'no_image' })
    }
  })

  it('refuses an empty payload', () => {
    expect(readImage('data:image/jpeg;base64,')).toEqual({ ok: false, reason: 'bad_image' })
  })
})
