/**
 * When to stop recording on its own.
 *
 * The browser ends speech recognition by itself: `SpeechRecognition` fires
 * `onend` once you stop talking. expo-audio does not — it records until
 * something stops it, and the only thing that did was a second tap on a button
 * whose job was never explained.
 *
 * The first version of this compared the level against a fixed -40 dBFS. That
 * assumes a phone whose microphone reports speech above that line, and when it
 * does not, nothing is ever heard, the stop never arms, and the recording runs
 * until a tap — which is the same complaint the auto-stop was added to fix.
 * Microphones, rooms and distances differ too much for one number.
 *
 * So it calibrates instead. The quietest reading so far is the room; speech is
 * what rises clearly above it. The absolute floor stays only as a backstop
 * against a device whose "quiet" is already loud.
 *
 * And a device that reports no level at all still has to stop, or the feature
 * is broken exactly where it cannot be detected: after a while with no metering
 * to go on, it ends on duration alone.
 */

/**
 * How far below the loudest sound so far still counts as speech, in dB.
 *
 * Calibrating against the loudest rather than the quietest matters: the
 * quietest reading of a recording that is all speech is the speech itself, so
 * a floor-relative rule decides the talking is silence the moment it steadies.
 */
export const SPEECH_DROP_DB = 15

/**
 * Nothing below this is speech, however the room measures. Without it, a
 * recording of pure silence calibrates to itself and hears talking in the
 * noise.
 */
export const SPEECH_FLOOR_DB = -45

/** How long it must stay quiet before stopping. People pause mid-thought. */
export const SILENCE_HOLD_MS = 2500

/** Nobody means to record for a minute. A runaway recorder stops here. */
export const MAX_RECORDING_MS = 60_000

/** Silence cannot end anything before this; the first moments are always quiet. */
export const MIN_RECORDING_MS = 1_200

/**
 * With no metering at all there is nothing to detect silence with, so the
 * recording ends on length alone. Long enough for a real answer, short enough
 * that the person is not left holding a phone that never responds.
 */
export const NO_METERING_STOP_MS = 15_000

export type SilenceState = {
  /** Has anything clearly above the room's floor been heard? */
  heardSound: boolean
  /** How long it has been quiet, in ms. */
  silentForMs: number
  /** Total recording length so far, in ms. */
  durationMs: number
  /** The loudest level seen, which stands in for the speaking voice. */
  peakDb: number | null
  /** How many numeric readings arrived — zero means this device does not meter. */
  meteredSamples: number
}

export const emptySilenceState = (): SilenceState => ({
  heardSound: false,
  silentForMs: 0,
  durationMs: 0,
  peakDb: null,
  meteredSamples: 0,
})

/** Is this reading someone talking, given the loudest heard so far? */
export function isSpeech(metering: number, peakDb: number | null): boolean {
  if (metering < SPEECH_FLOOR_DB) return false
  if (peakDb === null) return true
  return metering > peakDb - SPEECH_DROP_DB
}

/**
 * Fold one metering reading into the running state.
 *
 * An absent level is not silence. Treating it as silence would stop every
 * recording after the hold time on any device that does not meter, cutting
 * people off mid-sentence — so absent readings only advance the clock.
 */
export function observeLevel(
  state: SilenceState,
  metering: number | undefined,
  elapsedMs: number,
): SilenceState {
  const durationMs = state.durationMs + elapsedMs
  if (typeof metering !== 'number' || Number.isNaN(metering)) {
    return { ...state, durationMs }
  }
  const meteredSamples = state.meteredSamples + 1
  // Judged against the peak as it stood before this reading, so the first loud
  // sample is not compared against itself and dismissed.
  const speaking = isSpeech(metering, state.peakDb)
  const peakDb = state.peakDb === null ? metering : Math.max(state.peakDb, metering)
  if (speaking) {
    return { heardSound: true, silentForMs: 0, durationMs, peakDb, meteredSamples }
  }
  return { ...state, silentForMs: state.silentForMs + elapsedMs, durationMs, peakDb, meteredSamples }
}

/** Should the recorder stop now? */
export function shouldAutoStop(state: SilenceState): boolean {
  if (state.durationMs >= MAX_RECORDING_MS) return true
  if (state.durationMs < MIN_RECORDING_MS) return false
  // Nothing to listen to the room with: end on length, so the recording still
  // stops without a tap.
  if (state.meteredSamples === 0) return state.durationMs >= NO_METERING_STOP_MS
  // Only once something was actually said. Someone who taps and thinks for four
  // seconds before speaking keeps their recording.
  if (!state.heardSound) return false
  return state.silentForMs >= SILENCE_HOLD_MS
}

/** For the log line when a recording ends itself. */
export function stopReason(state: SilenceState): string {
  if (state.durationMs >= MAX_RECORDING_MS) return 'maximum length'
  if (state.meteredSamples === 0) return 'no metering on this device, stopped on length'
  return `silence after speech (peak ${state.peakDb?.toFixed(0)}dB)`
}
