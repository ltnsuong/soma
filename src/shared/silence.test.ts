import { describe, it, expect } from 'vitest'
import {
  observeLevel, shouldAutoStop, emptySilenceState,
  SILENCE_HOLD_MS, MAX_RECORDING_MS, MIN_RECORDING_MS,
  NO_METERING_STOP_MS, SPEECH_FLOOR_DB, SPEECH_DROP_DB, isSpeech,
} from './silence'

const TICK = 250

function feed(level: number | undefined, ms: number, from = emptySilenceState()) {
  let s = from
  for (let t = 0; t < ms; t += TICK) s = observeLevel(s, level, TICK)
  return s
}

/** A quiet room and a voice in it, both well below the old fixed -40 line. */
const QUIET_ROOM = -62
const QUIET_VOICE = -44

describe('calibrating to the device rather than a fixed level', () => {
  // The first version compared against a fixed -40dB. On a phone whose levels
  // run quieter, speech never crossed it, nothing was ever "heard", the stop
  // never armed, and the recording ran until a tap — the exact complaint the
  // auto-stop existed to fix.
  it('hears a quiet voice in a quiet room', () => {
    let s = feed(QUIET_ROOM, 1000)
    s = feed(QUIET_VOICE, 1000, s)
    expect(s.heardSound).toBe(true)
  })

  it('stops after that quiet voice goes quiet again', () => {
    let s = feed(QUIET_ROOM, 1000)
    s = feed(QUIET_VOICE, 1500, s)
    s = feed(QUIET_ROOM, SILENCE_HOLD_MS, s)
    expect(shouldAutoStop(s)).toBe(true)
  })

  it('does not hear speech in an unbroken silent recording', () => {
    // Without the absolute ceiling the floor calibrates to the silence itself
    // and the noise just above it reads as talking.
    const s = feed(-70, 10_000)
    expect(s.heardSound).toBe(false)
    expect(shouldAutoStop(s)).toBe(false)
  })

  it('judges against the loudest heard, with an absolute floor underneath', () => {
    // Quiet enough is never speech, whatever the peak.
    expect(isSpeech(SPEECH_FLOOR_DB - 1, null)).toBe(false)
    // The first audible reading has nothing to compare against, so it counts.
    expect(isSpeech(-30, null)).toBe(true)
    // A steady voice stays speech rather than collapsing onto its own level.
    expect(isSpeech(-20, -20)).toBe(true)
    // Background well below the voice does not.
    expect(isSpeech(-20 - SPEECH_DROP_DB - 1, -20)).toBe(false)
  })
})

describe('stopping once someone has finished speaking', () => {
  it('stops after the hold time of silence following speech', () => {
    let s = feed(-60, 500)
    s = feed(-20, 1500, s)
    expect(shouldAutoStop(s)).toBe(false)
    s = feed(-60, SILENCE_HOLD_MS, s)
    expect(shouldAutoStop(s)).toBe(true)
  })

  it('does not stop on a pause shorter than the hold time', () => {
    let s = feed(-20, 2000)
    s = feed(-60, SILENCE_HOLD_MS - TICK * 2, s)
    expect(shouldAutoStop(s)).toBe(false)
  })

  it('a pause followed by more speech resets the clock', () => {
    let s = feed(-20, 2000)
    s = feed(-60, SILENCE_HOLD_MS - TICK * 2, s)
    s = feed(-20, TICK, s)
    expect(s.silentForMs).toBe(0)
    expect(shouldAutoStop(s)).toBe(false)
  })
})

describe('never cutting someone off before they start', () => {
  it('does not stop during the opening moments', () => {
    const s = feed(-60, MIN_RECORDING_MS - TICK)
    expect(shouldAutoStop(s)).toBe(false)
  })

  it('does not stop on silence alone when nothing was said', () => {
    const s = feed(-60, SILENCE_HOLD_MS * 3)
    expect(s.heardSound).toBe(false)
    expect(shouldAutoStop(s)).toBe(false)
  })

  it('keeps the recording of someone who thinks first and then speaks', () => {
    let s = feed(-60, 6000)
    expect(shouldAutoStop(s)).toBe(false)
    s = feed(-20, 1000, s)
    expect(shouldAutoStop(s)).toBe(false)
  })
})

describe('a device that reports no levels at all', () => {
  // It still has to stop by itself, or the feature is broken precisely where
  // nothing can detect it.
  it('stops on length alone once there is nothing to listen with', () => {
    const s = feed(undefined, NO_METERING_STOP_MS)
    expect(s.meteredSamples).toBe(0)
    expect(shouldAutoStop(s)).toBe(true)
  })

  it('waits for that length rather than stopping early', () => {
    const s = feed(undefined, NO_METERING_STOP_MS - TICK * 2)
    expect(shouldAutoStop(s)).toBe(false)
  })

  it('does not treat an absent level as silence', () => {
    const s = feed(undefined, SILENCE_HOLD_MS * 2)
    expect(s.silentForMs).toBe(0)
  })

  it('treats NaN the same as absent', () => {
    const s = feed(NaN, SILENCE_HOLD_MS * 2)
    expect(s.meteredSamples).toBe(0)
  })
})

describe('a recorder that would otherwise run forever', () => {
  it('stops at the maximum duration even in unbroken speech', () => {
    const s = feed(-15, MAX_RECORDING_MS)
    expect(shouldAutoStop(s)).toBe(true)
  })
})
