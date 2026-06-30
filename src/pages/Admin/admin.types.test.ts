import { describe, expect, it } from 'vitest'
import { Overview, isOverview } from './admin.types'

const validOverview: Overview = {
  messages: { total: 3, real: 2, bot: 1 },
  subscriptions: { total: 5, active: 3, pendingConfirmation: 1, paused: 0, unsubscribed: 1 },
  ingest: { lastRunAt: '2026-06-30T00:00:00Z', status: 'ok', fetchedCount: 10, upsertedCount: 4 },
  recalls: { total: 9, us: 5, uk: 3, za: 1 },
  nullspace: { scoreCount: 42 },
}

describe('isOverview', () => {
  it('accepts a well-formed payload', () => {
    expect(isOverview(validOverview)).toBe(true)
  })

  it('accepts a null ingest (no run yet)', () => {
    expect(isOverview({ ...validOverview, ingest: null })).toBe(true)
  })

  it('rejects shape drift in a nested numeric leaf the panel renders', () => {
    // `recalls.total` missing — the old shallow guard passed this and rendered `undefined`.
    expect(isOverview({ ...validOverview, recalls: { us: 5, uk: 3, za: 1 } })).toBe(false)
  })

  it('rejects a non-object and a partial ingest', () => {
    expect(isOverview(null)).toBe(false)
    expect(isOverview({ ...validOverview, ingest: { status: 'ok' } })).toBe(false)
  })
})
