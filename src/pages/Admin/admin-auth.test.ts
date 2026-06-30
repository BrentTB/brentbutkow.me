import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { clearSession, isExpired, loadSession, saveSession } from './admin-auth'
import { AdminSession } from './admin.types'

const future = () => new Date(Date.now() + 60_000).toISOString()
const past = () => new Date(Date.now() - 60_000).toISOString()

describe('admin-auth', () => {
  beforeEach(() => sessionStorage.clear())
  afterEach(() => {
    sessionStorage.clear()
    vi.restoreAllMocks()
  })

  it('round-trips a valid session through sessionStorage', () => {
    const session: AdminSession = { token: 'abc', expiresAt: future() }
    saveSession(session)
    expect(loadSession()).toEqual(session)
  })

  it('returns null when nothing is stored', () => {
    expect(loadSession()).toBeNull()
  })

  it('returns null for an expired session', () => {
    saveSession({ token: 'abc', expiresAt: past() })
    expect(loadSession()).toBeNull()
  })

  it('returns null for malformed JSON', () => {
    sessionStorage.setItem('admin-session', '{ not json')
    expect(loadSession()).toBeNull()
  })

  it('returns null when the stored shape is wrong', () => {
    sessionStorage.setItem('admin-session', JSON.stringify({ token: 123 }))
    expect(loadSession()).toBeNull()
  })

  it('clearSession removes the key', () => {
    saveSession({ token: 'abc', expiresAt: future() })
    clearSession()
    expect(sessionStorage.getItem('admin-session')).toBeNull()
  })

  it('isExpired treats unparseable dates as expired', () => {
    expect(isExpired('not-a-date')).toBe(true)
    expect(isExpired(past())).toBe(true)
    expect(isExpired(future())).toBe(false)
  })
})
