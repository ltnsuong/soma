import { describe, it, expect } from 'vitest'
import { mergeCloudProfile, type ProfileBlob, type CloudRow } from './mergeProfile'

const row = (over: Partial<CloudRow> = {}): CloudRow => ({
  name: 'App Review',
  language: 'en',
  data: { memories: [{ id: 'm1' }] },
  ...over,
})

describe('what the cloud overwrites', () => {
  it('replaces the content the server owns', () => {
    const local: ProfileBlob = { memories: [], diary: ['stale'] }
    const merged = mergeCloudProfile(row({ data: { memories: [{ id: 'cloud' }] } }), local)
    expect(merged.memories).toEqual([{ id: 'cloud' }])
    expect(merged.diary).toBeUndefined()
  })

  it('always marks the profile registered', () => {
    // The session proves the account exists; a stale cloud row cannot say otherwise.
    expect(mergeCloudProfile(row(), { registered: false }).registered).toBe(true)
  })

  it('prefers the account name, then the cloud blob, then local', () => {
    expect(mergeCloudProfile(row({ name: 'Account' }), { name: 'Local' }).name).toBe('Account')
    expect(mergeCloudProfile(row({ name: null, data: { name: 'Blob' } }), { name: 'Local' }).name).toBe('Blob')
    expect(mergeCloudProfile(row({ name: null, data: {} }), { name: 'Local' }).name).toBe('Local')
  })
})

describe('what the device keeps', () => {
  it('keeps languageChosen, which the server never stores', () => {
    // The bug: spreading the cloud row dropped this, so every launch after
    // signing in went back to the language picker.
    const merged = mergeCloudProfile(row({ data: {} }), { languageChosen: true })
    expect(merged.languageChosen).toBe(true)
  })

  it('treats a returning user with a server language as having chosen one', () => {
    // Fresh install, signs in: no local flag, but they clearly picked before.
    const merged = mergeCloudProfile(row({ language: 'vi' }), {})
    expect(merged.languageChosen).toBe(true)
    expect(merged.language).toBe('vi')
  })

  it('does not invent a choice when neither side has a language', () => {
    const merged = mergeCloudProfile(row({ language: null, data: {} }), {})
    expect(merged.languageChosen).toBe(false)
  })

  it('keeps the local dark-mode preference over the cloud copy', () => {
    expect(mergeCloudProfile(row({ data: { darkMode: true } }), { darkMode: false }).darkMode).toBe(false)
  })

  it('falls back to the cloud value when the device has no preference', () => {
    expect(mergeCloudProfile(row({ data: { darkMode: true } }), {}).darkMode).toBe(true)
  })

  it('keeps a local language when the cloud has none', () => {
    expect(mergeCloudProfile(row({ language: null, data: {} }), { language: 'ja' }).language).toBe('ja')
  })
})

describe('robustness', () => {
  it('survives a row with no data object', () => {
    const merged = mergeCloudProfile({ name: 'X', language: 'en', data: undefined as never }, { name: 'L' })
    expect(merged.registered).toBe(true)
    expect(merged.name).toBe('X')
  })

  it('does not mutate either input', () => {
    const local: ProfileBlob = { languageChosen: true }
    const r = row()
    const before = JSON.stringify({ local, r })
    mergeCloudProfile(r, local)
    expect(JSON.stringify({ local, r })).toBe(before)
  })
})
