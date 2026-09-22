// Merging the cloud profile over the local one.
//
// The rule is "cloud wins", because the server holds what Soma derived from
// every device. But cloud-wins must not mean "forget what this device knows":
// some fields only ever exist locally, and spreading the cloud row over the
// local profile silently erased them.
//
// The one that bit: `languageChosen`. Signing in dropped it, so the next launch
// routed to the language picker — with `language: 'en'` sitting right there in
// the same object. The user picked their language again, every single time.

/**
 * Only the fields this merge reasons about. Deliberately no index signature:
 * a TypeScript interface (which UserProfile is) is not assignable to a type
 * that has one, and the caller passes the real UserProfile.
 */
export interface LocalProfile {
  name?: string
  language?: string
  languageChosen?: boolean
  darkMode?: boolean
  registered?: boolean
}

/** Whatever else the profile carries rides along untouched. */
export type ProfileBlob = LocalProfile & Record<string, unknown>

export interface CloudRow {
  name?: string | null
  language?: string | null
  data: ProfileBlob
}

/**
 * Cloud data wins, except for the account flag and the device-only preferences.
 *
 * Anything added to UserProfile later that lives only on the device belongs in
 * the explicit list at the bottom, or the next sign-in will drop it the same way.
 */
export function mergeCloudProfile(row: CloudRow, local: LocalProfile): ProfileBlob {
  const cloud: ProfileBlob = row.data ?? {}
  return {
    ...cloud,
    // The session is what proves the account exists; the cloud row cannot say otherwise.
    registered: true,
    name: row.name || cloud.name || local.name,
    language: row.language || cloud.language || local.language,
    // Device-only, never stored server-side.
    // A returning user with a language on the server has plainly chosen one
    // before, so treat that as chosen rather than asking again.
    languageChosen: local.languageChosen ?? !!(row.language || cloud.language),
    darkMode: local.darkMode ?? cloud.darkMode,
  }
}
