import { describe, expect, it } from 'vitest'
import { Overview, isMessageAdmin, isOverview } from './admin.types'

const validOverview: Overview = {
  messages: { total: 3, real: 2, bot: 1, unseen: 1 },
  subscriptions: { total: 5, active: 3, pendingConfirmation: 1, paused: 0, unsubscribed: 1 },
  ingest: { lastRunAt: '2026-06-30T00:00:00Z', status: 'ok', fetchedCount: 10, upsertedCount: 4 },
  recalls: { total: 9, us: 5, uk: 3, za: 1 },
  nullspace: { total: 42, legit: 40, flagged: 2 },
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

  it('rejects a messages block missing the unseen count', () => {
    expect(isOverview({ ...validOverview, messages: { total: 3, real: 2, bot: 1 } })).toBe(false)
  })

  it('rejects the old nullspace shape (scoreCount instead of total/legit/flagged)', () => {
    expect(isOverview({ ...validOverview, nullspace: { scoreCount: 42 } })).toBe(false)
  })

  it('rejects a non-object and a partial ingest', () => {
    expect(isOverview(null)).toBe(false)
    expect(isOverview({ ...validOverview, ingest: { status: 'ok' } })).toBe(false)
  })
})

describe('isMessageAdmin', () => {
  // The API returns a numeric id — a string-only check here rejected valid PATCH responses.
  it('accepts a message with a numeric id and a boolean seen', () => {
    expect(isMessageAdmin({ id: 1, seen: true })).toBe(true)
    expect(isMessageAdmin({ id: 1, seen: false })).toBe(true)
  })

  it('rejects a string id, a missing seen, or a non-boolean seen', () => {
    expect(isMessageAdmin({ id: '1', seen: true })).toBe(false)
    expect(isMessageAdmin({ id: 1 })).toBe(false)
    expect(isMessageAdmin({ id: 1, seen: 'yes' })).toBe(false)
    expect(isMessageAdmin(null)).toBe(false)
  })
})
