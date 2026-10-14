/**
 * What to say when the microphone will not start.
 *
 * This exists because of a bug that could not be diagnosed. On iOS the whole
 * recording startup sat behind `run().catch(() => onEnd())` — a catch that
 * logged nothing and showed nothing. Permission, the audio session, preparing
 * the recorder and starting it all failed the same way: the mic button stopped
 * pulsing and that was the entire symptom. The person reporting it could only
 * say "nothing happens", which is not enough to act on, and the one input the
 * product is built around was the thing failing silently.
 *
 * So every stage names itself. The text is for the person holding the phone,
 * and the stage is for whoever reads the report afterwards.
 */
export type MicStage =
  /** Asking iOS for microphone access. */
  | 'permission'
  /** Putting the audio session into a recording category. */
  | 'audio-session'
  /** Preparing the recorder to write a file. */
  | 'prepare'
  /** Telling the recorder to start. */
  | 'record'
  /** No recorder at all — the native module never reached this screen. */
  | 'unavailable'

const BY_STAGE: Record<MicStage, string> = {
  permission: 'SOMA could not ask for microphone access.',
  'audio-session': 'SOMA could not open the microphone.',
  prepare: 'SOMA could not start recording.',
  record: 'SOMA could not start recording.',
  unavailable: 'The microphone is not ready yet. Close SOMA and open it again.',
}

export function reasonOf(err: unknown): string {
  if (err instanceof Error && err.message) return err.message
  if (typeof err === 'string' && err) return err
  return 'no reason given'
}

/**
 * The message to show. It always ends with the reason, because a message that
 * only says something went wrong leaves us exactly where we started.
 */
export function micFailureMessage(stage: MicStage, err: unknown): string {
  return `${BY_STAGE[stage]} (${stage}: ${reasonOf(err)})`
}

/** The line for the console, which is what a TestFlight log will carry. */
export function micFailureLog(stage: MicStage, err: unknown): string {
  return `[voice] microphone failed at ${stage}: ${reasonOf(err)}`
}
