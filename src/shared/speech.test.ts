import { describe, it, expect } from 'vitest'
import { isEngineFailure, isPermanentFailure } from './speech'

describe('the failure a Russian speaker actually hit', () => {
  // Safari exposes webkitSpeechRecognition and then cannot do ru-RU. The old
  // code only fell back when the engine was absent, so this case produced a mic
  // that listened, returned nothing, and said nothing.
  it('falls back when the engine cannot do the language', () => {
    expect(isEngineFailure('language-not-supported')).toBe(true)
  })

  it('remembers that one, because it will not fix itself', () => {
    expect(isPermanentFailure('language-not-supported')).toBe(true)
  })
})

describe('engine problems worth switching for', () => {
  it('falls back when the platform refuses the service', () => {
    expect(isEngineFailure('service-not-allowed')).toBe(true)
    expect(isPermanentFailure('service-not-allowed')).toBe(true)
  })

  it('falls back when the cloud engine is unreachable', () => {
    expect(isEngineFailure('network')).toBe(true)
  })

  it('does not remember a network blip — it may clear', () => {
    expect(isPermanentFailure('network')).toBe(false)
  })

  it('falls back when the microphone could not be opened', () => {
    expect(isEngineFailure('audio-capture')).toBe(true)
  })
})

describe('outcomes that are about the person, not the engine', () => {
  it('never switches engines because somebody stayed quiet', () => {
    expect(isEngineFailure('no-speech')).toBe(false)
    expect(isPermanentFailure('no-speech')).toBe(false)
  })

  it('never switches engines because they stopped it themselves', () => {
    expect(isEngineFailure('aborted')).toBe(false)
  })

  it('does not switch on a permission refusal', () => {
    // 'not-allowed' is the user declining the mic prompt. Recording for Whisper
    // needs the same permission, so falling back would just fail again.
    expect(isEngineFailure('not-allowed')).toBe(false)
  })
})

describe('malformed input never switches by accident', () => {
  it('ignores anything that is not a known error string', () => {
    for (const bad of [undefined, null, '', 0, {}, [], 'something-new', true]) {
      expect(isEngineFailure(bad)).toBe(false)
      expect(isPermanentFailure(bad)).toBe(false)
    }
  })
})
