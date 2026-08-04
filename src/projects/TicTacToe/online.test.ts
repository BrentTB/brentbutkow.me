import { describe, expect, it } from 'vitest'
import { Seat } from '../../multiplayer/multiplayer.types'
import { PLAYER_COLOURS } from './data'
import { CELL_COUNT } from './engine/lines'
import { Player } from './tic-tac-toe.types'
import {
  TIC_TAC_TOE_CELL_COUNT,
  cellCodec,
  freeColour,
  openingPlayer,
  playerForSeat,
  yieldsColour,
} from './online'

describe('online adapter', () => {
  it('sends a move as its own cell index', () => {
    for (const cell of [0, 31, CELL_COUNT - 1]) {
      expect(cellCodec.toWire(cell)).toBe(cell)
      expect(cellCodec.fromWire(cell)).toBe(cell)
    }
  })

  it('bounds the board by the engine cell count', () => {
    expect(TIC_TAC_TOE_CELL_COUNT).toBe(CELL_COUNT)
  })

  it('pins each seat to one player, whoever happens to open', () => {
    expect(playerForSeat(Seat.first)).toBe(Player.one)
    expect(playerForSeat(Seat.second)).toBe(Player.two)
  })

  /* Guards the swap the two boards showed while both players fought over one colour: with the rule
     "whoever notices a clash moves", both moved at once, to the same replacement, forever. */
  it('makes only the second seat move off a shared colour', () => {
    const amber = PLAYER_COLOURS[0].rgb
    expect(yieldsColour(Seat.second, amber, amber)).toBe(true)
    expect(yieldsColour(Seat.first, amber, amber)).toBe(false)
  })

  it('leaves a seat alone when the colours already differ, or nobody is opposite yet', () => {
    const [amber, cyan] = PLAYER_COLOURS
    expect(yieldsColour(Seat.second, amber.rgb, cyan.rgb)).toBe(false)
    expect(yieldsColour(Seat.second, amber.rgb, undefined)).toBe(false)
    expect(yieldsColour(null, amber.rgb, amber.rgb)).toBe(false)
  })

  it('picks the first colour nothing else is using', () => {
    const [amber, cyan, rose] = PLAYER_COLOURS
    expect(freeColour(PLAYER_COLOURS, [amber.rgb, cyan.rgb])).toBe(rose.rgb)
    // An empty opposite seat contributes nothing, rather than blocking a colour.
    expect(freeColour(PLAYER_COLOURS, [undefined, amber.rgb])).toBe(cyan.rgb)
    expect(
      freeColour(
        PLAYER_COLOURS,
        PLAYER_COLOURS.map((colour) => colour.rgb)
      )
    ).toBeUndefined()
  })

  it('names the opening player from the seat that goes first', () => {
    expect(openingPlayer(Seat.first)).toBe(Player.one)
    expect(openingPlayer(Seat.second)).toBe(Player.two)
  })
})
