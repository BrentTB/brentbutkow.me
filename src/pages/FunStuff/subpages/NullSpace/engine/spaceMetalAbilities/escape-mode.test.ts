import { describe, it, expect, beforeEach } from 'vitest'
import { createInitialState, startGame, updateGameState } from '../game-loop'
import { applyDamageToShip, tickEscapeMode } from '../entities/ship'
import { resetUid } from '../entities/entity-creator'
import { AbilityKind, EscapeModePhase, GamePhase, ShipKind } from '../types'
import { SpaceMetalAbilityKind, tryActivateSpaceMetalAbility } from '.'
import { ESCAPE_MODE } from './escape-mode'

beforeEach(() => {
  resetUid()
  localStorage.clear()
})

function ready(): ReturnType<typeof createInitialState> {
  let state = startGame(createInitialState(), ShipKind.fighter)
  state = {
    ...state,
    spaceMetal: 5,
    ship: { ...state.ship, vel: { x: 100, y: 0 }, lastHeading: { x: 1, y: 0 } },
  }
  return state
}

describe('escape-mode space-metal ability', () => {
  it('activate puts the ship into the charge phase and deducts 2 space metal', () => {
    const state = tryActivateSpaceMetalAbility(ready(), SpaceMetalAbilityKind.escapeDash)
    expect(state.spaceMetal).toBe(3)
    expect(state.ship.escapeMode).not.toBeNull()
    expect(state.ship.escapeMode!.phase).toBe(EscapeModePhase.charge)
    expect(state.ship.escapeMode!.timer).toBeCloseTo(ESCAPE_MODE.chargeDuration)
    // Heading derived from velocity (1, 0).
    expect(state.ship.escapeMode!.heading.x).toBeCloseTo(1)
    expect(state.ship.escapeMode!.heading.y).toBeCloseTo(0)
  })

  it('falls back to lastHeading when velocity is near zero', () => {
    let state = ready()
    state = {
      ...state,
      ship: { ...state.ship, vel: { x: 0, y: 0 }, lastHeading: { x: 0, y: -1 } },
    }
    state = tryActivateSpaceMetalAbility(state, SpaceMetalAbilityKind.escapeDash)
    expect(state.ship.escapeMode!.heading).toEqual({ x: 0, y: -1 })
  })

  it('activation is a no-op when already escaping', () => {
    let state = tryActivateSpaceMetalAbility(ready(), SpaceMetalAbilityKind.escapeDash)
    const before = state.spaceMetal
    state = tryActivateSpaceMetalAbility(state, SpaceMetalAbilityKind.escapeDash)
    expect(state.spaceMetal).toBe(before)
  })

  it('activation is a no-op when insufficient space metal', () => {
    let state = ready()
    state = { ...state, spaceMetal: 1 }
    const result = tryActivateSpaceMetalAbility(state, SpaceMetalAbilityKind.escapeDash)
    expect(result.ship.escapeMode).toBeNull()
    expect(result.spaceMetal).toBe(1)
  })

  it('charge phase ticks down then transitions to dash', () => {
    let state = tryActivateSpaceMetalAbility(ready(), SpaceMetalAbilityKind.escapeDash)
    let acc = 0
    // Tick past the charge duration in two halves.
    const result1 = tickEscapeMode(state.ship, ESCAPE_MODE.chargeDuration / 2, acc)
    state = { ...state, ship: result1.ship }
    acc = result1.trailAccumulator
    expect(state.ship.escapeMode!.phase).toBe(EscapeModePhase.charge)

    const result2 = tickEscapeMode(state.ship, ESCAPE_MODE.chargeDuration / 2 + 0.001, acc)
    state = { ...state, ship: result2.ship }
    expect(state.ship.escapeMode!.phase).toBe(EscapeModePhase.dash)
    expect(state.ship.escapeMode!.timer).toBeCloseTo(ESCAPE_MODE.dashDuration)
  })

  it('dash phase spawns flame trail particles and ends after dashDuration', () => {
    let state = tryActivateSpaceMetalAbility(ready(), SpaceMetalAbilityKind.escapeDash)
    let acc = 0
    // Skip past charge.
    let result = tickEscapeMode(state.ship, ESCAPE_MODE.chargeDuration + 0.001, acc)
    state = { ...state, ship: result.ship }
    acc = result.trailAccumulator

    // Tick the dash forward — should spawn particles.
    result = tickEscapeMode(state.ship, 0.1, acc)
    expect(result.particles.length).toBeGreaterThan(0)
    state = { ...state, ship: result.ship }
    acc = result.trailAccumulator

    // Finish the dash.
    result = tickEscapeMode(state.ship, ESCAPE_MODE.dashDuration + 0.001, acc)
    expect(result.ship.escapeMode).toBeNull()
  })

  it('applyDamageToShip is a no-op while Escape Mode is active', () => {
    const state = tryActivateSpaceMetalAbility(ready(), SpaceMetalAbilityKind.escapeDash)
    const damaged = applyDamageToShip(state.ship, 9999)
    expect(damaged.hp).toBe(state.ship.hp)
    expect(damaged.shield).toBe(state.ship.shield)
  })

  it('integrates into updateGameState: ship survives heavy damage during escape', () => {
    let state = ready()
    state = { ...state, phase: GamePhase.playing }
    state = tryActivateSpaceMetalAbility(state, SpaceMetalAbilityKind.escapeDash)
    const hpBefore = state.ship.hp
    state = updateGameState(state, 0.016, {
      clicks: [],
      selectedAbility: AbilityKind.meteorite,
      holdPos: null,
      isHolding: false,
    })
    state = { ...state, ship: applyDamageToShip(state.ship, 50) }
    expect(state.ship.hp).toBe(hpBefore)
  })
})
