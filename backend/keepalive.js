/**
 * Keeps the database warm, and answers honestly about whether it is reachable.
 *
 * Supabase pauses a free-tier project after 7 days without activity. On
 * 2026-10-14 that happened: the database went down, and nothing noticed. The
 * site returned 200, the API's root returned 200, `/health` returned
 * `{status:'ok'}` — and every endpoint that touched data failed with "fetch
 * failed". An app that loads and then does nothing reads as a broken app, which
 * during App Store review is a rejection for a fault that heals itself before
 * anyone can look at it.
 *
 * Two parts, and they are separate on purpose:
 *
 * 1. A periodic probe runs a trivial query so the project never sits idle for
 *    seven days. Having no users is what causes a pause, not what prevents one.
 *
 * 2. The probe's result is reported — because the reason that outage lasted
 *    days is that every check we had asserted on the shape of a response
 *    instead of its content.
 *
 * The reporting does NOT go on `/health`. `backend/railway.json` points
 * Railway's own healthcheck at `/health`, so a `/health` that fails when the
 * database is paused would make Railway fail the deploy and restart the
 * container — turning a degraded API into a dead one, exactly when the
 * remaining endpoints still work. `/health` stays liveness: the process is up.
 * `/health/db` is readiness: the data layer answered recently.
 */

/** How often to touch the database. Six hours leaves room for missed runs. */
export const PING_INTERVAL_MS = 6 * 60 * 60 * 1000

/** Probe once shortly after boot, not during it — the listener comes first. */
export const PING_BOOT_DELAY_MS = 20 * 1000

/**
 * No successful probe in this long means something is wrong. Comfortably more
 * than two intervals, so one failed run is not an alert, and comfortably less
 * than the seven days Supabase waits before pausing.
 */
export const STALE_AFTER_MS = 24 * 60 * 60 * 1000

/**
 * What `/health/db` should answer, from the probe's recorded state.
 *
 * Unknown is never healthy. A process that has not yet managed a single
 * successful query has not shown the database works, and saying "ok" because
 * nothing has failed yet is the same lie the old `/health` told.
 *
 * @param {{lastOkAt: number|null, lastError: string|null}} state
 * @param {number} now epoch ms
 */
export function databaseHealth(state, now) {
  const lastOkAt = state?.lastOkAt ?? null
  const lastError = state?.lastError ?? null

  if (lastOkAt === null) {
    return {
      status: 503,
      body: {
        ok: false,
        database: 'unknown',
        reason: lastError || 'no successful database probe yet',
      },
    }
  }

  const ageMs = Math.max(0, now - lastOkAt)
  if (ageMs > STALE_AFTER_MS) {
    return {
      status: 503,
      body: {
        ok: false,
        database: 'stale',
        lastOkAgeMs: ageMs,
        reason: lastError || `no successful query in ${Math.round(ageMs / 3600000)}h`,
      },
    }
  }

  return {
    status: 200,
    body: { ok: true, database: 'reachable', lastOkAgeMs: ageMs },
  }
}
