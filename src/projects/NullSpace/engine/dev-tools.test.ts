import { describe, it, expect } from 'vitest'
import { devJumpToBoss, devJumpToUpgrades, devPatchState } from './dev-tools'
import { createInitialState, startGame, startNextWave } from './game-loop'
import { EnemyKind, GamePhase, ShipKind } from './types'
import { WAVES_PER_LEVEL, WORLD_SIZE } from '../data'

// Every sector resets the ship to the centre of the torus.
const worldCenter = { x: WORLD_SIZE.x / 2, y: WORLD_SIZE.y / 2 }

function playingState() {
  return startNextWave(startGame(createInitialState(), ShipKind.fighter))
}

describe('devPatchState', () => {
  it('merges scalar fields, leaving unspecified ones alone', () => {
    const state = playingState()
    const patched = devPatchState(state, { currency: 999, power: 5 })
    expect(patched.currency).toBe(999)
    expect(patched.power).toBe(5)
    expect(patched.score).toBe(state.score)
    expect(patched.wave).toBe(state.wave)
  })

  it('swapping ship kind keeps position and heading but takes the new stats', () => {
    const state = playingState()
    const patched = devPatchState(state, { shipKind: ShipKind.interceptor })
    expect(patched.shipKind).toBe(ShipKind.interceptor)
    expect(patched.ship.pos).toEqual(state.ship.pos)
    expect(patched.ship.kind).toBe(ShipKind.interceptor)
  })

  it('overriding nextBoss leaves the selection pool untouched', () => {
    const state = playingState()
    const patched = devPatchState(state, { nextBoss: EnemyKind.phaseShifter })
    expect(patched.bossSelection.nextBoss).toBe(EnemyKind.phaseShifter)
    expect(patched.bossSelection.pool).toEqual(state.bossSelection.pool)
  })

  it('a wave jump resets the sector — ship dropped at the world centre', () => {
    const state = playingState()
    const patched = devPatchState(state, { wave: WAVES_PER_LEVEL * 2 })
    expect(patched.wave).toBe(WAVES_PER_LEVEL * 2)
    expect(patched.ship.pos).toEqual(worldCenter)
  })

  it('a patch without a wave jump leaves the ship position untouched', () => {
    const state = playingState()
    const patched = devPatchState(state, { currency: 50 })
    expect(patched.ship.pos).toEqual(state.ship.pos)
  })
})

describe('devJumpToUpgrades', () => {
  it('opens the between-sector shop in a fresh sector with a cleared field', () => {
    const state = devJumpToUpgrades(playingState())
    expect(state.phase).toBe(GamePhase.upgradeScreen)
    expect(state.enemies).toEqual([])
    expect(state.spawn.queue).toEqual([])
    // Post-warp: the first wave of a sector (one past an upgrade boundary).
    expect((state.wave - 1) % WAVES_PER_LEVEL).toBe(0)
  })
})

describe('devJumpToBoss', () => {
  it('queues exactly the upcoming boss and advances the selection', () => {
    const before = playingState()
    const state = devJumpToBoss(before)
    expect(state.phase).toBe(GamePhase.playing)
    expect(state.spawn.queue).toEqual([before.bossSelection.nextBoss])
    expect(state.spawn.total).toBe(1)
    expect(state.bossSelection.nextBoss).not.toBe(before.bossSelection.nextBoss)
  })

  it('resets a fresh boss sector — ship at the centre, no hazard field', () => {
    const state = devJumpToBoss(playingState())
    expect(state.ship.pos).toEqual(worldCenter)
    // Boss sectors never scatter mines — the boss is the gate.
    expect(state.hazards).toEqual([])
  })
})
