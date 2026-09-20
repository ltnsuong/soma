import { describe, it, expect } from 'vitest'
import {
  scoreFit, overlap, attachmentFit, loveFit, proximity, sharedStruggles,
  shows, VISIBLE_FIELDS, BIO_BRIEF, type ConnectionType, type Side,
} from './scoring'

const side = (over: Partial<Side> = {}): Side =>
  ({ interests: [], values: [], ...over })

const TYPES: ConnectionType[] = ['dating', 'friends', 'professional', 'support']

describe('the four types are actually different', () => {
  it('scores the same pair differently depending on what is being asked', () => {
    // Same two people. A good romantic match is not automatically a good
    // work contact, and the scores should say so.
    const me = side({
      interests: ['painting'], values: ['honesty'], work: 'Nurse',
      attachment: 'Secure', loveLanguage: 'Acts of Service', distanceKm: 3,
    })
    const them = side({
      interests: ['painting'], values: ['honesty'], work: 'Nurse',
      attachment: 'Secure', loveLanguage: 'Acts of Service', distanceKm: 3,
    })
    const scores = TYPES.map(t => scoreFit(t, me, them).score)
    expect(new Set(scores).size).toBeGreaterThan(1)
  })

  it('never returns a score outside the readable band', () => {
    for (const t of TYPES) {
      const { score } = scoreFit(t, side(), side())
      expect(score).toBeGreaterThanOrEqual(40)
      expect(score).toBeLessThanOrEqual(98)
    }
  })

  it('always gives a reason a person could read', () => {
    const me = side({ interests: ['running'], values: ['family'], work: 'Nurse', distanceKm: 2 })
    const them = side({ interests: ['running'], values: ['family'], work: 'Teacher', distanceKm: 2 })
    for (const t of TYPES) expect(scoreFit(t, me, them).reasons.length).toBeGreaterThan(0)
  })
})

describe('professional rewards difference, not sameness', () => {
  // Granovetter: the useful contact is the one outside your own circle.
  const base = { interests: ['cycling'], values: ['craft'] }
  const me = side({ ...base, work: 'Nurse' })

  it('ranks a different field above the same field', () => {
    const sameField = scoreFit('professional', me, side({ ...base, work: 'Nurse' })).score
    const otherField = scoreFit('professional', me, side({ ...base, work: 'Architect' })).score
    expect(otherField).toBeGreaterThan(sameField)
  })

  it('says why the different field is the point', () => {
    const { reasons } = scoreFit('professional', me, side({ ...base, work: 'Architect' }))
    expect(reasons.join(' ')).toContain('Architect')
  })
})

describe('support wants the same struggle at a different stage', () => {
  const me = side({ wellbeing: { health: 25, career: 80 } })

  it('prefers someone a little further along over someone equally stuck', () => {
    const further = scoreFit('support', me, side({ wellbeing: { health: 50 } })).score
    const equallyStuck = scoreFit('support', me, side({ wellbeing: { health: 25 } })).score
    // Level pegging at the bottom is co-rumination, and scores lower on purpose.
    expect(further).toBeGreaterThan(equallyStuck)
  })

  it('names the shared ground', () => {
    expect(scoreFit('support', me, side({ wellbeing: { health: 45 } })).reasons.join(' '))
      .toContain('health')
  })

  it('finds no shared ground with someone doing fine everywhere', () => {
    expect(sharedStruggles(me, side({ wellbeing: { health: 95 } }))).toEqual([])
  })

  it('ignores areas the user is doing fine in', () => {
    // career is 80 for me, so it is not a struggle to share.
    expect(sharedStruggles(me, side({ wellbeing: { career: 20 } }))).toEqual([])
  })
})

describe('friends weight proximity, dating does not', () => {
  const near = side({ interests: ['climbing'], values: [], distanceKm: 2 })
  const far = side({ interests: ['climbing'], values: [], distanceKm: 800 })
  const me = side({ interests: ['climbing'], values: [] })

  it('drops a distant friend well below a local one', () => {
    const gap = scoreFit('friends', me, near).score - scoreFit('friends', me, far).score
    expect(gap).toBeGreaterThan(8)
  })

  it('barely moves a dating score on distance alone', () => {
    const gap = scoreFit('dating', me, near).score - scoreFit('dating', me, far).score
    expect(gap).toBeLessThanOrEqual(2)
  })
})

describe('dating puts values above hobbies', () => {
  const me = side({ interests: ['chess'], values: ['honesty', 'family'] })

  it('scores shared values higher than shared hobbies', () => {
    const sharedValues = scoreFit('dating', me, side({ interests: [], values: ['honesty', 'family'] })).score
    const sharedHobbies = scoreFit('dating', me, side({ interests: ['chess'], values: [] })).score
    expect(sharedValues).toBeGreaterThan(sharedHobbies)
  })

  it('warns on an anxious + avoidant pairing instead of hiding it', () => {
    const { reasons } = scoreFit('dating',
      side({ interests: [], values: [], attachment: 'Anxious' }),
      side({ interests: [], values: [], attachment: 'Avoidant' }))
    expect(reasons.join(' ').toLowerCase()).toContain('slowly')
  })
})

describe('what each type is allowed to show', () => {
  it('shows attachment and love language ONLY for dating', () => {
    for (const t of TYPES) {
      const romantic = t === 'dating'
      expect(shows(t, 'attachment')).toBe(romantic)
      expect(shows(t, 'loveLanguage')).toBe(romantic)
    }
  })

  it('hides age where it only invites bias', () => {
    expect(shows('professional', 'age')).toBe(false)
    expect(shows('support', 'age')).toBe(false)
    expect(shows('dating', 'age')).toBe(true)
  })

  it('keeps work out of a support profile and feelings out of a work one', () => {
    expect(shows('support', 'work')).toBe(false)
    expect(shows('professional', 'workingOn')).toBe(false)
  })

  it('gives every type a field list and a bio brief', () => {
    for (const t of TYPES) {
      expect(VISIBLE_FIELDS[t].length).toBeGreaterThan(0)
      expect(BIO_BRIEF[t].length).toBeGreaterThan(0)
    }
  })

  it('never writes the same bio brief twice', () => {
    expect(new Set(Object.values(BIO_BRIEF)).size).toBe(TYPES.length)
  })
})

describe('the shared helpers', () => {
  it('matches interests case-insensitively', () => {
    expect(overlap(['Painting'], ['painting']).shared).toEqual(['Painting'])
  })

  it('rates secure pairs highest and anxious+avoidant lowest', () => {
    expect(attachmentFit('Secure', 'Secure')).toBeGreaterThan(attachmentFit('Anxious', 'Avoidant'))
  })

  it('falls back to neutral when a style is unknown', () => {
    expect(attachmentFit(undefined, 'Secure')).toBe(0.72)
    expect(loveFit('Quality Time', undefined)).toBe(0.7)
  })

  it('decays proximity with distance', () => {
    expect(proximity(2)).toBeGreaterThan(proximity(50))
    expect(proximity(50)).toBeGreaterThan(proximity(900))
  })
})
