import { describe, it, expect, beforeEach } from 'vitest'
import {
  createInitialState,
  startGame,
  startNextWave,
  updateGameState,
  applyUpgradeToState,
} from './game-loop'
import { resetUid } from './entities'
import { AbilityKind, GamePhase, UpgradeId } from './types'
import { isUpgradeWave } from './upgrades'
import { WAVES_PER_LEVEL } from '../data'

beforeEach(() => {
  resetUid()
  localStorage.clear()
})

describe('createInitialState', () => {
  it('starts in menu phase', () => {
    const state = createInitialState()
    expect(state.phase).toBe(GamePhase.menu)
    expect(state.wave).toBe(0)
    expect(state.score).toBe(0)
    expect(state.currency).toBe(0)
    expect(state.level).toBe(0)
  })
})

describe('startGame', () => {
  it('transitions to playing phase', () => {
    const initial = createInitialState()
    const started = startGame(initial)
    expect(started.phase).toBe(GamePhase.playing)
    expect(started.currency).toBe(0)
  })

  it('creates a ship with full health', () => {
    const state = startGame(createInitialState())
    const waved = startNextWave(state)
    expect(waved.ship.hp).toBe(waved.ship.maxHp)
  })
})

describe('startNextWave', () => {
  it('increments wave and queues enemies for spawning', () => {
    let state = startGame(createInitialState())
    state = startNextWave(state)
    expect(state.wave).toBe(1)
    expect(state.spawnQueue.length).toBeGreaterThan(0)
    expect(state.totalWaveEnemies).toBe(state.spawnQueue.length)
    expect(state.spawnedInWave).toBe(0)
    expect(state.level).toBe(1)
  })
})

describe('updateGameState', () => {
  it('does nothing when not playing', () => {
    const state = createInitialState()
    const updated = updateGameState(state, 0.016, { clicks: [], selectedAbility: null })
    expect(updated.phase).toBe(GamePhase.menu)
  })

  it('moves enemies toward ship over time', () => {
    let state = startGame(createInitialState())
    state = startNextWave(state)
    // Tick once to spawn an enemy from the queue
    state = updateGameState(state, 0.016, { clicks: [], selectedAbility: null })
    expect(state.enemies.length).toBeGreaterThan(0)

    // Place enemy far from ship so patrol movement doesn't dominate
    state = {
      ...state,
      enemies: state.enemies.map((e) => ({
        ...e,
        pos: { x: state.ship.pos.x + 800, y: state.ship.pos.y },
      })),
    }

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
    // Tick to spawn an enemy, then move it into range
    state = updateGameState(state, 0.016, { clicks: [], selectedAbility: null })
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
    // Tick to spawn enemies from queue
    state = updateGameState(state, 0.016, { clicks: [], selectedAbility: null })
    state = {
      ...state,
      ship: { ...state.ship, hp: 1 },
      enemies: state.enemies.map((e) => ({
        ...e,
        pos: { ...state.ship.pos },
      })),
    }

    const updated = updateGameState(state, 0.016, { clicks: [], selectedAbility: null })
    expect(updated.phase).toBe(GamePhase.gameOver)
  })

  it('flags a new high score only when the score beats the previous best', () => {
    let state = startGame(createInitialState())
    state = startNextWave(state)
    // Tick to spawn enemies from queue
    state = updateGameState(state, 0.016, { clicks: [], selectedAbility: null })
    const dying = {
      ...state,
      ship: { ...state.ship, hp: 1 },
      enemies: state.enemies.map((e) => ({ ...e, pos: { ...state.ship.pos } })),
    }

    const beaten = updateGameState({ ...dying, score: 100, highScore: 50 }, 0.016, {
      clicks: [],
      selectedAbility: null,
    })
    expect(beaten.isNewHighScore).toBe(true)

    const tied = updateGameState({ ...dying, score: 50, highScore: 50 }, 0.016, {
      clicks: [],
      selectedAbility: null,
    })
    expect(tied.isNewHighScore).toBe(false)
  })

  it('shows upgrade screen after completing the 3rd wave', () => {
    let state = startGame(createInitialState())
    state = { ...state, wave: WAVES_PER_LEVEL, phase: GamePhase.playing }
    state = {
      ...state,
      enemies: [],
      spawnQueue: [],
      totalWaveEnemies: 1,
      spawnedInWave: 1,
      waveTimer: 0,
    }
    state = updateGameState(state, 0.016, { clicks: [], selectedAbility: null })
    expect(state.phase).toBe(GamePhase.upgradeScreen)
  })

  it('shows correct phase after wave completion', () => {
    let state = startGame(createInitialState())
    state = startNextWave(state)
    state = {
      ...state,
      enemies: [],
      spawnQueue: [],
      spawnedInWave: state.totalWaveEnemies,
      waveTimer: 0,
    }
    state = updateGameState(state, 0.016, { clicks: [], selectedAbility: null })
    const expected = isUpgradeWave(state.wave) ? GamePhase.upgradeScreen : GamePhase.waveComplete
    expect(state.phase).toBe(expected)
  })
})

describe('applyUpgradeToState', () => {
  it('deducts currency and upgrades ability', () => {
    let state = startGame(createInitialState())
    state = { ...state, currency: 50 }
    const before = state.currency
    const upgraded = applyUpgradeToState(state, UpgradeId.meteoriteDamage)
    expect(upgraded.currency).toBeLessThan(before)
    expect(upgraded.upgrades[UpgradeId.meteoriteDamage].currentTier).toBe(1)
  })

  it('does nothing when insufficient currency', () => {
    let state = startGame(createInitialState())
    state = { ...state, currency: 0 }
    const upgraded = applyUpgradeToState(state, UpgradeId.meteoriteDamage)
    expect(upgraded.currency).toBe(0)
    expect(upgraded.upgrades[UpgradeId.meteoriteDamage].currentTier).toBe(0)
  })

  it('unlocking meteor makes it usable', () => {
    let state = startGame(createInitialState())
    state = { ...state, currency: 50 }
    const upgraded = applyUpgradeToState(state, UpgradeId.unlockMeteor)
    const meteor = upgraded.abilities.find((a) => a.kind === AbilityKind.meteor)
    expect(meteor!.unlocked).toBe(true)
  })
})
