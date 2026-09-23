// Deciding when the browser's own speech recognition has let us down.
//
// `listen()` used Whisper only when Web Speech was *absent*. That is the wrong
// test: Safari exposes `webkitSpeechRecognition` and then fails on languages it
// cannot actually handle, so a Russian speaker got a mic button that listened,
// produced nothing, and reported nothing — the error handler called
// onResult('') and the caller's `if (text.trim())` guard swallowed it. Whisper
// transcribes the same Russian sentence perfectly, and was never reached.
//
// So the question is not "does this browser have an engine" but "did the engine
// it has just tell us it cannot do this".

/**
 * Errors that mean the engine cannot do the job, so something else should.
 *
 *   language-not-supported — the specific failure for non-English on Safari
 *   service-not-allowed    — engine present but the platform refuses it
 *   network                — Web Speech is cloud-backed and could not reach it
 *   audio-capture          — it could not open the microphone at all
 *
 * These fire on start or almost immediately, before anyone has finished
 * speaking, which is what makes switching engines mid-session safe: there is no
 * captured audio to lose.
 */
const ENGINE_FAILURES = [
  'language-not-supported',
  'service-not-allowed',
  'network',
  'audio-capture',
]

/**
 * Errors that are about the person, not the engine.
 *
 * `no-speech` means they said nothing and `aborted` means they stopped it
 * themselves. Falling back on either would swap engines because somebody paused,
 * and would do it silently.
 */
const USER_OUTCOMES = ['no-speech', 'aborted']

/** Should we abandon the browser engine and record for Whisper instead? */
export function isEngineFailure(code: unknown): boolean {
  if (typeof code !== 'string' || !code) return false
  if (USER_OUTCOMES.includes(code)) return false
  return ENGINE_FAILURES.includes(code)
}

/**
 * Is this error worth remembering for the rest of the session?
 *
 * A language the engine does not support will not start supporting it on the
 * next tap, and neither will a platform that refuses the service — so route
 * straight to Whisper from then on rather than failing once per attempt. A
 * network blip might clear, so that one is not sticky.
 */
export function isPermanentFailure(code: unknown): boolean {
  return code === 'language-not-supported' || code === 'service-not-allowed'
}
