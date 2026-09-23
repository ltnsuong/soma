import { describe, it, expect } from 'vitest'
import {
  adultDateFrom, bandOf, bandOfFlag, canSee, allowedConnectionTypes,
  canUseConnectionType, coerceConnectionType,
  ADULT, MINOR, UNKNOWN, ADULT_AGE,
} from './agegate.js'

const on = (iso) => new Date(`${iso}T12:00:00Z`)
const TODAY = on('2026-09-23')

describe('an adult and a child are never shown to each other', () => {
  // The reason this module exists. If any of these ever returns true, the
  // matching engine can introduce a 14-year-old to an adult.
  it('never lets an adult see a minor', () => {
    expect(canSee(ADULT, MINOR)).toBe(false)
  })

  it('never lets a minor see an adult', () => {
    expect(canSee(MINOR, ADULT)).toBe(false)
  })

  it('lets adults see adults', () => {
    expect(canSee(ADULT, ADULT)).toBe(true)
  })

  it('lets minors see minors', () => {
    expect(canSee(MINOR, MINOR)).toBe(true)
  })
})

describe('an unknown age fails closed', () => {
  // The dangerous default is treating unknown as adult so the app keeps
  // working. These pin the opposite.
  it('shows an unknown viewer nobody', () => {
    for (const target of [ADULT, MINOR, UNKNOWN]) {
      expect(canSee(UNKNOWN, target)).toBe(false)
    }
  })

  it('shows an unknown target to nobody', () => {
    for (const viewer of [ADULT, MINOR, UNKNOWN]) {
      expect(canSee(viewer, UNKNOWN)).toBe(false)
    }
  })

  it('treats a missing adult-at date as unknown, not adult', () => {
    for (const bad of [null, undefined, '', 0, 'tomorrow', NaN]) {
      expect(bandOf(bad, TODAY)).toBe(UNKNOWN)
    }
  })

  it('treats a missing minor flag as unknown, not adult', () => {
    for (const bad of [null, undefined]) expect(bandOfFlag(bad)).toBe(UNKNOWN)
  })

  it('gives an unknown band no connection types at all', () => {
    expect(allowedConnectionTypes(UNKNOWN)).toEqual([])
    expect(coerceConnectionType(UNKNOWN, 'friends')).toBe(null)
  })

  it('refuses a band nobody has defined', () => {
    // A future band must be invisible until someone decides what it may see.
    expect(canSee('teen', 'teen')).toBe(false)
    expect(allowedConnectionTypes('teen')).toEqual([])
  })
})

describe('the dating side is closed under 17', () => {
  it('gives a minor friends only', () => {
    expect(allowedConnectionTypes(MINOR)).toEqual(['friends'])
  })

  it('refuses dating for a minor', () => {
    expect(canUseConnectionType(MINOR, 'dating')).toBe(false)
  })

  it('refuses support for a minor', () => {
    // Describing what you are struggling with to a stranger needs a
    // safeguarding process SOMA does not have.
    expect(canUseConnectionType(MINOR, 'support')).toBe(false)
  })

  it('coerces a minor asking for dating back to friends', () => {
    expect(coerceConnectionType(MINOR, 'dating')).toBe('friends')
    expect(coerceConnectionType(MINOR, 'support')).toBe('friends')
  })

  it('leaves an adult with everything', () => {
    for (const t of ['dating', 'friends', 'professional', 'support']) {
      expect(canUseConnectionType(ADULT, t)).toBe(true)
      expect(coerceConnectionType(ADULT, t)).toBe(t)
    }
  })
})

describe('working out when someone turns 17', () => {
  it('adds exactly 17 years', () => {
    expect(adultDateFrom('2010-05-04', TODAY).toISOString().slice(0, 10)).toBe('2027-05-04')
  })

  it('counts someone as a minor the day before their 17th birthday', () => {
    const adultAt = adultDateFrom('2009-09-24', on('2026-09-23'))
    expect(bandOf(adultAt, on('2026-09-23'))).toBe(MINOR)
  })

  it('counts them as an adult on the day itself', () => {
    const adultAt = adultDateFrom('2009-09-23', on('2026-09-23'))
    expect(bandOf(adultAt, on('2026-09-23'))).toBe(ADULT)
  })

  it('ages a minor up on their birthday with no further action', () => {
    // Storing the date rather than a cached band is what makes this automatic.
    const adultAt = adultDateFrom('2010-01-01', on('2026-09-23'))
    expect(bandOf(adultAt, on('2026-12-31'))).toBe(MINOR)
    expect(bandOf(adultAt, on('2027-01-01'))).toBe(ADULT)
  })

  it('handles a 29 February birth date', () => {
    const adultAt = adultDateFrom('2008-02-29', TODAY)
    expect(adultAt).not.toBe(null)
    expect(bandOf(adultAt, on('2025-03-01'))).toBe(ADULT)
  })

  it('uses UTC, so a birthday does not move with the server timezone', () => {
    expect(adultDateFrom('2010-01-01', TODAY).toISOString().slice(0, 10)).toBe('2027-01-01')
  })
})

describe('refusing dates that are not dates', () => {
  it('refuses a birth date in the future', () => {
    expect(adultDateFrom('2030-01-01', TODAY)).toBe(null)
  })

  it('refuses an implausibly old one', () => {
    expect(adultDateFrom('1850-01-01', TODAY)).toBe(null)
  })

  it('refuses nonsense', () => {
    for (const bad of ['', 'yesterday', '2010', 'null', undefined, null, {}]) {
      expect(adultDateFrom(bad, TODAY)).toBe(null)
    }
  })

  it('refuses a date the calendar would roll over', () => {
    // 31 February would otherwise silently become 2 March.
    expect(adultDateFrom('2010-02-31', TODAY)).toBe(null)
  })

  it('a refused date leaves the person unknown, which shows them nobody', () => {
    const adultAt = adultDateFrom('not a date', TODAY)
    expect(bandOf(adultAt, TODAY)).toBe(UNKNOWN)
    expect(canSee(bandOf(adultAt, TODAY), ADULT)).toBe(false)
  })
})

describe('the shipped threshold', () => {
  it('is 17, matching what the app and the store listing say', () => {
    expect(ADULT_AGE).toBe(17)
  })
})
