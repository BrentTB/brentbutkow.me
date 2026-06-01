import { describe, it, expect, beforeEach } from 'vitest'
import { createInitialState, startGame, startNextWave, updateGameState } from './game-loop'
import { resetUid } from './entities'

beforeEach(() => {
  resetUid()
  localStorage.clear()
})

describe('createInitialState', () => {
  it('starts in menu phase', () => {
    const state = createInitialState()
    expect(state.phase).toBe('menu')
    expect(state.wave).toBe(0)
    expect(state.score).toBe(0)
  })
})

describe('startGame', () => {
  it('transitions to playing phase', () => {
    const initial = createInitialState()
    const started = startGame(initial)
    expect(started.phase).toBe('playing')
  })

  it('creates a ship with full health', () => {
    const state = startGame(createInitialState())
    const waved = startNextWave(state)
    expect(waved.ship.hp).toBe(waved.ship.maxHp)
  })
})

describe('startNextWave', () => {
  it('increments wave and spawns enemies', () => {
    let state = startGame(createInitialState())
    state = startNextWave(state)
    expect(state.wave).toBe(1)
    expect(state.enemies.length).toBeGreaterThan(0)
  })
})

describe('updateGameState', () => {
  it('does nothing when not playing', () => {
    const state = createInitialState()
    const updated = updateGameState(state, 0.016, { clicks: [], selectedAbility: null })
    expect(updated.phase).toBe('menu')
  })

  it('moves enemies toward ship over time', () => {
    let state = startGame(createInitialState())
    state = startNextWave(state)
    const enemyBefore = state.enemies[0]
    const distBefore = Math.sqrt(
      (enemyBefore.pos.x - state.ship.pos.x) ** 2 + (enemyBefore.pos.y - state.ship.pos.y) ** 2
    )

    const updated = updateGameState(state, 0.5, { clicks: [], selectedAbility: null })
    const enemyAfter = updated.enemies.find((e) => e.id === enemyBefore.id)
    if (enemyAfter) {
      const distAfter = Math.sqrt(
        (enemyAfter.pos.x - updated.ship.pos.x) ** 2 + (enemyAfter.pos.y - updated.ship.pos.y) ** 2
      )
      expect(distAfter).toBeLessThan(distBefore)
    }
  })

  it('ship auto-attacks enemies in range', () => {
    let state = startGame(createInitialState())
    state = startNextWave(state)
    state = {
      ...state,
      enemies: state.enemies.map((e) => ({
        ...e,
        pos: { x: state.ship.pos.x + 50, y: state.ship.pos.y },
      })),
    }

    const updated = updateGameState(state, 0.016, { clicks: [], selectedAbility: null })
    expect(updated.projectiles.length).toBeGreaterThan(0)
  })

  it('game over when ship hp reaches 0', () => {
    let state = startGame(createInitialState())
    state = startNextWave(state)
    state = {
      ...state,
      ship: { ...state.ship, hp: 1 },
      enemies: state.enemies.map((e) => ({
        ...e,
        pos: { ...state.ship.pos },
      })),
    }

    const updated = updateGameState(state, 0.016, { clicks: [], selectedAbility: null })
    expect(updated.phase).toBe('gameOver')
  })
})
