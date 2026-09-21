import { describe, it, expect, beforeEach } from 'vitest'
import {
  readAppleClaims, appleAudiences, appleKeys, verifyAppleToken,
  APPLE_ISSUER, _resetKeyCache,
} from './apple-auth.js'

const AUD = ['site.mysoma.app']
const claims = (over = {}) => ({ sub: 'apple-sub-123', iss: APPLE_ISSUER, aud: AUD[0], ...over })

beforeEach(_resetKeyCache)

describe('what we accept from a token', () => {
  it('reads the stable subject', () => {
    expect(readAppleClaims(claims(), AUD).appleId).toBe('apple-sub-123')
  })

  it('rejects a token minted for another app', () => {
    // Validly signed by Apple, just not for us. Skipping this lets anyone who
    // gets a user into their own app replay that token here.
    expect(() => readAppleClaims(claims({ aud: 'com.someone.else' }), AUD))
      .toThrow(/another app/)
  })

  it('rejects a wrong issuer', () => {
    expect(() => readAppleClaims(claims({ iss: 'https://evil.example' }), AUD))
      .toThrow(/issuer/)
  })

  it('rejects a token with no subject', () => {
    const noSub = claims()
    delete noSub.sub
    expect(() => readAppleClaims(noSub, AUD)).toThrow(/subject/)
  })

  it('refuses to run at all when no bundle id is configured', () => {
    // Failing closed matters: an empty allowlist must never mean "allow all".
    expect(() => readAppleClaims(claims(), [])).toThrow(/not configured/)
  })

  it('accepts email_verified as a string or a boolean', () => {
    expect(readAppleClaims(claims({ email_verified: 'true' }), AUD).emailVerified).toBe(true)
    expect(readAppleClaims(claims({ email_verified: true }), AUD).emailVerified).toBe(true)
    expect(readAppleClaims(claims({ email_verified: 'false' }), AUD).emailVerified).toBe(false)
  })

  it('flags a private relay address', () => {
    expect(readAppleClaims(claims({ is_private_email: 'true' }), AUD).isPrivateRelay).toBe(true)
    expect(readAppleClaims(claims(), AUD).isPrivateRelay).toBe(false)
  })

  it('tolerates the later sign-ins, which carry no email', () => {
    // Apple sends name and email ONLY on first authorisation.
    expect(readAppleClaims(claims(), AUD).email).toBeNull()
  })
})

describe('the audience allowlist', () => {
  it('splits a comma-separated list', () => {
    expect(appleAudiences({ APPLE_CLIENT_IDS: 'a.b.c, d.e.f' })).toEqual(['a.b.c', 'd.e.f'])
  })

  it('falls back to a single bundle id', () => {
    expect(appleAudiences({ APPLE_BUNDLE_ID: 'site.mysoma.app' })).toEqual(['site.mysoma.app'])
  })

  it('is empty when unset, so verification fails closed', () => {
    expect(appleAudiences({})).toEqual([])
  })
})

describe('Apple key fetching', () => {
  const keyRes = (keys) => ({ ok: true, json: async () => ({ keys }) })

  it('caches within the hour instead of hammering Apple', async () => {
    let calls = 0
    const f = async () => { calls++; return keyRes([{ kid: 'k1' }]) }
    await appleKeys(f)
    await appleKeys(f)
    expect(calls).toBe(1)
  })

  it('throws when Apple is unreachable rather than accepting the token', async () => {
    await expect(appleKeys(async () => ({ ok: false, status: 503 })))
      .rejects.toThrow(/unavailable/)
  })

  it('throws when Apple returns no keys', async () => {
    await expect(appleKeys(async () => keyRes([]))).rejects.toThrow(/no keys/)
  })
})

describe('verifyAppleToken', () => {
  const header = (kid) => Buffer.from(JSON.stringify({ kid, alg: 'RS256' })).toString('base64')
  const keysFetch = async () => ({ ok: true, json: async () => ({ keys: [{ kid: 'k1' }] }) })

  it('refuses a token signed with a key Apple does not publish', async () => {
    await expect(verifyAppleToken(`${header('unknown')}.x.y`, AUD, { fetchImpl: keysFetch }))
      .rejects.toThrow(/unknown key/)
  })

  it('refuses a malformed token', async () => {
    await expect(verifyAppleToken('not-a-jwt', AUD, { fetchImpl: keysFetch }))
      .rejects.toThrow(/malformed/)
  })

  it('requires a token at all', async () => {
    await expect(verifyAppleToken('', AUD)).rejects.toThrow(/required/)
  })
})
