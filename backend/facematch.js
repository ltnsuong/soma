// The one place that talks to a face-comparison provider.
//
// Kept apart from faceverify.js on purpose: the thresholds and the verdict are
// ours and belong in tests, while this file is a vendor adapter and is allowed
// to be dull. Swapping AWS Rekognition for another provider should mean editing
// only `compareFaces` below.
//
// Two rules this file must keep:
//
//   1. It never throws. A rejected promise here would become a 500 and tell the
//      user nothing. Every path returns { ok: false, reason }.
//   2. It never returns ok:true unless a provider actually answered. An outage
//      must not be indistinguishable from a match — decideVerification turns any
//      ok:false into `review`, which leaves the badge off.
//
// Configuration (Railway env):
//   AWS_REGION, AWS_ACCESS_KEY_ID, AWS_SECRET_ACCESS_KEY
// Absent, this reports `not_configured` and every attempt goes to manual review.

/** Rekognition's own floor for returning a match at all. */
const PROVIDER_MIN_SIMILARITY = 1

let clientPromise

/**
 * Load the AWS SDK lazily, once.
 *
 * Dynamic so the server boots — and every other route keeps working — on a
 * deployment where the dependency or the credentials are absent.
 */
async function getClient() {
  if (!process.env.AWS_ACCESS_KEY_ID || !process.env.AWS_SECRET_ACCESS_KEY) return null
  if (!clientPromise) {
    clientPromise = import('@aws-sdk/client-rekognition')
      .then(({ RekognitionClient, CompareFacesCommand, DetectFacesCommand }) => ({
        client: new RekognitionClient({ region: process.env.AWS_REGION || 'eu-west-1' }),
        CompareFacesCommand, DetectFacesCommand,
      }))
      .catch(() => null)
  }
  return clientPromise
}

/** True when a provider is actually reachable, for /verify/face/status. */
export async function isConfigured() {
  return (await getClient()) !== null
}

/**
 * How alike the two faces are, 0-100.
 *
 * No FaceMatches means the provider compared them and they are not the same
 * person — a similarity of 0, not a missing answer.
 */
async function bestSimilarity(sdk, selfie, reference) {
  const out = await sdk.client.send(new sdk.CompareFacesCommand({
    SourceImage: { Bytes: reference },
    TargetImage: { Bytes: selfie },
    SimilarityThreshold: PROVIDER_MIN_SIMILARITY,
    QualityFilter: 'AUTO',
  }))
  return (out.FaceMatches || []).reduce((a, m) => Math.max(a, m.Similarity ?? 0), 0)
}

/**
 * Compare a live selfie against the user's main profile photo.
 *
 * Both arguments are raw base64 (no data: prefix) — readImage in faceverify.js
 * produces exactly that.
 *
 * Resolves to:
 *   { ok: true, similarity, selfieFaces, referenceFaces }
 *   { ok: false, reason }
 */
export async function compareFaces(selfieB64, referenceB64) {
  const sdk = await getClient()
  if (!sdk) return { ok: false, reason: 'not_configured' }

  try {
    const selfie = Buffer.from(selfieB64, 'base64')
    const reference = Buffer.from(referenceB64, 'base64')

    // Count faces in each image first. CompareFaces alone cannot tell "no face
    // in the reference" from "no match", and those need different words to the
    // user — one is "your main photo doesn't show your face", the other is
    // "that isn't you".
    const [selfieFaces, referenceFaces] = await Promise.all([
      countFaces(sdk, selfie),
      countFaces(sdk, reference),
    ])
    if (selfieFaces === null || referenceFaces === null) {
      return { ok: false, reason: 'provider_unavailable' }
    }
    // Nothing to compare, but we did get a real answer — report it as such so
    // the verdict is a retry with a useful reason rather than manual review.
    if (selfieFaces !== 1 || referenceFaces !== 1) {
      return { ok: true, similarity: 0, selfieFaces, referenceFaces }
    }

    return {
      ok: true,
      similarity: await bestSimilarity(sdk, selfie, reference),
      selfieFaces: 1,
      referenceFaces: 1,
    }
  } catch (err) {
    // InvalidParameterException is Rekognition's "I found no face here", which
    // we have already handled above; anything reaching this catch is genuinely
    // unexpected, so it goes to review rather than becoming a rejection.
    console.error('[faceverify] provider error:', err?.name || err?.message || err)
    return { ok: false, reason: 'provider_unavailable' }
  }
}

/** Faces in one image, or null when the provider could not say. */
async function countFaces(sdk, bytes) {
  try {
    const out = await sdk.client.send(new sdk.DetectFacesCommand({
      Image: { Bytes: bytes }, Attributes: ['DEFAULT'],
    }))
    return (out.FaceDetails || []).length
  } catch (err) {
    // A malformed or unreadable image is a real answer: zero faces.
    if (err?.name === 'InvalidImageFormatException' || err?.name === 'ImageTooLargeException') return 0
    return null
  }
}
