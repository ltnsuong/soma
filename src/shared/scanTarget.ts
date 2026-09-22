// Turning whatever a camera saw into a SOMA code, and what it is for.
//
// The QR on someone's code screen encodes their connect link,
// `https://mysoma.site/?add=A95CA4&for=professional`. The `for` is the OWNER's
// intent — "this is my professional code" — which is what makes four separate
// codes worth having: SOMA derives four different profiles per person, so
// scanning a professional code compares their professional profile with yours,
// not a blended one.
//
// A camera reads every barcode in the room and people also paste codes by hand,
// so this decides what is actually a SOMA code and rejects everything else —
// quietly, without throwing into a frame callback that fires many times a second.

/** Mirrors ConnectionType in src/features/connections/scoring.ts. */
export type ScanIntent = 'dating' | 'friends' | 'professional' | 'support'

export const SCAN_INTENTS: ScanIntent[] = ['dating', 'friends', 'professional', 'support']

/** Six hex characters: the leading bytes of a user id. */
const CODE = /^[0-9A-F]{4,8}$/

export interface ScanTarget {
  code: string
  /** Null when the code carries no intent — an older link, or a general one. */
  intent: ScanIntent | null
}

const asIntent = (v: string | undefined): ScanIntent | null => {
  if (!v) return null
  const s = v.trim().toLowerCase()
  // `romantic` is what the Meet screen calls it; the stored profile calls the
  // same thing `dating`. Accept both so a link cannot be right and still fail.
  if (s === 'romantic') return 'dating'
  return (SCAN_INTENTS as string[]).includes(s) ? (s as ScanIntent) : null
}

/**
 * Pull a code, and its purpose, out of a scanned payload. Null if it is not ours.
 *
 * Accepts the connect link in the forms it appears in the wild — with or without
 * a scheme, `?add=` or `#add=`, other parameters around it, percent-encoded, any
 * case — and a bare code typed by hand.
 *
 * Returns null for anything else, including a QR for a different site. The caller
 * keeps scanning rather than showing an error for every stray barcode in frame.
 */
export function codeFromScan(raw: string | null | undefined): ScanTarget | null {
  if (!raw) return null
  const s = raw.trim()
  if (!s) return null

  // A bare code, typed or pasted. No intent to read from it.
  const bare = s.toUpperCase()
  if (CODE.test(bare)) return { code: bare.slice(0, 6), intent: null }

  // A connect link. Deliberately not `new URL()`: React Native's URL is partial,
  // and the scheme is often missing from a hand-made QR anyway.
  const m = s.match(/[?&#]add=([^&#\s]+)/i)
  if (!m) return null

  // Only accept it from our own host, so a QR from elsewhere carrying ?add=
  // cannot make the app look someone up.
  if (/^https?:\/\//i.test(s) && !/(^|\/\/|\.)mysoma\.site(\/|$|[:?#])/i.test(s)) return null

  const code = decodeURIComponent(m[1]).trim().toUpperCase()
  if (!CODE.test(code)) return null

  const f = s.match(/[?&#]for=([^&#\s]+)/i)
  return { code: code.slice(0, 6), intent: asIntent(f ? decodeURIComponent(f[1]) : undefined) }
}

/**
 * The link a code screen encodes. One definition, used by the QR, by sharing and
 * by the scanner's tests, so the two ends cannot drift apart.
 *
 * Without an intent it stays the plain link, which is what older codes look like.
 */
export const connectLink = (code: string, intent?: ScanIntent | null) =>
  `https://mysoma.site/?add=${code}${intent ? `&for=${intent}` : ''}`
