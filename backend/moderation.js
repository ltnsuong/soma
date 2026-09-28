// Blocking and reporting.
//
// SOMA puts strangers into one-to-one conversations. That is the whole product,
// and it is also the reason this file has to exist: an app that introduces
// people to each other and offers no way to make one of them go away is not
// finished, whatever else it does. App Store guideline 1.2 requires a report
// mechanism and the ability to block abusive users for any app carrying
// user-generated content; more to the point, the 13+ rating means some of the
// people involved are children.
//
// The rule lives here, once, tested, and is enforced on the server — the same
// shape as agegate.js and for the same reason. A block applied only in the UI
// is a suggestion: the person you blocked can still call /users/:id/profile
// with curl and read everything.
//
// Two invariants, both of which have a way of getting quietly relaxed:
//
//   A block is SYMMETRIC. If A blocks B then neither can see or reach the
//   other. The tempting version — B is hidden from A, but A stays visible to B
//   — lets the person who was blocked keep watching, and keep finding new ways
//   to make contact. That is not a block, it is a mute.
//
//   A block we could not read fails CLOSED. If the block list cannot be
//   fetched, nobody is shown, exactly as an unknown age band shows nobody. An
//   empty feed is an inconvenience. Surfacing someone to the person they
//   blocked, because a query timed out, is the failure this is here to prevent.
//
// Pure logic: no express, no database. The caller fetches the rows.

/**
 * Why someone is being reported.
 *
 * A fixed list rather than free text, because a reason has to be countable to
 * be actionable, and because free text invites people to paste things that then
 * live in our database forever. `other` carries the detail field.
 */
export const REPORT_REASONS = Object.freeze([
  'harassment',
  'spam',
  'inappropriate_content',
  'fake_profile',
  'underage',
  'safety_concern',
  'other',
])

/** Reports that are about someone's safety, not their manners. */
export const URGENT_REASONS = Object.freeze(['underage', 'safety_concern'])

/** Free text is capped: a report is a signal, not a correspondence. */
export const MAX_DETAIL_LENGTH = 1000

/** Deliberately low. Somebody filing 50 reports an hour is the abuse. */
export const MAX_REPORTS_PER_DAY = 20

/**
 * The reason, or null if it is not one we recognise.
 *
 * Unrecognised reasons are refused rather than coerced to 'other', so a client
 * typo surfaces as an error instead of silently filing a report nobody can act
 * on.
 */
export function normalizeReason(raw) {
  if (typeof raw !== 'string') return null
  const reason = raw.trim().toLowerCase()
  return REPORT_REASONS.includes(reason) ? reason : null
}

/** Trimmed, length-capped detail. Never null — an absent detail is ''. */
export function normalizeDetail(raw) {
  if (typeof raw !== 'string') return ''
  return raw.trim().slice(0, MAX_DETAIL_LENGTH)
}

/** Does this report need a human to look at it today rather than this week? */
export function isUrgent(reason) {
  return URGENT_REASONS.includes(reason)
}

/**
 * Can this block be written?
 *
 * Returns { ok: true } or { ok: false, reason } so the route can map the reason
 * onto a status code without re-deriving why.
 */
export function validateBlock(blockerId, blockedId) {
  if (!isId(blockerId) || !isId(blockedId)) return { ok: false, reason: 'missing_user' }
  if (blockerId === blockedId) return { ok: false, reason: 'self_block' }
  return { ok: true }
}

/** Same checks as a block, plus a reason we recognise. */
export function validateReport(reporterId, reportedId, reason) {
  const asBlock = validateBlock(reporterId, reportedId)
  if (!asBlock.ok) return { ok: false, reason: asBlock.reason === 'self_block' ? 'self_report' : asBlock.reason }
  const normalized = normalizeReason(reason)
  if (!normalized) return { ok: false, reason: 'bad_reason' }
  return { ok: true, normalized }
}

/**
 * Everyone `me` must not see, from the block rows in either direction.
 *
 * Pass every row where me is the blocker OR the blocked; this returns the other
 * party in each, which is what makes the block symmetric. Rows that do not
 * involve me are ignored rather than trusted — a widened query should not
 * quietly hide strangers.
 */
export function blockedIds(rows, meId) {
  const out = new Set()
  if (!isId(meId) || !Array.isArray(rows)) return out
  for (const row of rows) {
    const other = otherParty(row, meId)
    if (other) out.add(other)
  }
  return out
}

/**
 * The person on the other side of a block row, or null if the row is not about
 * me. Reading both directions here is what makes a block symmetric; returning
 * null for rows that do not involve me is what stops a widened query hiding
 * strangers.
 */
function otherParty(row, meId) {
  if (!row) return null
  const blocker = row.blocker_id ?? row.blockerId
  const blocked = row.blocked_id ?? row.blockedId
  if (blocker === meId) return isId(blocked) ? blocked : null
  if (blocked === meId) return isId(blocker) ? blocker : null
  return null
}

/**
 * May these two see or reach each other?
 *
 * `blocked` is the set from blockedIds(). Anything other than a real Set is
 * treated as a failed read and refuses — see the fail-closed note above.
 */
export function canInteract(otherId, blocked) {
  if (!(blocked instanceof Set)) return false
  if (!isId(otherId)) return false
  return !blocked.has(otherId)
}

/** Drop everyone blocked, in either direction, from a list of people. */
export function filterBlocked(people, blocked, idOf = (p) => p?.user_id ?? p?.userId ?? p?.id) {
  if (!Array.isArray(people)) return []
  if (!(blocked instanceof Set)) return []
  return people.filter(p => canInteract(idOf(p), blocked))
}

/** Has this person filed so many reports today that they are the problem? */
export function underReportLimit(countToday) {
  return Number.isInteger(countToday) && countToday >= 0 && countToday < MAX_REPORTS_PER_DAY
}

function isId(v) {
  return typeof v === 'string' && v.trim().length > 0
}
