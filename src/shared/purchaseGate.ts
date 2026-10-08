/**
 * Whether a tap on the paywall's CTA may grant SOMA+.
 *
 * This exists because the paywall's old answer to "there is no package to buy"
 * was `success = true`, which granted premium permanently with no payment. That
 * is not a hypothetical: `EXPO_PUBLIC_RC_IOS_KEY` is inlined at build time, so
 * any build made without it — build 9 among them — reaches that branch for
 * every user who taps the button. It gives the product away, and Apple reads
 * unlocking paid features outside in-app purchase as a 3.1.1 rejection.
 *
 * So an answer we did not get is never a sale, the same way an unknown age is
 * never an adult and a face-verification we could not run is never a pass. The
 * single exception is a dev client, where there is no store to ask and the flow
 * would otherwise be untestable.
 */
export type PurchaseOutcome =
  /** The store charged them. */
  | { kind: 'purchased' }
  /** The store was asked and said no — cancelled, declined, failed. */
  | { kind: 'refused' }
  /** There was nothing to ask: no package, because purchases are not configured. */
  | { kind: 'unavailable' }

export function grantsPremium(outcome: PurchaseOutcome, isDev: boolean): boolean {
  switch (outcome.kind) {
    case 'purchased': return true
    case 'refused': return false
    // Never in a release build, whatever the reason the store is missing.
    case 'unavailable': return isDev
  }
}
