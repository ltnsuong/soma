import { describe, it, expect } from 'vitest'
import { micFailureMessage, micFailureLog, reasonOf, type MicStage } from './micError'

const STAGES: MicStage[] = ['permission', 'audio-session', 'prepare', 'record', 'unavailable']

describe('a microphone failure always says something', () => {
  // The bug this module exists for: every one of these failed silently, so the
  // only report possible was "nothing happens". Do not let any stage return an
  // empty or reasonless message.
  it('produces a message for every stage', () => {
    for (const stage of STAGES) {
      const msg = micFailureMessage(stage, new Error('boom'))
      expect(msg.length).toBeGreaterThan(10)
      expect(msg).toContain(stage)
      expect(msg).toContain('boom')
    }
  })

  it('names the stage in the log line too', () => {
    expect(micFailureLog('prepare', new Error('not prepared'))).toBe(
      '[voice] microphone failed at prepare: not prepared',
    )
  })
})

describe('reading a reason out of whatever was thrown', () => {
  it('uses an Error message', () => {
    expect(reasonOf(new Error('denied'))).toBe('denied')
  })

  it('uses a thrown string', () => {
    expect(reasonOf('denied')).toBe('denied')
  })

  it('never returns an empty reason, whatever was thrown', () => {
    for (const thrown of [undefined, null, 0, '', new Error(''), {}, []]) {
      expect(reasonOf(thrown)).toBe('no reason given')
    }
  })

  it('still produces a usable message when nothing was thrown at all', () => {
    expect(micFailureMessage('record', undefined)).toContain('no reason given')
  })
})
