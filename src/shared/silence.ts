/**
 * When to stop recording on its own.
 *
 * The browser ends speech recognition for you: `SpeechRecognition` fires
 * `onend` once you stop talking, and the result path runs. On a phone there is
 * no such thing — `expo-audio` records until something tells it to stop, and
 * the only thing that did was a second tap on a button whose job was never
 * explained. Tap, speak, wait, and nothing happens, forever. The mic looked
 * broken on iOS while working on the web, and the difference was entirely this.
 *
 * So the phone has to decide for itself. The rules are deliberately cautious in
 * one direction: cutting someone off mid-sentence is worse than a second of
 * extra silence, because the recording is all we get — there is no partial
 * transcript on this path to fall back on.
 */

/**
 * Below this level (dBFS, where 0 is the loudest the microphone can register)
 * counts as silence. Room tone on a phone sits around -50; speech is well
 * above -30 even softly. -40 leaves room for a quiet voice without latching
 * onto background noise.
 */
export const SILENCE_DB = -40

/**
 * How long it must stay quiet before we stop. People pause mid-thought, and
 * this conversation asks questions worth pausing over, so this is generous.
 */
export const SILENCE_HOLD_MS = 2500

/** Nobody means to record for a minute. A runaway recorder stops here. */
export const MAX_RECORDING_MS = 60_000

/**
 * Wait this long before silence can end anything. Without it the recorder
 * stops before the person has drawn breath, since the first moments are always
 * quiet.
 */
export const MIN_RECORDING_MS = 1_200

export type SilenceState = {
  /** Has the level ever risen above the threshold? */
  heardSound: boolean
  /** How long the level has been below the threshold, in ms. */
  silentForMs: number
  /** Total recording length so far, in ms. */
  durationMs: number
}

/**
 * Fold one metering reading into the running state.
 *
 * `metering` is absent on a recorder without metering enabled, and on a device
 * that declines to report it. An absent level is not silence — treating it as
 * silence would stop every recording after the hold time on any device that
 * does not meter, which is the opposite failure and just as invisible.
 */
export function observeLevel(
  state: SilenceState,
  metering: number | undefined,
  elapsedMs: number,
): SilenceState {
  const durationMs = state.durationMs + elapsedMs
  if (typeof metering !== 'number' || Number.isNaN(metering)) {
    return { ...state, durationMs, silentForMs: 0 }
  }
  if (metering > SILENCE_DB) {
    return { heardSound: true, silentForMs: 0, durationMs }
  }
  return { ...state, silentForMs: state.silentForMs + elapsedMs, durationMs }
}

/** Should the recorder stop now? */
export function shouldAutoStop(state: SilenceState): boolean {
  if (state.durationMs >= MAX_RECORDING_MS) return true
  if (state.durationMs < MIN_RECORDING_MS) return false
  // Only after something was actually said. Someone who taps the mic and
  // thinks for four seconds before speaking keeps their recording.
  if (!state.heardSound) return false
  return state.silentForMs >= SILENCE_HOLD_MS
}

export const emptySilenceState = (): SilenceState => ({
  heardSound: false,
  silentForMs: 0,
  durationMs: 0,
})
