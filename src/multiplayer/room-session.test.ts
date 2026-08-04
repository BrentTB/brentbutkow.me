import { afterEach, describe, expect, it } from 'vitest'
import { Seat } from './multiplayer.types'
import { clearRoomSession, loadRoomSession, saveRoomSession } from './room-session'

const GAME = 'ttt'
const SESSION = { code: 'AB2K9M', token: 'tok', seat: Seat.second }

afterEach(() => window.sessionStorage.clear())

describe('room-session', () => {
  it('round-trips the seat you are holding', () => {
    saveRoomSession(GAME, SESSION)
    expect(loadRoomSession(GAME)).toEqual(SESSION)
  })

  it('has nothing to resume before anything is stored', () => {
    expect(loadRoomSession(GAME)).toBeNull()
  })

  it('keeps games apart, so one does not resume into another', () => {
    saveRoomSession(GAME, SESSION)
    expect(loadRoomSession('othello')).toBeNull()
  })

  it('forgets the seat once cleared', () => {
    saveRoomSession(GAME, SESSION)
    clearRoomSession(GAME)
    expect(loadRoomSession(GAME)).toBeNull()
  })

  it('treats unreadable storage as nothing stored', () => {
    window.sessionStorage.setItem('room-session:ttt', 'not json')
    expect(loadRoomSession(GAME)).toBeNull()
  })

  it('rejects a stored value missing what a session needs', () => {
    // Storage is untrusted input like any other: a half-written session must not become a half-session.
    window.sessionStorage.setItem('room-session:ttt', JSON.stringify({ code: 'AB2K9M' }))
    expect(loadRoomSession(GAME)).toBeNull()

    window.sessionStorage.setItem(
      'room-session:ttt',
      JSON.stringify({ code: 'AB2K9M', token: 'tok', seat: 7 })
    )
    expect(loadRoomSession(GAME)).toBeNull()
  })
})
