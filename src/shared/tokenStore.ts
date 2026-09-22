// Where the auth tokens live.
//
// They used to live in `localStorage`, which React Native does not define. Every
// call sat inside a bare `try/catch {}`, so on a device saveTokens silently did
// nothing, getToken always returned null, and nobody could ever be signed in —
// the login request succeeded, returned tokens, and threw them away. The symptom
// was not an error but the Home screen showing "Demo mode" straight after a
// successful sign-in.
//
// App data now works through expo-sqlite's synchronous localStorage polyfill
// (installed in index.ts), but tokens are credentials and belong in the keychain
// rather than in the app's general key-value store: the keychain is encrypted
// separately from the app sandbox and is not included in unencrypted backups.
//
// The API stays synchronous because `auth.getToken()` is read during render in
// dozens of places. expo-secure-store's getItem/setItem are sync; only deletion
// is async, which is why remove() fires and forgets.

/** The three operations the token store needs. Injected so the rules can be tested. */
export interface TokenBackend {
  getItem(key: string): string | null
  setItem(key: string, value: string): void
  removeItem(key: string): void
}

export const TOKEN_KEY = 'soma_auth_token'
export const REFRESH_KEY = 'soma_refresh_token'

/**
 * Read a token, treating a blank string as absent.
 *
 * An empty string is falsy in JS but `!!''` reads as "no token" while
 * `localStorage.getItem` returning `''` reads as "a token exists" to anything
 * doing a null check. Normalising here means callers can use one test.
 */
export function readToken(backend: TokenBackend, key: string): string | null {
  try {
    const v = backend.getItem(key)
    return v && v.length > 0 ? v : null
  } catch {
    // A locked keychain or a cleared store is not an error worth crashing over,
    // but it does mean "signed out", never "signed in".
    return null
  }
}

/**
 * Store both tokens, or store neither.
 *
 * A half-written pair is worse than none: an access token without its refresh
 * token leaves the user signed in until it expires and then stuck, with no way
 * back except signing in again.
 */
export function writeTokens(backend: TokenBackend, access: string, refresh: string): boolean {
  if (!access || !refresh) return false
  try {
    backend.setItem(TOKEN_KEY, access)
    backend.setItem(REFRESH_KEY, refresh)
    return true
  } catch {
    try { backend.removeItem(TOKEN_KEY) } catch { /* nothing left to do */ }
    try { backend.removeItem(REFRESH_KEY) } catch { /* nothing left to do */ }
    return false
  }
}

/** Sign out. Both keys go, even if the first removal throws. */
export function clearTokens(backend: TokenBackend): void {
  try { backend.removeItem(TOKEN_KEY) } catch { /* keep going */ }
  try { backend.removeItem(REFRESH_KEY) } catch { /* keep going */ }
}
