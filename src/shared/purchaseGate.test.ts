import { describe, it, expect } from 'vitest'
import { grantsPremium } from './purchaseGate'

describe('granting SOMA+', () => {
  it('grants it when the store charged them', () => {
    expect(grantsPremium({ kind: 'purchased' }, false)).toBe(true)
    expect(grantsPremium({ kind: 'purchased' }, true)).toBe(true)
  })

  it('does not grant it when the store refused', () => {
    expect(grantsPremium({ kind: 'refused' }, false)).toBe(false)
  })

  it('does not grant it in a dev client when the store refused', () => {
    // A refusal is an answer. Only the absence of one is special.
    expect(grantsPremium({ kind: 'refused' }, true)).toBe(false)
  })
})

describe('a sale we could not make is never a sale', () => {
  // This block is the point of the module. A release build with no
  // EXPO_PUBLIC_RC_IOS_KEY has no package to buy, and the old code treated
  // that as a completed purchase — permanent premium, no payment, for anyone
  // who tapped the button. Do not relax these to make a refactor pass.
  it('never grants it in a release build with no store configured', () => {
    expect(grantsPremium({ kind: 'unavailable' }, false)).toBe(false)
  })

  it('still allows a dev client to walk the flow', () => {
    expect(grantsPremium({ kind: 'unavailable' }, true)).toBe(true)
  })
})
