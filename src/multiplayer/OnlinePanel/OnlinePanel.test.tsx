import { afterEach, describe, expect, it, vi } from 'vitest'
import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { RoomStatus, Seat, SeatInfo, SeatProfile } from '../multiplayer.types'
import { Connection, OnlineRoom } from '../useOnlineRoom'
import { ROOM_CODE_LENGTH } from '../room-code'
import { MOVE_LIMITS, ONLINE_STARTERS } from '../room-options'
import { OnlineCopy } from '../online-copy'
import { OnlinePanel } from './OnlinePanel'

afterEach(cleanup)

const MAX_NAME_LENGTH = 14

/** A self-contained copy fixture, so the shared panel's test does not lean on any one game's wording. */
const copy: OnlineCopy = {
  title: 'Online game',
  intro: 'Play a friend or a stranger online.',
  connecting: 'Connecting…',
  createTitle: 'Create a room',
  create: 'Set up a room',
  joinTitle: 'Join an existing room',
  findGame: 'Find a game',
  findHint: 'Joins an existing open room if possible, otherwise creates a new room.',
  codeLabel: 'Room code',
  codePlaceholder: 'Enter a code',
  join: 'Join a game',
  openRoom: 'Create the room',
  yourCode: 'Your room code',
  copyLink: 'Copy link',
  copied: 'Copied',
  waiting: 'Waiting for someone to join',
  yourTurn: 'Your move',
  theirTurn: 'Their move',
  timeLeft: (clock: string) => `${clock} left`,
  opponentLeft: (name: string) => `${name} left the room`,
  opponentLeftUnnamed: 'The other player left the room',
  unnamed: 'No name yet',
  youTag: '(you)',
  editSettings: 'Edit room settings',
  saveSettings: 'Save settings',
  settingsTitle: 'Room settings',
  cancel: 'Cancel',
  playAgain: 'Play again',
  startGame: 'Start game',
  startHint: 'You can change the settings above until you start.',
  waitingToStart: 'Waiting for the other player to start',
  leave: 'Leave game',
  firstMoveLabel: 'Opening move',
  clockLabel: 'Move time limit',
  openLabel: 'Open to anyone',
  openHint: 'Anyone looking for a game can join this room.',
  openYes: 'Anyone can join',
  openNo: 'Code only',
}

const PROFILE: SeatProfile = { name: 'Ada', colour: '233, 164, 84' }

/** A room the panel can be pointed at, with every call a spy and nothing actually on the wire. */
function fakeRoom(overrides: Partial<OnlineRoom<number>> = {}): OnlineRoom<number> {
  return {
    connection: Connection.idle,
    status: null,
    code: null,
    cellCount: 64,
    mySeat: null,
    seats: [],
    version: 0,
    isMyTurn: false,
    opponentPresent: false,
    opponentLeft: false,
    firstSeat: Seat.first,
    outcome: null,
    winnerSeat: null,
    turnEndsAt: null,
    moveLimitSeconds: null,
    error: null,
    create: vi.fn(async () => undefined),
    join: vi.fn(async () => undefined),
    findGame: vi.fn(async () => undefined),
    submit: vi.fn(async () => true),
    aim: vi.fn(async () => undefined),
    publishProfile: vi.fn(async () => undefined),
    start: vi.fn(async () => undefined),
    canStart: false,
    changeSettings: vi.fn(async () => undefined),
    canChangeSettings: false,
    isOpen: false,
    leave: vi.fn(),
    ...overrides,
  }
}

/** A room with both seats known, which is what the connected half of the panel describes. */
function connectedRoom(overrides: Partial<OnlineRoom<number>> = {}): OnlineRoom<number> {
  return fakeRoom({
    connection: Connection.connected,
    status: RoomStatus.waiting,
    code: 'AB2K9M',
    mySeat: Seat.first,
    seats: [seat(Seat.first, 'Ada'), seat(Seat.second, 'Linus')],
    opponentPresent: true,
    ...overrides,
  })
}

const seat = (which: Seat, name: string, joined = true): SeatInfo => ({
  seat: which,
  name,
  colour: '104, 200, 216',
  joined,
})

const show = (room: OnlineRoom<number>, initialCode?: string) => {
  render(
    <OnlinePanel
      room={room}
      profile={PROFILE}
      initialCode={initialCode}
      copy={copy}
      maxNameLength={MAX_NAME_LENGTH}
      seatSwatchRgb={(entry) => entry.colour}
    />
  )
  return room
}

const button = (name: string) => screen.getByRole('button', { name })
const radio = (name: string) => screen.getByRole('radio', { name })

describe('OnlinePanel — getting into a game', () => {
  it('refuses to join until the code is as long as the ones the server issues', () => {
    show(fakeRoom())
    const field = screen.getByLabelText(copy.codeLabel)

    expect(button(copy.join).hasAttribute('disabled')).toBe(true)

    fireEvent.change(field, { target: { value: 'AB2K9' } })
    expect(button(copy.join).hasAttribute('disabled')).toBe(true)

    fireEvent.change(field, { target: { value: 'AB2K9M' } })
    expect(button(copy.join).hasAttribute('disabled')).toBe(false)
    expect('AB2K9M'.length).toBe(ROOM_CODE_LENGTH)
  })

  it('keeps the field to the characters a room code is made of', () => {
    const room = show(fakeRoom())
    const field = screen.getByLabelText(copy.codeLabel) as HTMLInputElement

    fireEvent.change(field, { target: { value: ' ab2k9m' } })

    expect(field.value).toBe('AB2K9M')
    fireEvent.click(button(copy.join))
    expect(room.join).toHaveBeenCalledWith('AB2K9M', PROFILE)
  })

  it('fills the field from an invite link', () => {
    show(fakeRoom(), 'ab2k9m')
    expect((screen.getByLabelText(copy.codeLabel) as HTMLInputElement).value).toBe('AB2K9M')
  })

  it('asks for a room of the standard shape when matchmaking', () => {
    const room = show(fakeRoom())

    fireEvent.click(button(copy.findGame))

    expect(room.findGame).toHaveBeenCalledWith(PROFILE, {
      firstSeat: Seat.first,
      isOpen: false,
      moveLimitSeconds: null,
    })
  })

  it('opens the settings before creating anything', () => {
    const room = show(fakeRoom())

    fireEvent.click(button(copy.create))

    expect(screen.getByRole('dialog')).toBeTruthy()
    expect(room.create).not.toHaveBeenCalled()
  })

  it('creates the room with the settings as edited', () => {
    const room = show(fakeRoom())
    const them = ONLINE_STARTERS[1]
    const limit = MOVE_LIMITS[1]

    fireEvent.click(button(copy.create))
    fireEvent.click(radio(them.label))
    fireEvent.click(radio(limit.label))
    fireEvent.click(screen.getByLabelText(new RegExp(copy.openLabel)))
    fireEvent.click(button(copy.openRoom))

    expect(room.create).toHaveBeenCalledWith(PROFILE, {
      firstSeat: them.seat,
      isOpen: true,
      moveLimitSeconds: limit.seconds,
    })
  })

  it('throws the edits away on cancel', () => {
    const room = show(fakeRoom())

    fireEvent.click(button(copy.create))
    fireEvent.click(radio(ONLINE_STARTERS[1].label))
    fireEvent.click(button(copy.cancel))

    expect(room.create).not.toHaveBeenCalled()

    fireEvent.click(button(copy.create))
    expect(radio(ONLINE_STARTERS[0].label).getAttribute('aria-checked')).toBe('true')
  })

  it('says so while it is connecting, and shows the error when it could not', () => {
    show(fakeRoom({ connection: Connection.connecting }))
    expect(screen.getByText(copy.connecting)).toBeTruthy()
    expect(screen.queryByRole('button', { name: copy.create })).toBeNull()

    cleanup()
    show(fakeRoom({ connection: Connection.error, error: 'That room code was not found.' }))
    expect(screen.getByRole('alert').textContent).toBe('That room code was not found.')
  })
})

describe('OnlinePanel — in a room', () => {
  it('shows the code and both seats, marking your own', () => {
    show(connectedRoom())

    expect(screen.getByText('AB2K9M')).toBeTruthy()
    expect(screen.getByText('Linus')).toBeTruthy()
    expect(screen.getByText(copy.youTag)).toBeTruthy()
  })

  it('caps an opponent name at the length a seat row is built for', () => {
    const long = 'X'.repeat(MAX_NAME_LENGTH + 40)
    show(connectedRoom({ seats: [seat(Seat.first, 'Ada'), seat(Seat.second, long)] }))

    expect(screen.getByText('X'.repeat(MAX_NAME_LENGTH))).toBeTruthy()
    expect(screen.queryByText(long)).toBeNull()
  })

  it('names a seat nobody has named yet', () => {
    show(connectedRoom({ seats: [seat(Seat.first, 'Ada'), seat(Seat.second, '  ')] }))
    expect(screen.getByText(copy.unnamed)).toBeTruthy()
  })

  it('says whose move it is while a game is running, and who is waited on before one', () => {
    show(connectedRoom({ status: RoomStatus.active, isMyTurn: true }))
    expect(screen.getByText(copy.yourTurn)).toBeTruthy()

    cleanup()
    show(connectedRoom({ status: RoomStatus.active, isMyTurn: false }))
    expect(screen.getByText(copy.theirTurn)).toBeTruthy()

    cleanup()
    show(connectedRoom({ opponentPresent: false, seats: [seat(Seat.first, 'Ada')] }))
    expect(screen.getByText(copy.waiting)).toBeTruthy()
  })

  /** Both players in, nobody has started: neither is "on turn", so the turn line stays quiet. */
  it('claims no turn before the first game has started', () => {
    show(connectedRoom({ status: RoomStatus.waiting, isMyTurn: false }))
    expect(screen.queryByText(copy.theirTurn)).toBeNull()
    expect(screen.queryByText(copy.yourTurn)).toBeNull()
  })

  it('says nothing about turns once the game is over', () => {
    show(connectedRoom({ status: RoomStatus.finished }))

    for (const line of [copy.yourTurn, copy.theirTurn, copy.waiting]) {
      expect(screen.queryByText(line)).toBeNull()
    }
  })

  it('reports an opponent who walked out', () => {
    show(
      connectedRoom({
        opponentLeft: true,
        opponentPresent: false,
        seats: [seat(Seat.first, 'Ada'), seat(Seat.second, 'Linus', false)],
      })
    )

    expect(screen.getByRole('status').textContent).toBe(copy.opponentLeft('Linus'))
    expect(screen.queryByText(copy.waiting)).toBeNull()
  })

  it('rewords the walkout when the opponent never named themselves', () => {
    show(
      connectedRoom({
        opponentLeft: true,
        opponentPresent: false,
        seats: [seat(Seat.first, 'Ada'), seat(Seat.second, '', false)],
      })
    )

    expect(screen.getByRole('status').textContent).toBe(copy.opponentLeftUnnamed)
  })
})

describe('OnlinePanel — the room settings', () => {
  it('reads the terms out, with no way to change them from the other seat', () => {
    show(connectedRoom({ mySeat: Seat.second, moveLimitSeconds: 60, isOpen: true }))

    expect(screen.getByText(MOVE_LIMITS[2].label)).toBeTruthy()
    expect(screen.getByText(copy.openYes)).toBeTruthy()
    expect(screen.queryByRole('button', { name: copy.editSettings })).toBeNull()
  })

  it('describes the opening move from the reader’s side of the table', () => {
    show(connectedRoom({ mySeat: Seat.second, firstSeat: Seat.first }))
    expect(screen.getByText(ONLINE_STARTERS[1].label)).toBeTruthy()

    cleanup()
    show(connectedRoom({ mySeat: Seat.second, firstSeat: Seat.second }))
    expect(screen.getByText(ONLINE_STARTERS[0].label)).toBeTruthy()
  })

  it('shows a limit it does not offer rather than calling it none', () => {
    show(connectedRoom({ moveLimitSeconds: 45 }))

    expect(screen.getByText('45s')).toBeTruthy()
    expect(screen.queryByText(MOVE_LIMITS[0].label)).toBeNull()
  })

  it('hands the edited settings to the room on confirm', () => {
    const room = show(connectedRoom({ canChangeSettings: true, moveLimitSeconds: null }))
    const limit = MOVE_LIMITS[3]

    fireEvent.click(button(copy.editSettings))
    fireEvent.click(radio(limit.label))
    fireEvent.click(button(copy.saveSettings))

    expect(room.changeSettings).toHaveBeenCalledWith({
      firstSeat: Seat.first,
      isOpen: false,
      moveLimitSeconds: limit.seconds,
    })
  })

  it('leaves the room alone when the dialog is cancelled', () => {
    const room = show(connectedRoom({ canChangeSettings: true }))

    fireEvent.click(button(copy.editSettings))
    fireEvent.click(radio(MOVE_LIMITS[1].label))
    fireEvent.click(button(copy.cancel))

    expect(room.changeSettings).not.toHaveBeenCalled()
  })

  it('gives each group in the dialog one tab stop and arrow keys', () => {
    show(connectedRoom({ canChangeSettings: true }))
    fireEvent.click(button(copy.editSettings))

    expect(radio(MOVE_LIMITS[0].label).tabIndex).toBe(0)
    expect(radio(MOVE_LIMITS[1].label).tabIndex).toBe(-1)

    fireEvent.keyDown(radio(MOVE_LIMITS[0].label), { key: 'ArrowRight' })
    expect(radio(MOVE_LIMITS[1].label).getAttribute('aria-checked')).toBe('true')

    fireEvent.keyDown(radio(MOVE_LIMITS[1].label), { key: 'End' })
    expect(radio(MOVE_LIMITS[MOVE_LIMITS.length - 1].label).getAttribute('aria-checked')).toBe(
      'true'
    )
  })

  it('puts the settings away once a game is under way', () => {
    show(connectedRoom({ status: RoomStatus.active, canChangeSettings: true }))

    expect(screen.queryByText(copy.clockLabel)).toBeNull()
    expect(screen.queryByRole('button', { name: copy.editSettings })).toBeNull()
  })
})

describe('OnlinePanel — starting a game', () => {
  it('offers the start to the seat that may take it, and names it for the first game', () => {
    const room = show(connectedRoom({ canStart: true }))

    fireEvent.click(button(copy.startGame))

    expect(room.start).toHaveBeenCalled()
  })

  it('calls it playing again once a game has been played', () => {
    show(connectedRoom({ canStart: true, version: 4 }))

    expect(screen.getByRole('button', { name: copy.playAgain })).toBeTruthy()
    expect(screen.queryByRole('button', { name: copy.startGame })).toBeNull()
  })

  it('calls it playing again after a finished game with no moves of its own', () => {
    show(connectedRoom({ canStart: true, status: RoomStatus.finished }))
    expect(screen.getByRole('button', { name: copy.playAgain })).toBeTruthy()
  })

  it('explains the wait to the player who cannot start', () => {
    show(connectedRoom({ canStart: false }))

    expect(screen.getByText(copy.waitingToStart)).toBeTruthy()
    expect(screen.queryByRole('button', { name: copy.startGame })).toBeNull()
  })

  it('leaves the room on the way out', () => {
    const room = show(connectedRoom())

    fireEvent.click(button(copy.leave))

    expect(room.leave).toHaveBeenCalled()
  })
})
