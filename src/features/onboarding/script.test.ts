import { describe, it, expect } from 'vitest'
import {
  BEATS, MAX_EXCHANGES, TARGET_DOMAINS,
  coveredDomains, isDone, nextBeat, type Progress,
} from './script'
import type { DomainKey } from '../../shared/domains'
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
  const sevenDomains: DomainKey[] = ['health', 'career', 'finance', 'relationship', 'family', 'growth', 'hobby']

  it('is not done before the act III question, however much was covered', () => {
    // Connection intent is the one thing talking about yesterday never reveals.
    expect(isDone(progress({ covered: sevenDomains, exchanges: 20 }))).toBe(false)
  })

  it('is done once enough domains are filled and act III was asked', () => {
    expect(isDone(progress({ covered: sevenDomains, asked: ['missing'] }))).toBe(true)
    expect(sevenDomains.length).toBe(TARGET_DOMAINS)
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
