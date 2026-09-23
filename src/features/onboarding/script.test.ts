import { describe, it, expect } from 'vitest'
import {
  BEATS, MAX_EXCHANGES, TARGET_DOMAINS,
  coveredDomains, isDone, isEcho, nextBeat, type Progress,
} from './script'
import { DOMAINS, type DomainKey } from '../../shared/domains'
import type { FactKey } from './script'

const progress = (over: Partial<Progress> = {}): Progress =>
  ({ covered: [], exchanges: 0, asked: [], ...over })

describe('the script itself', () => {
  it('has unique beat ids', () => {
    const ids = BEATS.map(b => b.id)
    expect(new Set(ids).size).toBe(ids.length)
  })

  it('runs in act order, so the conversation never jumps back', () => {
    const acts = BEATS.map(b => b.act)
    expect([...acts].sort()).toEqual(acts)
  })

  it('covers every wheel domain across the whole script', () => {
    // If a domain is in no beat, nothing in the first conversation can fill it
    // and the wheel is permanently short a slice.
    const covered = new Set(BEATS.flatMap(b => b.covers))
    const missing = (['health', 'career', 'finance', 'relationship', 'family',
      'growth', 'hobby', 'purpose', 'mind', 'environment'] as DomainKey[])
      .filter(d => !covered.has(d))
    expect(missing).toEqual([])
  })

  it('asks at most one follow-up per beat', () => {
    // Two follow-ups reads as an interrogation. The type enforces one; this
    // guards the intent if the shape ever changes.
    for (const b of BEATS) expect(typeof (b.followUp ?? '')).toBe('string')
  })

  it('never asks for an interpretation as a fact', () => {
    const asked = BEATS.flatMap(b => b.facts ?? [])
    for (const forbidden of ['loveLanguage', 'attachment', 'values']) {
      expect(asked).not.toContain(forbidden)
    }
  })
})

describe('nextBeat', () => {
  it('opens by asking what to call them', () => {
    // A companion that never learned your name reads as a form.
    expect(nextBeat(progress())?.id).toBe('name')
  })

  it('moves to why they are here once it knows the name', () => {
    expect(nextBeat(progress({ asked: ['name'], knownFacts: ['name'] }))?.id).toBe('why')
  })

  it('marks the name beat terse, so a one-word answer is never probed', () => {
    expect(BEATS.find(b => b.id === 'name')?.terse).toBe(true)
  })

  it('skips a beat whose domains are already covered', () => {
    // A rich answer to "walk me through yesterday" should retire later questions.
    const p = progress({ asked: ['name', 'why'], knownFacts: ['name'], covered: ['purpose', 'career', 'health', 'environment', 'hobby', 'mind'] })
    expect(nextBeat(p)?.id).not.toBe('yesterday')
  })

  it('still asks a beat that carries facts, even when its domains are covered', () => {
    // Age and height are asked outright; no amount of talking reveals them.
    const p = progress({ asked: ['name', 'why', 'yesterday'], knownFacts: ['name'], covered: ['health', 'mind'] })
    expect(nextBeat(p)?.id).toBe('body')
  })

  it('does not ask about work again just because no job title was extracted', () => {
    // Someone described a pitch deck and a workday; career is covered. Asking
    // "what do you actually do?" anyway is the form-filling this exists to
    // avoid, and a job title is not worth a whole question when the extractor
    // can take it from what they already said.
    const p = progress({ asked: ['name', 'why', 'yesterday'], knownFacts: ['name'], covered: ['career'] })
    expect(nextBeat(p)?.id).not.toBe('work')
  })

  it('still asks for age and height, which talking never reveals', () => {
    const p = progress({ asked: ['name', 'why', 'yesterday'], knownFacts: ['name'], covered: ['health', 'mind'] })
    expect(nextBeat(p)?.id).toBe('body')
  })

  it('goes to the closing question when nothing new is left to reach', () => {
    // Used to fall through to whatever came next in the array, which is how a
    // conversation with nothing left to learn still ran to the ceiling.
    const all = DOMAINS.map(d => d.key)
    const p = progress({
      asked: ['name', 'why', 'yesterday', 'body'],
      knownFacts: ['name', 'age', 'heightCm'],
      covered: all,
    })
    expect(nextBeat(p)?.act).toBe(3)
  })

  it('skips a fact beat once every fact it asks for is known', () => {
    // Someone who mentioned cooking while describing yesterday should not then
    // be asked what they do for fun.
    const p = progress({ asked: ['name', 'why', 'yesterday'], covered: ['hobby'], knownFacts: ['name', 'hobbies'] })
    expect(nextBeat(p)?.id).not.toBe('hobbies')
  })

  it('still asks when only some of its facts are known', () => {
    const p = progress({ asked: ['name', 'why', 'yesterday'], covered: ['health', 'mind'], knownFacts: ['name', 'age'] })
    expect(nextBeat(p)?.id).toBe('body')   // height still missing
  })

  it('goes straight to the act III question when out of room', () => {
    const p = progress({ asked: ['name', 'why'], exchanges: MAX_EXCHANGES - 1 })
    expect(nextBeat(p)?.id).toBe('missing')
  })

  it('returns null once every beat is asked', () => {
    expect(nextBeat(progress({ asked: BEATS.map(b => b.id) }))).toBeNull()
  })
})

// The mapping App.tsx uses to turn a stored facts object into Progress.knownFacts.
// Kept here so the join between what the app saves and what the script reads is
// covered — the unit logic and the wiring can drift apart silently otherwise.
const knownFactsOf = (f: Record<string, unknown>) =>
  (['age', 'heightCm', 'city', 'job'] as FactKey[]).filter(k => f[k] !== undefined)
    .concat(Array.isArray(f.hobbies) && f.hobbies.length ? ['hobbies' as FactKey] : [])

describe('stored facts drive the skip', () => {
  // Exactly what the running app saved after three real answers.
  const stored = { hobbies: ['cooking', 'watching TV'], age: 32, heightCm: 178 }

  it('maps a stored profile to the right known facts', () => {
    expect([...knownFactsOf(stored)].sort()).toEqual(['age', 'heightCm', 'hobbies'])
  })

  it('never asks what they do for fun once hobbies came up on their own', () => {
    const p = progress({
      covered: ['health', 'hobby', 'career', 'family'],
      knownFacts: [...knownFactsOf(stored), 'name'],
      exchanges: 3,
      asked: ['name', 'why', 'yesterday', 'body', 'work'],
    })
    expect(nextBeat(p)?.id).not.toBe('hobbies')
  })
})

describe('isDone', () => {
  // Derived, not hardcoded: a test that pins the threshold to a literal list
  // breaks the moment the threshold is tuned, which says nothing about whether
  // isDone still works.
  const enoughDomains: DomainKey[] = DOMAINS.map(d => d.key).slice(0, TARGET_DOMAINS)

  it('is not done before the act III question, however much was covered', () => {
    // Connection intent is the one thing talking about yesterday never reveals.
    expect(isDone(progress({ covered: enoughDomains, exchanges: 20 }))).toBe(false)
  })

  it('is done once enough domains are filled and act III was asked', () => {
    expect(isDone(progress({ covered: enoughDomains, asked: ['missing'] }))).toBe(true)
  })

  it('stops at the exchange ceiling even with an empty wheel', () => {
    // Someone giving one-word answers still gets out.
    expect(isDone(progress({ covered: [], exchanges: MAX_EXCHANGES, asked: ['missing'] }))).toBe(true)
  })

  it('keeps going when neither condition is met', () => {
    expect(isDone(progress({ covered: ['health'], exchanges: 3, asked: ['missing'] }))).toBe(false)
  })
})

describe('coveredDomains', () => {
  it('dedupes and ignores anything that is not a real domain', () => {
    const got = coveredDomains([
      { domain: 'health' }, { domain: 'health' },
      { domain: 'career' }, { domain: 'nonsense' as DomainKey },
    ])
    expect([...got].sort()).toEqual(['career', 'health'])
  })
})

describe('not saying the same thing twice', () => {
  // The line Soma actually repeated, two turns apart, in a real onboarding run.
  const SAID = 'Tuesday coffee is a high bar.'

  it('catches the line that actually repeated', () => {
    expect(isEcho(SAID, [
      'That’s a weird kind of quiet.',
      SAID,
    ])).toBe(true)
  })

  it('ignores trailing punctuation, case and spacing', () => {
    const prior = [SAID]
    for (const c of ['tuesday coffee is a high bar', 'Tuesday  coffee is a high bar!', 'TUESDAY COFFEE IS A HIGH BAR...']) {
      expect(isEcho(c, prior)).toBe(true)
    }
  })

  it('lets a genuinely new line through', () => {
    expect(isEcho('So the people you want to talk to are far away.', [
      SAID,
    ])).toBe(false)
  })

  it('does not treat a longer line containing the old one as a repeat', () => {
    // Building on a previous thought is fine; parroting it is not.
    expect(isEcho('Tuesday coffee is a high bar, and worth aiming for.', [
      SAID,
    ])).toBe(false)
  })

  it('is safe on empty input', () => {
    expect(isEcho('', ['anything'])).toBe(false)
    expect(isEcho('   ', ['anything'])).toBe(false)
    expect(isEcho('something', [])).toBe(false)
  })
})
