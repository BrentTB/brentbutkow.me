import { describe, it, expect } from 'vitest'
import { devJumpToBoss, devJumpToUpgrades, devPatchState } from './dev-tools'
import { createInitialState, startGame, startNextWave } from './game-loop'
import { EnemyKind, GamePhase, ShipKind } from './types'
import { WAVES_PER_LEVEL } from '../data'

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
})

describe('devJumpToUpgrades', () => {
  it('opens the upgrade screen on the next upgrade wave with a cleared field', () => {
    const state = devJumpToUpgrades(playingState())
    expect(state.phase).toBe(GamePhase.upgradeScreen)
    expect(state.enemies).toEqual([])
    expect(state.spawnQueue).toEqual([])
    expect(state.wave % WAVES_PER_LEVEL).toBe(0)
  })
})

describe('devJumpToBoss', () => {
  it('queues exactly the upcoming boss and advances the selection', () => {
    const before = playingState()
    const state = devJumpToBoss(before)
    expect(state.phase).toBe(GamePhase.playing)
    expect(state.spawnQueue).toEqual([before.bossSelection.nextBoss])
    expect(state.totalWaveEnemies).toBe(1)
    expect(state.bossSelection.nextBoss).not.toBe(before.bossSelection.nextBoss)
  })
})
