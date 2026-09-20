// When Soma reaches out first, and what about.
//
// Pure decision logic — no database, no network, no clock of its own. Sending
// lives in server.js; deciding lives here, so it can be tested.
//
// The governing rule is that SILENCE BEATS FILLER. A companion that messages
// you every morning with nothing to say is a notification, and people turn
// notifications off. pickNudge returns null far more often than not, and that
// is the feature.

// The ten life areas, mirroring src/shared/domains.ts. Duplicated because the
// backend is plain ESM and cannot import the app's TypeScript.
export const DOMAINS = [
  'health', 'career', 'finance', 'relationship', 'family',
  'growth', 'hobby', 'purpose', 'mind', 'environment',
]

// How Soma sounds. Condensed from SOMA_VOICE in App.tsx — a push notification
// has no room for the full spec, but the rules that matter most survive.
export const NUDGE_VOICE = `You are Soma, writing ONE short push notification to someone you know.

THE HARD RULE: you know nothing except the facts given to you below. You cannot see
anything, you have not heard from anyone, and nothing has happened. Never invent a
place, an event, a message, or news about another person. If you find yourself
writing "I saw" or "I heard" or naming somewhere they have not mentioned, you are
making it up — say something smaller and true instead.

Contractions always. One sentence, two at most. Under 120 characters.
Be concrete: refer to the actual thing below, not to feelings in general.
NEVER: open with validation, name their emotion, use therapy-speak, mention being an AI,
say "just checking in", ask "how are you", or end with an exclamation mark.
Start with a capital letter and capitalise their name.`

// What a friend would actually wonder about, per life area. The bare domain word
// produces "just wondering what's running through your head" — true of any person
// on any day, which is another way of saying it is about nobody.
export const DOMAIN_ANGLE = {
  health: 'their sleep, energy, or body',
  career: 'how work is actually going',
  finance: 'money — plainly, without euphemism',
  relationship: 'where they are with love right now',
  family: 'their family',
  growth: 'what they are trying to get better at',
  hobby: 'what they do that is just for them',
  purpose: 'what they want the next year to look like',
  mind: 'how they switch off, or what they do with a difficult day',
  environment: 'where they live and whether it feels like theirs',
}

export const QUIET_START = 21      // local hour: nothing sent from 21:00
export const QUIET_END = 8         // local hour: nothing sent before 08:00
export const MIN_HOURS_BETWEEN = 44
export const MAX_PER_WEEK = 3
export const DRIFT_DAYS = 14       // a Circle person unheard from this long
export const AWAY_DAYS = 5         // they have not opened the app this long

const DAY = 24 * 60 * 60 * 1000
const daysSince = (iso, now) => (iso ? (now - new Date(iso).getTime()) / DAY : Infinity)

/** Local hour for someone whose UTC offset is `tzOffsetMinutes` (as JS reports it). */
export const localHour = (now, tzOffsetMinutes = 0) =>
  new Date(now - tzOffsetMinutes * 60000).getUTCHours()

export const isQuiet = (now, tzOffsetMinutes = 0) => {
  const h = localHour(now, tzOffsetMinutes)
  return h >= QUIET_START || h < QUIET_END
}

/**
 * The person they named and then stopped talking to. This is the highest-value
 * thing Soma can raise: it is a bid for connection in Gottman's sense, and it
 * is the whole reason the Circle exists. Most neglected first.
 */
export const driftingPerson = (circle = [], now = Date.now()) => {
  const stale = circle
    .filter(p => p?.name)
    .map(p => ({ p, quiet: daysSince(p.interactions?.[0]?.date ?? p.lastSeen, now) }))
    .filter(x => x.quiet >= DRIFT_DAYS)
    .sort((a, b) => b.quiet - a.quiet)
  return stale[0]?.p ?? null
}

/** Life areas they have never said anything about. */
export const emptyDomains = (memories = []) => {
  const seen = new Set(memories.map(m => m?.domain).filter(Boolean))
  return DOMAINS.filter(d => !seen.has(d))
}

// Every reason to stay quiet, in one place. Silence is the default.
function blocked(s, now) {
  if (!s.hasPushToken) return true
  if (isQuiet(now, s.tzOffsetMinutes)) return true
  if (s.sentThisWeek >= MAX_PER_WEEK) return true
  if (daysSince(s.lastNudgeAt, now) * 24 < MIN_HOURS_BETWEEN) return true
  // Someone using the app today does not need pulling back into it.
  return daysSince(s.lastActiveAt, now) < 1
}

const reconnectBrief = (person) =>
  `The ONLY facts you have: they mentioned ${person.name}` +
  (person.relationship ? ` (their ${person.relationship})` : '') +
  ' to you once, and have not mentioned them since.' +
  (person.context ? ` They said: "${person.context}".` : '') +
  ` You have no news about ${person.name} and nothing has happened. ` +
  `Say ${person.name}'s name and leave the door open. Do not tell them to do anything.`

const gapBrief = (domain) =>
  `In everything they have told you, they have never once mentioned ${DOMAIN_ANGLE[domain] || domain}. ` +
  'Ask about exactly that, the way a friend wonders aloud. One concrete question. ' +
  'You have no facts about this area at all, so do not imply you know anything about it.'

const returnBrief = (days, recent) =>
  `It has been ${days} days since they last spoke to you.` +
  (recent
    ? ` The last thing they told you, and the ONLY thing you may refer to: "${recent}". ` +
      'Follow up on that exact thing. Nothing has happened since and you have no news.'
    : ' You have nothing specific to go on, so keep it very short and do not pretend otherwise.')

/**
 * Decide whether to reach out, and what about. Returns null to stay quiet.
 *
 * Order matters: a specific person beats a generic gap, and a gap beats
 * "haven't seen you in a while", which is the weakest thing we can say and so
 * is reserved for when there is genuinely nothing better.
 */
export function pickNudge(state, now = Date.now()) {
  const s = {
    profile: {}, lastNudgeAt: null, sentThisWeek: 0,
    lastActiveAt: null, tzOffsetMinutes: 0, hasPushToken: true,
    ...(state || {}),
  }
  if (blocked(s, now)) return null

  const memories = s.profile.memories ?? []
  // Nothing to draw on. Reaching out to someone Soma has never spoken to
  // properly can only produce filler.
  if (memories.length < 3) return null

  const person = driftingPerson(s.profile.circle, now)
  if (person) return { kind: 'reconnect', person: person.name, brief: reconnectBrief(person) }

  const [domain] = emptyDomains(memories)
  if (domain) return { kind: 'gap', domain, brief: gapBrief(domain) }

  const away = daysSince(s.lastActiveAt, now)
  if (away >= AWAY_DAYS) {
    return { kind: 'return', brief: returnBrief(Math.floor(away), memories[0]?.content) }
  }
  return null
}
