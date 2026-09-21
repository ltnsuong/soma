// Sign in with Apple — verifying the identity token.
//
// Apple hands the app a JWT signed with one of its rotating RSA keys. Verifying
// it properly is the whole security of this flow: an unverified token is just a
// string the client made up, and anyone could sign in as anyone.
//
// Three things have to hold, and all three matter:
//   signature  against Apple's current published keys (they rotate, so fetch)
//   issuer     exactly https://appleid.apple.com
//   audience   our bundle id — a token minted for a DIFFERENT app is still
//              validly signed by Apple, so skipping this lets anyone who can
//              get a user into their own app replay that token here. This is
//              the same hole the Google path already guards with GOOGLE_CLIENT_IDS.
import crypto from 'crypto'
import jwt from 'jsonwebtoken'

export const APPLE_ISSUER = 'https://appleid.apple.com'
const APPLE_KEYS_URL = 'https://appleid.apple.com/auth/keys'
const KEY_TTL_MS = 60 * 60 * 1000

let cachedKeys = null
let cachedAt = 0

/** Apple's public keys, cached for an hour — they rotate, so never pin one. */
export async function appleKeys(fetchImpl = fetch) {
  if (cachedKeys && Date.now() - cachedAt < KEY_TTL_MS) return cachedKeys
  const res = await fetchImpl(APPLE_KEYS_URL)
  if (!res.ok) throw new Error(`Apple keys unavailable (${res.status})`)
  const { keys } = await res.json()
  if (!keys?.length) throw new Error('Apple returned no keys')
  cachedKeys = keys
  cachedAt = Date.now()
  return keys
}

/** Only for tests, so one case cannot leak its keys into the next. */
export const _resetKeyCache = () => { cachedKeys = null; cachedAt = 0 }

/**
 * What we accept out of a verified token. Kept separate from the crypto so the
 * rules can be tested without a signing key.
 *
 * Apple sends the name and email ONLY on the very first authorisation — every
 * later sign-in carries just `sub`. So an account must be found by `sub`, and
 * the email stored the first time or lost for good.
 */
export function readAppleClaims(payload, audiences) {
  if (!payload?.sub) throw new Error('Apple token has no subject')
  if (payload.iss !== APPLE_ISSUER) throw new Error('Apple token has the wrong issuer')
  if (!audiences.length) throw new Error('Apple sign-in is not configured on the server')
  if (!audiences.includes(payload.aud)) throw new Error('Apple token was issued for another app')
  // Apple sends this as the string "true" or a boolean depending on the flow.
  const emailVerified = payload.email_verified === true || payload.email_verified === 'true'
  return {
    appleId: payload.sub,
    email: payload.email || null,
    emailVerified,
    // A relay address forwards to their real inbox; it is still a usable email,
    // but it is theirs-for-this-app-only and must never be treated as a lookup
    // key across providers.
    isPrivateRelay: payload.is_private_email === true || payload.is_private_email === 'true',
  }
}

/** Verify signature, then claims. Throws on anything unexpected. */
export async function verifyAppleToken(identityToken, audiences, deps = {}) {
  const { fetchImpl = fetch, verify = jwt.verify } = deps
  if (!identityToken) throw new Error('identityToken required')

  const [rawHeader] = identityToken.split('.')
  let header
  try { header = JSON.parse(Buffer.from(rawHeader, 'base64').toString()) }
  catch { throw new Error('Apple token is malformed') }

  const key = (await appleKeys(fetchImpl)).find(k => k.kid === header.kid)
  if (!key) throw new Error('Apple token was signed with an unknown key')

  const publicKey = crypto.createPublicKey({ key, format: 'jwk' })
  const payload = verify(identityToken, publicKey, {
    algorithms: ['RS256'],
    issuer: APPLE_ISSUER,
  })
  return readAppleClaims(payload, audiences)
}

/** Bundle ids allowed to mint tokens for us. */
export const appleAudiences = (env = process.env) =>
  (env.APPLE_CLIENT_IDS || env.APPLE_BUNDLE_ID || '')
    .split(',').map(s => s.trim()).filter(Boolean)
