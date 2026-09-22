// The First Conversation — see docs/onboarding-interview.md for the reasoning.
//
// Three acts: you, your people, what's missing. The user never sees a question
// count, because a counter turns a conversation into a form.
//
// Pure data and pure functions only. Nothing here imports App.tsx — that would
// make a cycle the moment App.tsx imports this.
import { DOMAINS, type DomainKey } from '../../shared/domains'

export interface Beat {
  id: string
  act: 1 | 2 | 3
  /** Said before the question, on its own. Soma discloses first: people match
   *  the depth they are given, and this is the highest-leverage rule we have. */
  opener?: string
  ask: string
  /** At most one follow-up per thread. Two reads as an interrogation. */
  followUp?: string
  /** Domains this beat is expected to fill. Used to decide what to skip. */
  covers: DomainKey[]
  /** Plain facts this beat asks for outright rather than inferring. */
  facts?: FactKey[]
  /** A short answer is a COMPLETE answer here, so never probe for more.
   *  Asking "what should I call you?" and replying "that's brief, tell me more"
   *  is the single most obviously robotic thing this could do. */
  terse?: boolean
}

export const OPENING =
  "I'm Soma. I'll be straight with you — I'm not much use until I actually know you, " +
  "so this first bit is me getting to know you rather than a form. Skip anything you " +
  "don't feel like answering. I mean that."

export const BEATS: Beat[] = [
  // ── ACT I — You ──────────────────────────────────────────
  {
    // Before anything else. Soma uses the name from here on, and a companion
    // that never learned what to call you reads as a form no matter how warm
    // its questions are.
    id: 'name',
    act: 1,
    ask: 'First though — what should I call you?',
    covers: [],
    facts: ['name'],
    terse: true,
  },
  {
    id: 'why',
    act: 1,
    ask: 'What made you download this? Even if the answer\'s just "curious".',
    followUp: 'Was something specific going on, or more of a general itch?',
    covers: ['purpose'],
  },
  {
    // The highest-yield question in the set. One answer usually touches work,
    // health, home, fun and mood at once — concrete recall, nothing to perform.
    id: 'yesterday',
    act: 1,
    ask: 'Walk me through yesterday. Not the highlights — the actual shape of it.',
    followUp: 'Which part of that was actually yours? The bit where nobody needed anything.',
    covers: ['career', 'health', 'environment', 'hobby', 'mind'],
  },
  {
    // Age and height ride along here, exactly as the old ob_q1 did it. In a body
    // frame height reads as health; on a form next to "looking for" it reads as a
    // dating profile. That is the whole reason there is no separate basics step.
    id: 'body',
    act: 1,
    ask: "How's your body treating you lately? And the boring bits while I'm asking — " +
      'how old are you, how tall, that kind of thing.',
    followUp: 'Is that normal for you, or is this a rough patch?',
    covers: ['health', 'mind'],
    facts: ['age', 'heightCm'],
  },
  {
    id: 'work',
    act: 1,
    ask: 'What do you actually do? And what does that look like day to day?',
    covers: ['career'],
    facts: ['job'],
  },
  {
    // "Just for you" is doing the work — it separates real interests from
    // obligations. "What are your hobbies?" returns a list of nouns.
    id: 'hobbies',
    act: 1,
    ask: 'And what do you do that\'s just for you?',
    covers: ['hobby'],
    facts: ['hobbies'],
  },
  {
    id: 'ahead',
    act: 1,
    ask: 'What are you trying to get better at at the moment?',
    followUp: 'If the next year went well, what would be different?',
    covers: ['growth', 'purpose'],
  },
  {
    // Asked plainly. Euphemism about money reads as embarrassment, which is
    // contagious — and this is the domain people skip first.
    id: 'money',
    act: 1,
    ask: 'Is money a stress right now, or is that handled?',
    covers: ['finance'],
  },

  // ── ACT II — Your people ─────────────────────────────────
  {
    id: 'who',
    act: 2,
    opener: 'Lives tend to make sense to me once I know who\'s in them.',
    ask: 'Who did you talk to most this week?',
    followUp: 'What are they to you?',
    covers: ['relationship', 'family'],
  },
  {
    // The most important question in Act II. It surfaces the drifting
    // relationship the Circle exists to repair — a bid for connection, in
    // Gottman's sense. Most people have never been asked it.
    id: 'missed',
    act: 2,
    ask: 'And who do you wish you\'d talked to?',
    covers: ['relationship', 'family'],
  },
  {
    // Deliberately not romance-coded: the answer can be a friend, a parent, a
    // colleague. Yields how someone receives care from a story, which beats
    // asking them to pick a love language off a list — and works for someone
    // who isn't dating at all.
    id: 'understood',
    act: 2,
    ask: 'Think of a time you felt really understood by someone. What were they actually doing?',
    covers: ['relationship'],
  },

  // ── ACT III — What's missing (one question, lightly) ─────
  {
    id: 'missing',
    act: 3,
    ask: 'Is there a kind of connection you\'re missing right now? Could be a friend, ' +
      'could be someone who gets a particular part of your life, could be more than that. ' +
      "Or nothing — that's a real answer too.",
    covers: [],
  },
]

/**
 * Domains we want covered before the conversation can end early.
 *
 * Five, not seven. Soma needs enough to derive a profile worth showing, not a
 * complete life audit before the user has agreed to anything. The other five
 * domains fill in through ordinary use, which is the product's whole premise —
 * asking for all of them up front contradicts it and made the first
 * conversation feel like a questionnaire, which is exactly what it exists to
 * replace.
 */
export const TARGET_DOMAINS = 5
/**
 * Hard ceiling. Someone who gives short answers still gets out in time.
 *
 * Eight, not twelve. Twelve exchanges with a stranger before you have an
 * account is a lot to ask, and the last few added the least: by then the rich
 * beats have already been asked and what remains is the filling-in.
 */
export const MAX_EXCHANGES = 8

/**
 * Facts that only a direct question will ever produce.
 *
 * Everything else a beat asks for — a job title, hobbies — surfaces on its own
 * when someone describes their life, so those must not keep a beat alive after
 * its subject has already been covered.
 */
export const ASK_ONLY_FACTS: FactKey[] = ['name', 'age', 'heightCm']

export type FactKey = 'name' | 'age' | 'heightCm' | 'city' | 'job' | 'hobbies'

export interface Progress {
  /** Domains that already hold at least one memory. */
  covered: DomainKey[]
  /** Facts we already have. A beat that only asks for known facts is skipped. */
  knownFacts?: FactKey[]
  /** User replies so far. */
  exchanges: number
  /** Beat ids already asked. */
  asked: string[]
}

export const coveredDomains = (memories: { domain: DomainKey }[]): DomainKey[] => {
  const seen = new Set<DomainKey>()
  for (const m of memories) if (DOMAINS.some(d => d.key === m.domain)) seen.add(m.domain)
  return [...seen]
}

/**
 * Adaptive stop. Someone who talks a lot finishes SOONER, not later — the
 * conversation exists to fill the wheel, so a full wheel means it is done.
 * Act III is always offered, because connection intent is the one thing no
 * amount of talking about yesterday will reveal.
 */
export const isDone = (p: Progress): boolean => {
  if (!p.asked.includes('missing')) return false
  return p.covered.length >= TARGET_DOMAINS || p.exchanges >= MAX_EXCHANGES
}

/**
 * The next thing to ask. Beats whose domains are already covered get skipped,
 * so a rich answer to "walk me through yesterday" can retire three later
 * questions — that is what stops this feeling like a form.
 */
export const nextBeat = (p: Progress): Beat | null => {
  const covered = new Set(p.covered)
  const remaining = BEATS.filter(b => !p.asked.includes(b.id))

  // Out of room: go straight to the one question nothing else can answer.
  if (p.exchanges >= MAX_EXCHANGES - 1) {
    return remaining.find(b => b.id === 'missing') ?? null
  }

  // A beat earns its place by reaching a domain nothing has filled yet, or by
  // carrying a fact that talking will never reveal.
  //
  // The distinction matters. 'work' wants a job title and 'hobbies' wants
  // hobbies, but both come out naturally when someone describes their day — so
  // asking anyway produced "what do you actually do?" to someone who had just
  // said they worked on a pitch deck until eight. That is the form-filling this
  // conversation exists to avoid. Name, age and height are different: no amount
  // of talking reveals them, so a beat carrying one is still worth asking even
  // when its domains are covered.
  const known = new Set(p.knownFacts ?? [])
  const worthAsking = remaining.find(b =>
    b.act === 3
    || b.covers.some(d => !covered.has(d))
    || b.facts?.some(f => ASK_ONLY_FACTS.includes(f) && !known.has(f))
  )
  // Nothing new left to reach: go to the closing question rather than walking
  // the rest of the list. Falling through to remaining[0] asked whatever came
  // next in the array, which is how a conversation with nothing left to learn
  // still ran to the exchange ceiling.
  return worthAsking ?? remaining.find(b => b.act === 3) ?? remaining[0] ?? null
}
