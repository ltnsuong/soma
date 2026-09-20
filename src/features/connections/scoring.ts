// Four connection types, four different questions — so four different algorithms.
//
// The old scorer ran attachment style and love language over everybody, which
// means a potential work collaborator was ranked on how they behave in romantic
// relationships. That is not a worse match, it is an answer to a question nobody
// asked.
//
// What each type actually optimises for:
//
//   dating        shared VALUES, plus attachment and love-language fit.
//                 Gottman: shared meaning predicts more than shared hobbies.
//                 Attachment (Hazan & Shaver; Levine & Heller): secure pairs do
//                 best, anxious+avoidant is the classic trap.
//
//   friends       shared ACTIVITIES and proximity. Friendship needs something to
//                 do together and repeated, low-effort contact (Festinger's
//                 propinquity; Hall on hours-to-friendship). Attachment style is
//                 irrelevant here and nobody should be asked for it.
//
//   professional  COMPLEMENTARITY, not similarity. Granovetter's strength of weak
//                 ties: the valuable professional contact is the one outside your
//                 own circle, who knows what you don't. Scoring this on sameness
//                 would surface the least useful people first.
//
//   support       SAME experience, DIFFERENT stage. Peer support works when
//                 someone has been where you are and is a little further along
//                 (Riessman's helper-therapy principle). Two people at the same
//                 low point is co-rumination, not support — so identical
//                 struggle with no progress difference scores LOWER, on purpose.
//
// Pure functions. Nothing here imports App.tsx.
import type { DomainKey } from '../../shared/domains'

export type ConnectionType = 'dating' | 'friends' | 'professional' | 'support'

export interface Side {
  interests: string[]
  values: string[]
  work?: string
  city?: string
  distanceKm?: number
  attachment?: string
  loveLanguage?: string
  /** 0-100 per life area. Low means they are struggling there. */
  wellbeing?: Partial<Record<DomainKey, number>>
}

export interface Fit {
  score: number          // 0-100
  reasons: string[]      // shown to the user, most important first
}

// ── shared helpers ───────────────────────────────────────────

const norm = (s: string) => s.toLowerCase().trim()

/** Case-insensitive overlap, returned as both a ratio and the matching items. */
export const overlap = (a: string[], b: string[]): { ratio: number; shared: string[] } => {
  if (!a.length || !b.length) return { ratio: 0, shared: [] }
  const setB = new Set(b.map(norm))
  const shared = a.filter(x => setB.has(norm(x)))
  return { ratio: shared.length / Math.min(a.length, b.length), shared }
}

/** Attachment fit (0..1). Secure partners raise everyone; anxious+avoidant is the trap. */
export const attachmentFit = (a?: string, b?: string): number => {
  if (!a || !b) return 0.72
  const M: Record<string, Record<string, number>> = {
    Secure:       { Secure: 1.0,  Anxious: 0.85, Avoidant: 0.8,  Disorganized: 0.7 },
    Anxious:      { Secure: 0.85, Anxious: 0.6,  Avoidant: 0.4,  Disorganized: 0.5 },
    Avoidant:     { Secure: 0.8,  Anxious: 0.4,  Avoidant: 0.5,  Disorganized: 0.45 },
    Disorganized: { Secure: 0.7,  Anxious: 0.5,  Avoidant: 0.45, Disorganized: 0.4 },
  }
  return M[a]?.[b] ?? 0.65
}

/** Love-language fit (0..1). Same language is easiest; two pairs complement well. */
export const loveFit = (a?: string, b?: string): number => {
  if (!a || !b) return 0.7
  if (a === b) return 1
  const pairs = [['Physical Touch', 'Words of Affirmation'], ['Quality Time', 'Acts of Service']]
  return pairs.some(([x, y]) => (a === x && b === y) || (a === y && b === x)) ? 0.85 : 0.7
}

/** Closeness (0..1). Matters far more for friends than for anything else. */
export const proximity = (km?: number): number => {
  if (km === undefined) return 0.6
  if (km <= 5) return 1
  if (km <= 25) return 0.8
  if (km <= 100) return 0.5
  return 0.25
}

const LOW = 45          // wellbeing at or below this = actively struggling
const STEADIER = 15     // how much further along counts as "a little ahead"

/** Life areas both are struggling in — the ground peer support stands on. */
export const sharedStruggles = (a: Side, b: Side): DomainKey[] => {
  const mine = a.wellbeing ?? {}
  const theirs = b.wellbeing ?? {}
  return (Object.keys(mine) as DomainKey[]).filter(k => (mine[k] ?? 100) <= LOW && (theirs[k] ?? 100) <= LOW + 25)
}

const clamp = (n: number) => Math.max(40, Math.min(98, Math.round(n)))

// ── the four scorers ─────────────────────────────────────────

const scoreDating = (me: Side, them: Side): Fit => {
  const v = overlap(me.values, them.values)
  const i = overlap(me.interests, them.interests)
  const att = attachmentFit(me.attachment, them.attachment)
  const love = loveFit(me.loveLanguage, them.loveLanguage)

  const reasons: string[] = []
  if (v.shared.length) reasons.push(`You both care about ${v.shared.slice(0, 2).join(' and ')}.`)
  if (att >= 0.8) reasons.push(`${me.attachment} and ${them.attachment} attachment styles tend to steady each other.`)
  else if (att < 0.5) reasons.push(`${me.attachment} and ${them.attachment} is a demanding pairing — worth going slowly.`)
  if (love === 1 && me.loveLanguage) reasons.push(`You both give love through ${me.loveLanguage.toLowerCase()}.`)
  if (i.shared.length) reasons.push(`Shared ground: ${i.shared.slice(0, 3).join(', ')}.`)

  // Values lead. Gottman's shared-meaning finding is the reason they outrank hobbies.
  return { score: clamp((0.12 + v.ratio * 0.30 + att * 0.28 + love * 0.18 + i.ratio * 0.12) * 100), reasons }
}

const scoreFriends = (me: Side, them: Side): Fit => {
  const i = overlap(me.interests, them.interests)
  const v = overlap(me.values, them.values)
  const near = proximity(them.distanceKm)

  const reasons: string[] = []
  if (i.shared.length) reasons.push(`You both do ${i.shared.slice(0, 3).join(', ')}.`)
  if (near >= 0.8) reasons.push('Close enough to actually meet, which is most of it.')
  else if (near <= 0.3) reasons.push('Far apart — this one would take real effort to keep up.')
  if (v.shared.length) reasons.push(`Similar outlook on ${v.shared.slice(0, 2).join(' and ')}.`)

  // Activity first, then closeness. A friend you never see is an acquaintance.
  return { score: clamp((0.15 + i.ratio * 0.45 + near * 0.28 + v.ratio * 0.12) * 100), reasons }
}

const scoreProfessional = (me: Side, them: Side): Fit => {
  const sameField = !!me.work && !!them.work && norm(me.work) === norm(them.work)
  const v = overlap(me.values, them.values)   // shared goals, not shared hobbies
  const i = overlap(me.interests, them.interests)

  // The bridge: different work, overlapping aims. Same job + same interests is
  // the most comfortable and least useful introduction in the set.
  const bridge = sameField ? 0.35 : 0.9
  const reasons: string[] = []
  if (!sameField && them.work) reasons.push(`They work in ${them.work} — a different room to yours, which is where useful introductions come from.`)
  if (sameField) reasons.push(`You are both in ${them.work}. Familiar ground, but less new to learn.`)
  if (v.shared.length) reasons.push(`Aiming at similar things: ${v.shared.slice(0, 2).join(', ')}.`)
  if (i.shared.length) reasons.push(`Common interest in ${i.shared.slice(0, 2).join(' and ')} to open with.`)

  return { score: clamp((0.18 + bridge * 0.38 + v.ratio * 0.28 + i.ratio * 0.16) * 100), reasons }
}

const scoreSupport = (me: Side, them: Side): Fit => {
  const struggles = sharedStruggles(me, them)
  const mine = me.wellbeing ?? {}
  const theirs = them.wellbeing ?? {}

  // Someone a little further along in the same place helps most. Level pegging
  // at the bottom is co-rumination — the thing peer support is meant to avoid.
  const ahead = struggles.filter(k => (theirs[k] ?? 0) - (mine[k] ?? 0) >= STEADIER)
  const stage = struggles.length ? ahead.length / struggles.length : 0.4
  const ground = Math.min(struggles.length / 2, 1)
  const v = overlap(me.values, them.values)

  const reasons: string[] = []
  if (struggles.length) reasons.push(`You are both working through ${struggles.slice(0, 2).join(' and ')}.`)
  if (ahead.length) reasons.push('They are a little further along in it, which is the kind of person who helps most.')
  else if (struggles.length) reasons.push('You are at a similar point — good for feeling less alone, harder for finding a way out.')
  if (v.shared.length) reasons.push(`Shared values around ${v.shared.slice(0, 2).join(' and ')}.`)

  return { score: clamp((0.2 + ground * 0.42 + stage * 0.24 + v.ratio * 0.14) * 100), reasons }
}

const SCORERS: Record<ConnectionType, (me: Side, them: Side) => Fit> = {
  dating: scoreDating,
  friends: scoreFriends,
  professional: scoreProfessional,
  support: scoreSupport,
}

export const scoreFit = (type: ConnectionType, me: Side, them: Side): Fit =>
  (SCORERS[type] ?? scoreDating)(me, them)

// ── what each type shows ─────────────────────────────────────

export type FieldKey =
  | 'age' | 'city' | 'work' | 'lookingFor' | 'values'
  | 'interests' | 'loveLanguage' | 'attachment' | 'workingOn'

/**
 * Which profile fields belong to which type.
 *
 * attachment and loveLanguage appear ONLY for dating. Showing someone's
 * attachment style on a work introduction is both useless and intrusive.
 * Age is dropped for professional and support too — in a work context it
 * invites bias, and in a support context it is beside the point.
 */
export const VISIBLE_FIELDS: Record<ConnectionType, FieldKey[]> = {
  dating:       ['age', 'city', 'work', 'lookingFor', 'loveLanguage', 'attachment', 'values'],
  friends:      ['age', 'city', 'interests', 'lookingFor'],
  professional: ['city', 'work', 'values', 'lookingFor'],
  support:      ['city', 'workingOn', 'lookingFor'],
}

export const shows = (type: ConnectionType, field: FieldKey): boolean =>
  (VISIBLE_FIELDS[type] ?? VISIBLE_FIELDS.dating).includes(field)

/** What Soma is told to write about, per type, when it drafts that sector's bio. */
export const BIO_BRIEF: Record<ConnectionType, string> = {
  dating:
    'What they want from a relationship and how they are with the people closest to them. ' +
    'Warm, specific, first person. No job title unless it genuinely matters to them.',
  friends:
    'What they actually DO — the activities, the rhythms, what a good Saturday looks like. ' +
    'Someone reading this should be able to think of a thing to invite them to.',
  professional:
    'What they work on, what they are trying to build, and what they could use help with. ' +
    'No feelings, no relationship detail, nothing about their home life.',
  support:
    'What they are working through and what kind of support actually helps them. ' +
    'Plain and undramatic. Never romantic, never pitying, never a diagnosis.',
}
