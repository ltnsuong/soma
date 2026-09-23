// Who may be shown to whom.
//
// SOMA serves both adults and under-17s, and they are kept apart. That is not a
// product preference — it is the control that stops an adult and a child being
// introduced to each other by a matching engine, so it is written once, here,
// tested, and enforced on the server. A client-side filter would be a
// suggestion; anyone can call the API directly.
//
// Three bands, and the third one matters most:
//
//   adult    — 17 or over on the day of the check
//   minor    — under 17
//   unknown  — we have not asked, or the answer did not parse
//
// `unknown` fails CLOSED: it sees nobody and nobody sees it. The tempting
// alternative — treat unknown as adult so the app keeps working — is exactly
// the bug that puts a 14-year-old in an adult's feed the first time a write
// fails. A user who sees an empty list and is asked their age is recoverable;
// the other way round is not.
//
// Pure logic: no express, no database, no clock of its own. The caller passes
// `today`.

/** Under this, the dating side is closed and only other minors are visible. */
export const ADULT_AGE = 17

/** The oldest plausible birth date, so a typo cannot create a 900-year-old. */
export const MAX_AGE = 120

export const ADULT = 'adult'
export const MINOR = 'minor'
export const UNKNOWN = 'unknown'

/**
 * Does this date string survive being parsed?
 *
 * Checking the FORMAT is not enough: "2010-02-31" matches the pattern, and
 * Date silently rolls it to 3 March — so a typo would be accepted as a real
 * birthday a few days off, which near the boundary is the difference between
 * minor and adult.
 */
function roundTrips(str, year, monthIndex, day) {
  const m = str.match(/^(\d{4})-(\d{2})-(\d{2})/)
  if (!m) return false
  return Number(m[1]) === year && Number(m[2]) === monthIndex + 1 && Number(m[3]) === day
}

/**
 * The date this person turns `ADULT_AGE`, from a date of birth.
 *
 * Returns null for anything that is not a real, plausible past date — callers
 * treat null as `unknown`, which is the closed state.
 *
 * Note the deliberate use of UTC: a birthday must not shift by a day because
 * the server happens to be in a different timezone from the phone.
 */
export function adultDateFrom(dob, today = new Date()) {
  const d = dob instanceof Date ? dob : new Date(String(dob))
  if (Number.isNaN(d.getTime())) return null

  const y = d.getUTCFullYear()
  const m = d.getUTCMonth()
  const day = d.getUTCDate()

  if (typeof dob === 'string' && !roundTrips(dob, y, m, day)) return null
  if (d > today) return null
  if (y < today.getUTCFullYear() - MAX_AGE) return null

  return new Date(Date.UTC(y + ADULT_AGE, m, day))
}

/** The band, from a stored adult-at date. */
export function bandOf(adultAt, today = new Date()) {
  if (!adultAt) return UNKNOWN
  const d = adultAt instanceof Date ? adultAt : new Date(String(adultAt))
  if (Number.isNaN(d.getTime())) return UNKNOWN
  return d <= today ? ADULT : MINOR
}

/** The band, from the denormalised boolean that matching queries filter on. */
export function bandOfFlag(isMinor) {
  if (isMinor === true) return MINOR
  if (isMinor === false) return ADULT
  return UNKNOWN
}

/**
 * May `viewer` be shown `target`?
 *
 * Symmetric and closed by default: same known band only. Written as an
 * allow-list rather than a set of denials so that a new band added later is
 * invisible until somebody decides what it may see, rather than visible to
 * everyone by accident.
 */
export function canSee(viewerBand, targetBand) {
  if (viewerBand === ADULT && targetBand === ADULT) return true
  if (viewerBand === MINOR && targetBand === MINOR) return true
  return false
}

/**
 * The connection types this band may use.
 *
 * Under 17 the dating side is closed. Support is excluded too: it is the
 * surface where someone describes what they are struggling with to a stranger,
 * and that is not a room to put children in without a safeguarding process
 * SOMA does not have.
 */
export function allowedConnectionTypes(band) {
  if (band === ADULT) return ['dating', 'friends', 'professional', 'support']
  if (band === MINOR) return ['friends']
  return []
}

/** Is this connection type open to this band? */
export const canUseConnectionType = (band, type) =>
  allowedConnectionTypes(band).includes(type)

/**
 * Force a requested connection type into something the band may use.
 * Returns null when the band may use nothing at all, which the caller must
 * treat as "show no one".
 */
export function coerceConnectionType(band, requested) {
  const allowed = allowedConnectionTypes(band)
  if (!allowed.length) return null
  return allowed.includes(requested) ? requested : allowed[0]
}
