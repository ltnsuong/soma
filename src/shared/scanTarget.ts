// Turning whatever a camera saw into a SOMA code.
//
// The QR on someone's code screen encodes their connect link,
// `https://mysoma.site/?add=A95CA4`. But a camera will happily read any QR in
// the world, and people also paste codes by hand, so this has to decide what is
// actually a SOMA code and reject everything else — quietly, without throwing
// into a frame callback that fires many times a second.

/** Six hex characters: the leading bytes of a user id. */
const CODE = /^[0-9A-F]{4,8}$/

/**
 * Pull a SOMA code out of a scanned payload, or return null.
 *
 * Accepts the connect link in any of the forms it appears in the wild — with or
 * without a scheme, with `?add=` or `#add=`, with other query parameters around
 * it — and a bare code typed or pasted by hand.
 *
 * Returns null for anything else, including a QR for a different site. The
 * caller keeps scanning rather than showing an error for every stray barcode
 * that passes through the frame.
 */
export function codeFromScan(raw: string | null | undefined): string | null {
  if (!raw) return null
  const s = raw.trim()
  if (!s) return null

  // A bare code, typed or pasted.
  const bare = s.toUpperCase()
  if (CODE.test(bare)) return bare.slice(0, 6)

  // A connect link. Deliberately not `new URL()`: React Native's URL is partial,
  // and the scheme is often missing from a hand-made QR anyway.
  const m = s.match(/[?&#]add=([^&#\s]+)/i)
  if (!m) return null

  // Only accept it from our own host, so a QR from elsewhere carrying ?add=
  // cannot make the app look someone up.
  if (/^https?:\/\//i.test(s) && !/(^|\/\/|\.)mysoma\.site(\/|$|[:?#])/i.test(s)) return null

  const code = decodeURIComponent(m[1]).trim().toUpperCase()
  return CODE.test(code) ? code.slice(0, 6) : null
}

/** A connect link for a code — one definition, used by the QR and by sharing. */
export const connectLink = (code: string) => `https://mysoma.site/?add=${code}`
