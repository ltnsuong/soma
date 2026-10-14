import { describe, it, expect } from 'vitest'
import { databaseHealth, STALE_AFTER_MS, PING_INTERVAL_MS } from './keepalive.js'

const NOW = Date.parse('2026-10-14T12:00:00Z')

describe('reporting the database as reachable', () => {
  it('is ok when a probe succeeded just now', () => {
    const r = databaseHealth({ lastOkAt: NOW - 1000, lastError: null }, NOW)
    expect(r.status).toBe(200)
    expect(r.body.ok).toBe(true)
    expect(r.body.lastOkAgeMs).toBe(1000)
  })

  it('is still ok a few intervals later, so one missed run is not an alert', () => {
    const r = databaseHealth({ lastOkAt: NOW - 2 * PING_INTERVAL_MS, lastError: null }, NOW)
    expect(r.status).toBe(200)
  })

  it('does not report a negative age if the clock moves backwards', () => {
    const r = databaseHealth({ lastOkAt: NOW + 5000, lastError: null }, NOW)
    expect(r.body.lastOkAgeMs).toBe(0)
  })
})

describe('an unanswered database is never healthy', () => {
  // This is the whole point of the module. On 2026-10-14 Supabase paused the
  // project and /health kept answering {status:'ok'} while every endpoint that
  // touched data failed. Do not relax these so that "nothing has failed yet"
  // counts as working.
  it('is not ok before any probe has succeeded', () => {
    const r = databaseHealth({ lastOkAt: null, lastError: null }, NOW)
    expect(r.status).toBe(503)
    expect(r.body.ok).toBe(false)
    expect(r.body.database).toBe('unknown')
  })

  it('reports the probe error when there is one', () => {
    const r = databaseHealth({ lastOkAt: null, lastError: 'fetch failed' }, NOW)
    expect(r.status).toBe(503)
    expect(r.body.reason).toBe('fetch failed')
  })

  it('is not ok once the last success is older than the stale window', () => {
    const r = databaseHealth({ lastOkAt: NOW - STALE_AFTER_MS - 1, lastError: null }, NOW)
    expect(r.status).toBe(503)
    expect(r.body.database).toBe('stale')
  })

  it('tolerates a missing state object rather than throwing', () => {
    expect(databaseHealth(undefined, NOW).status).toBe(503)
  })
})

describe('the probe schedule', () => {
  it('touches the database far more often than Supabase waits before pausing', () => {
    const PAUSE_AFTER = 7 * 24 * 60 * 60 * 1000
    expect(PING_INTERVAL_MS).toBeLessThan(PAUSE_AFTER / 4)
  })

  it('calls a success stale well before a pause could happen', () => {
    expect(STALE_AFTER_MS).toBeLessThan(7 * 24 * 60 * 60 * 1000)
    expect(STALE_AFTER_MS).toBeGreaterThan(2 * PING_INTERVAL_MS)
  })
})
