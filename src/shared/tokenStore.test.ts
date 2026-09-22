import { describe, it, expect } from 'vitest'
import {
  readToken, writeTokens, clearTokens, TOKEN_KEY, REFRESH_KEY,
  type TokenBackend,
} from './tokenStore'

/** An in-memory stand-in for the keychain, with optional faults. */
const backend = (opts: { failWrite?: boolean; failRead?: boolean; failRemove?: boolean } = {}) => {
  const data = new Map<string, string>()
  const b: TokenBackend & { data: Map<string, string> } = {
    data,
    getItem: (k) => { if (opts.failRead) throw new Error('keychain locked'); return data.get(k) ?? null },
    setItem: (k, v) => { if (opts.failWrite) throw new Error('keychain unavailable'); data.set(k, v) },
    removeItem: (k) => { if (opts.failRemove) throw new Error('nope'); data.delete(k) },
  }
  return b
}

describe('reading a token', () => {
  it('returns what was stored', () => {
    const b = backend()
    writeTokens(b, 'access-1', 'refresh-1')
    expect(readToken(b, TOKEN_KEY)).toBe('access-1')
    expect(readToken(b, REFRESH_KEY)).toBe('refresh-1')
  })

  it('returns null when nothing is stored', () => {
    expect(readToken(backend(), TOKEN_KEY)).toBeNull()
  })

  it('treats an empty string as no token', () => {
    // '' is falsy, but a null check on it says "a token exists". One test for callers.
    const b = backend()
    b.setItem(TOKEN_KEY, '')
    expect(readToken(b, TOKEN_KEY)).toBeNull()
  })

  it('reads as signed out when the store throws', () => {
    // A locked keychain must never read as signed in.
    expect(readToken(backend({ failRead: true }), TOKEN_KEY)).toBeNull()
  })
})

describe('writing tokens', () => {
  it('stores both and reports success', () => {
    const b = backend()
    expect(writeTokens(b, 'a', 'r')).toBe(true)
    expect(b.data.get(TOKEN_KEY)).toBe('a')
    expect(b.data.get(REFRESH_KEY)).toBe('r')
  })

  it('refuses a half pair', () => {
    // An access token with no refresh token leaves the user stuck when it expires.
    const b = backend()
    expect(writeTokens(b, 'a', '')).toBe(false)
    expect(writeTokens(b, '', 'r')).toBe(false)
    expect(b.data.size).toBe(0)
  })

  it('leaves nothing behind when the store fails', () => {
    const b = backend({ failWrite: true })
    expect(writeTokens(b, 'a', 'r')).toBe(false)
    expect(b.data.size).toBe(0)
  })

  it('reports failure rather than throwing', () => {
    // The caller decides what to tell the user; this never crashes a render.
    expect(() => writeTokens(backend({ failWrite: true }), 'a', 'r')).not.toThrow()
  })
})

describe('clearing tokens', () => {
  it('removes both', () => {
    const b = backend()
    writeTokens(b, 'a', 'r')
    clearTokens(b)
    expect(readToken(b, TOKEN_KEY)).toBeNull()
    expect(readToken(b, REFRESH_KEY)).toBeNull()
  })

  it('still attempts the second removal when the first throws', () => {
    // Signing out half way is worse than not at all.
    let calls = 0
    const b: TokenBackend = {
      getItem: () => null,
      setItem: () => {},
      removeItem: () => { calls++; if (calls === 1) throw new Error('first fails') },
    }
    clearTokens(b)
    expect(calls).toBe(2)
  })

  it('does not throw when the store is unavailable', () => {
    expect(() => clearTokens(backend({ failRemove: true }))).not.toThrow()
  })
})

describe('a full sign-in, sign-out round trip', () => {
  it('survives the way the app actually uses it', () => {
    const b = backend()
    expect(readToken(b, TOKEN_KEY)).toBeNull()      // guest
    writeTokens(b, 'access', 'refresh')             // sign in
    expect(readToken(b, TOKEN_KEY)).toBe('access')  // signed in, and stays that way
    clearTokens(b)                                  // sign out
    expect(readToken(b, TOKEN_KEY)).toBeNull()
  })
})
