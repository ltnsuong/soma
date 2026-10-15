import { describe, it, expect } from 'vitest'
import {
  observeLevel, shouldAutoStop, emptySilenceState,
  SILENCE_HOLD_MS, MAX_RECORDING_MS, MIN_RECORDING_MS, SILENCE_DB,
} from './silence'

const TICK = 250

/** Feed a constant level for `ms` and return the resulting state. */
function feed(level: number | undefined, ms: number, from = emptySilenceState()) {
  let s = from
  for (let t = 0; t < ms; t += TICK) s = observeLevel(s, level, TICK)
  return s
}

const SPEECH = SILENCE_DB + 10
const QUIET = SILENCE_DB - 10

describe('stopping once someone has finished speaking', () => {
  it('stops after the hold time of silence following speech', () => {
    let s = feed(SPEECH, 2000)
    expect(shouldAutoStop(s)).toBe(false)
    s = feed(QUIET, SILENCE_HOLD_MS, s)
    expect(shouldAutoStop(s)).toBe(true)
  })

  it('does not stop on a pause shorter than the hold time', () => {
    let s = feed(SPEECH, 2000)
    s = feed(QUIET, SILENCE_HOLD_MS - TICK * 2, s)
    expect(shouldAutoStop(s)).toBe(false)
  })

  it('a pause followed by more speech does not stop it', () => {
    let s = feed(SPEECH, 2000)
    s = feed(QUIET, SILENCE_HOLD_MS - TICK * 2, s)
    s = feed(SPEECH, TICK, s)
    expect(s.silentForMs).toBe(0)
    expect(shouldAutoStop(s)).toBe(false)
  })
})

describe('never cutting someone off before they start', () => {
  // The recording is all we get on this path — there is no partial transcript
  // to fall back on — so stopping early loses the whole answer.
  it('does not stop during the opening moments, however quiet', () => {
    const s = feed(QUIET, MIN_RECORDING_MS - TICK)
    expect(shouldAutoStop(s)).toBe(false)
  })

  it('does not stop on silence alone when nothing was ever said', () => {
    const s = feed(QUIET, SILENCE_HOLD_MS * 3)
    expect(s.heardSound).toBe(false)
    expect(shouldAutoStop(s)).toBe(false)
  })

  it('keeps the recording of someone who thinks first and then speaks', () => {
    let s = feed(QUIET, 6000)
    expect(shouldAutoStop(s)).toBe(false)
    s = feed(SPEECH, 1000, s)
    expect(shouldAutoStop(s)).toBe(false)
  })
})

describe('a recorder that would otherwise run forever', () => {
  it('stops at the maximum duration even in unbroken speech', () => {
    const s = feed(SPEECH, MAX_RECORDING_MS)
    expect(shouldAutoStop(s)).toBe(true)
  })

  it('stops at the maximum duration even with no metering at all', () => {
    const s = feed(undefined, MAX_RECORDING_MS)
    expect(shouldAutoStop(s)).toBe(true)
  })
})

describe('a device that does not report levels', () => {
  // Absent metering is not silence. Reading it as silence would stop every
  // recording on such a device after the hold time, which is the same
  // invisible failure in the other direction.
  it('never stops on silence when no level is reported', () => {
    const s = feed(undefined, MAX_RECORDING_MS - TICK)
    expect(s.silentForMs).toBe(0)
    expect(shouldAutoStop(s)).toBe(false)
  })

  it('treats NaN the same as absent', () => {
    const s = feed(NaN, SILENCE_HOLD_MS * 2)
    expect(s.silentForMs).toBe(0)
  })
})
