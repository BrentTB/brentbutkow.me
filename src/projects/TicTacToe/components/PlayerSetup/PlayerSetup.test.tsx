import { afterEach, describe, expect, it, vi } from 'vitest'
import { cleanup, fireEvent, render, screen, within } from '@testing-library/react'
import { PlayerSetup } from './PlayerSetup'
import { DEFAULT_PLAYERS, MAX_NAME_LENGTH, PLAYER_COLOURS, gameCopy } from '../../data'
import { Player } from '../../tic-tac-toe.types'

afterEach(cleanup)

const NAMES = {
  [Player.one]: DEFAULT_PLAYERS[Player.one].name,
  [Player.two]: DEFAULT_PLAYERS[Player.two].name,
}

function renderSetup(overrides: Partial<Parameters<typeof PlayerSetup>[0]> = {}) {
  const props = {
    players: DEFAULT_PLAYERS,
    displayNames: NAMES,
    computer: null,
    onRename: vi.fn(),
    onRecolour: vi.fn(),
    ...overrides,
  }
  render(<PlayerSetup {...props} />)
  return props
}

/** Both seats offer the same colours, so a swatch is only unambiguous inside its own seat's group. */
const swatchFor = (seatName: string, colourName: string) =>
  within(screen.getByRole('radiogroup', { name: gameCopy.colourLabel(seatName) })).getByRole(
    'radio',
    { name: colourName }
  )

describe('PlayerSetup', () => {
  it('offers a name field and a colour group per seat', () => {
    renderSetup()

    expect(screen.getByLabelText(gameCopy.nameLabel(1))).toBeTruthy()
    expect(screen.getByLabelText(gameCopy.nameLabel(2))).toBeTruthy()
    expect(screen.getByRole('radiogroup', { name: gameCopy.colourLabel(NAMES.one) })).toBeTruthy()
  })

  it('reports a rename as it is typed, within the length the turn line can hold', () => {
    const props = renderSetup()
    const field = screen.getByLabelText(gameCopy.nameLabel(1))

    fireEvent.change(field, { target: { value: 'Ada' } })

    expect(props.onRename).toHaveBeenCalledWith(Player.one, 'Ada')
    expect(field.getAttribute('maxLength')).toBe(String(MAX_NAME_LENGTH))
  })

  it('marks the seat the computer is playing', () => {
    renderSetup({ computer: Player.two })
    expect(screen.getByText(gameCopy.computerTag)).toBeTruthy()
  })

  /**
   * Two players in one colour would make the board unreadable, so the other seat's colour is out — and
   * says why: "disabled" on its own leaves a screen reader with no idea it is simply taken.
   */
  it('rules out the colour the other seat is using, with the reason attached', () => {
    const taken = PLAYER_COLOURS.find((colour) => colour.rgb === DEFAULT_PLAYERS[Player.two].rgb)!
    renderSetup()

    const swatch = swatchFor(NAMES.one, gameCopy.colourTakenLabel(taken.name))
    expect(swatch.hasAttribute('disabled')).toBe(true)
    expect(swatch.getAttribute('title')).toBe(gameCopy.colourTakenLabel(taken.name))
  })

  it('reports a colour change', () => {
    const props = renderSetup()
    const free = PLAYER_COLOURS[3]

    fireEvent.click(swatchFor(NAMES.one, free.name))

    expect(props.onRecolour).toHaveBeenCalledWith(Player.one, free.rgb)
  })

  /** A blank name still has to read as something in the group a screen reader announces. */
  it('labels the colour group with the resolved name, not the empty field', () => {
    renderSetup({
      players: {
        ...DEFAULT_PLAYERS,
        [Player.one]: { ...DEFAULT_PLAYERS[Player.one], name: '' },
      },
    })

    expect(screen.getByRole('radiogroup', { name: gameCopy.colourLabel(NAMES.one) })).toBeTruthy()
    // The field itself stays empty, so it can still be typed into.
    expect(screen.getByLabelText(gameCopy.nameLabel(1)).getAttribute('value')).toBe('')
  })

  it('keeps one tab stop per colour group and moves with the arrow keys', () => {
    const props = renderSetup()
    const selected = PLAYER_COLOURS[0]

    expect(swatchFor(NAMES.one, selected.name).tabIndex).toBe(0)
    expect(swatchFor(NAMES.one, PLAYER_COLOURS[2].name).tabIndex).toBe(-1)

    fireEvent.keyDown(swatchFor(NAMES.one, selected.name), { key: 'ArrowRight' })
    expect(props.onRecolour).toHaveBeenCalledWith(Player.one, PLAYER_COLOURS[1].rgb)
  })
})
