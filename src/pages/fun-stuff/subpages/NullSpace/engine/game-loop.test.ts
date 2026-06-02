import { describe, it, expect, beforeEach } from 'vitest'
import {
  createInitialState,
  startGame,
  startNextWave,
  updateGameState,
  applyUpgradeToState,
} from './game-loop'
import { resetUid, createEnemy } from './entities'
import { AbilityKind, CollectibleKind, EffectKind, EnemyKind, GamePhase, UpgradeId } from './types'
import { isUpgradeWave } from './upgrades'
import { ENEMY_STATS, WAVES_PER_LEVEL } from '../data'

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

// These tests catch a class of bugs where updateGameState mutates a local
// variable but forgets to thread it through the returned state. `...state`
// in the return statement silently provides every required GameState field,
// so TypeScript can't detect a missing field — only behavioral tests can.
// Any future scalar/array field added to GameState that is locally mutated
// inside updateGameState should get a similar test below.
describe('updateGameState — state field round-trip persistence', () => {
  function injectCollectible(
    state: ReturnType<typeof createInitialState>,
    collectible: ReturnType<typeof createInitialState>['collectibles'][number]
  ) {
    return { ...state, collectibles: [...state.collectibles, collectible] }
  }

  it('clicking on space metal increments state.spaceMetal in the returned state', () => {
    let state = startGame(createInitialState())
    state = startNextWave(state)
    state = injectCollectible(state, {
      id: 'metal-1',
      kind: CollectibleKind.spaceMetal,
      pos: { x: 1500, y: 1500 },
      vel: { x: 0, y: 0 },
      value: 1,
      elapsed: 0,
      lifetime: 12,
      homing: false,
    })

    const before = state.spaceMetal
    state = updateGameState(state, 1 / 60, {
      clicks: [{ x: 1500, y: 1500 }],
      selectedAbility: null,
    })

    expect(state.spaceMetal).toBe(before + 1)
  })

  it('clicked space metal is removed from state.collectibles in the returned state', () => {
    let state = startGame(createInitialState())
    state = startNextWave(state)
    state = injectCollectible(state, {
      id: 'metal-1',
      kind: CollectibleKind.spaceMetal,
      pos: { x: 1500, y: 1500 },
      vel: { x: 0, y: 0 },
      value: 1,
      elapsed: 0,
      lifetime: 12,
      homing: false,
    })

    state = updateGameState(state, 1 / 60, {
      clicks: [{ x: 1500, y: 1500 }],
      selectedAbility: null,
    })

    expect(state.collectibles.find((c) => c.id === 'metal-1')).toBeUndefined()
  })

  it('state.spaceMetal persists across many frames after being incremented', () => {
    let state = startGame(createInitialState())
    state = startNextWave(state)
    state = injectCollectible(state, {
      id: 'metal-1',
      kind: CollectibleKind.spaceMetal,
      pos: { x: 1500, y: 1500 },
      vel: { x: 0, y: 0 },
      value: 1,
      elapsed: 0,
      lifetime: 12,
      homing: false,
    })

    state = updateGameState(state, 1 / 60, {
      clicks: [{ x: 1500, y: 1500 }],
      selectedAbility: null,
    })
    expect(state.spaceMetal).toBe(1)

    for (let i = 0; i < 60; i++) {
      state = updateGameState(state, 1 / 60, { clicks: [], selectedAbility: null })
    }
    expect(state.spaceMetal).toBe(1)
  })

  it('power orb at the ship is consumed: removed from collectibles, power increases', () => {
    let state = startGame(createInitialState())
    state = startNextWave(state)
    state = { ...state, power: 50 }
    state = injectCollectible(state, {
      id: 'orb-1',
      kind: CollectibleKind.powerOrb,
      pos: { x: state.ship.pos.x, y: state.ship.pos.y },
      vel: { x: 0, y: 0 },
      value: 10,
      elapsed: 1,
      lifetime: 12,
      homing: true,
    })

    state = updateGameState(state, 1 / 60, { clicks: [], selectedAbility: null })

    expect(state.collectibles.find((c) => c.id === 'orb-1')).toBeUndefined()
    expect(state.power).toBeGreaterThan(50)
  })

  it('uncollected power orbs remain in state.collectibles across frames', () => {
    let state = startGame(createInitialState())
    state = startNextWave(state)
    state = injectCollectible(state, {
      id: 'far-orb',
      kind: CollectibleKind.powerOrb,
      pos: { x: 50, y: 50 },
      vel: { x: 0, y: 0 },
      value: 5,
      elapsed: 0,
      lifetime: 12,
      homing: false,
    })

    state = updateGameState(state, 1 / 60, { clicks: [], selectedAbility: null })
    expect(state.collectibles.find((c) => c.id === 'far-orb')).toBeDefined()
  })

  it('manually-set spaceMetal value is preserved through a tick (no clicks)', () => {
    let state = startGame(createInitialState())
    state = startNextWave(state)
    state = { ...state, spaceMetal: 7 }

    state = updateGameState(state, 1 / 60, { clicks: [], selectedAbility: null })
    expect(state.spaceMetal).toBe(7)
  })

  it('scalar field invariant: spaceMetal only increases when a metal is collected', () => {
    let state = startGame(createInitialState())
    state = startNextWave(state)
    state = { ...state, spaceMetal: 3 }

    // 60 frames of idle play — no metal clicks, no metal in state
    for (let i = 0; i < 60; i++) {
      state = updateGameState(state, 1 / 60, { clicks: [], selectedAbility: null })
    }

    expect(state.spaceMetal).toBe(3)
  })

  it('array field invariant: collectibles spawned by kills appear in the returned state', () => {
    let state = startGame(createInitialState())
    state = startNextWave(state)
    state = updateGameState(state, 0.016, { clicks: [], selectedAbility: null })

    // Place an enemy adjacent to the ship with 1 HP so the ship's auto-attack
    // kills it within a frame or two.
    if (state.enemies.length > 0) {
      const target = state.enemies[0]
      state = {
        ...state,
        enemies: [
          {
            ...target,
            hp: 1,
            pos: { x: state.ship.pos.x + 30, y: state.ship.pos.y },
          },
        ],
      }

      // Tick a few frames for the kill + collectible spawn to land.
      for (let i = 0; i < 4; i++) {
        state = updateGameState(state, 0.016, { clicks: [], selectedAbility: null })
      }

      // Either the orb is still in state.collectibles, or it has already been
      // collected and added to state.power. Either way, the spawn-from-kill
      // path persisted into the returned state.
      const collectedSomething = state.collectibles.length > 0 || state.power > 100
      expect(collectedSomething).toBe(true)
      expect(state.score).toBeGreaterThan(0)
    }
  })
})

// moveChase smooths velocity toward the chase target. The tank's chase vector
// would otherwise flip every frame because the ship is on a Lissajous patrol
// that reverses direction frequently. These tests guard the smoothing — a
// regression to "snap velocity each frame" would produce instant 180° flips.
describe('updateGameState — chase-movement smoothing (tank behaviour)', () => {
  it('a chasing enemy moves toward the ship over one tick', () => {
    let state = startGame(createInitialState())
    state = startNextWave(state)
    state = updateGameState(state, 0.016, { clicks: [], selectedAbility: null })

    state = {
      ...state,
      enemies: state.enemies.map((e) => ({
        ...e,
        pos: { x: state.ship.pos.x + 800, y: state.ship.pos.y },
        vel: { x: 0, y: 0 },
      })),
    }

    const distBefore = Math.abs(state.enemies[0].pos.x - state.ship.pos.x)
    const next = updateGameState(state, 0.5, { clicks: [], selectedAbility: null })
    const after = next.enemies.find((e) => e.id === state.enemies[0].id)
    if (after) {
      const distAfter = Math.abs(after.pos.x - next.ship.pos.x)
      expect(distAfter).toBeLessThan(distBefore)
    }
  })

  it('chase velocity does not snap to the new target in a single frame', () => {
    let state = startGame(createInitialState())
    state = startNextWave(state)
    state = updateGameState(state, 0.016, { clicks: [], selectedAbility: null })

    // Tank moving right (+x) at full speed, ship now to the LEFT.
    state = {
      ...state,
      enemies: state.enemies.map((e) => ({
        ...e,
        speed: 40,
        pos: { x: state.ship.pos.x + 200, y: state.ship.pos.y },
        vel: { x: 40, y: 0 },
      })),
    }

    const next = updateGameState(state, 0.016, { clicks: [], selectedAbility: null })
    const after = next.enemies.find((e) => e.id === state.enemies[0].id)
    // After ONE frame: chase target is -40 (ship is to the left). Without
    // smoothing the snapped vel would be -40 exactly. With smoothing it's
    // between the old (+40) and the target (-40) — i.e. closer to +40 than
    // to -40 for a slow turn rate.
    if (after) {
      expect(after.vel.x).toBeGreaterThan(-40)
      expect(after.vel.x).toBeLessThan(40)
      // Slow enemy (speed=40) → turn rate = 40/30 ≈ 1.33/s →
      // alpha at dt=0.016 ≈ 0.021. Expected vel ≈ 40 + (-40-40)*0.021 ≈ 38.3.
      // Just assert it's still strongly positive (didn't flip).
      expect(after.vel.x).toBeGreaterThan(0)
    }
  })

  it('a faster enemy turns more quickly than a slower one', () => {
    let state = startGame(createInitialState())
    state = startNextWave(state)
    state = updateGameState(state, 0.016, { clicks: [], selectedAbility: null })

    if (state.enemies.length === 0) return

    const baseEnemy = state.enemies[0]
    const slowState = {
      ...state,
      enemies: [
        {
          ...baseEnemy,
          id: 'slow',
          speed: 40,
          pos: { x: state.ship.pos.x + 200, y: state.ship.pos.y },
          vel: { x: 40, y: 0 },
        },
      ],
    }
    const fastState = {
      ...state,
      enemies: [
        {
          ...baseEnemy,
          id: 'fast',
          speed: 150,
          pos: { x: state.ship.pos.x + 200, y: state.ship.pos.y },
          vel: { x: 150, y: 0 },
        },
      ],
    }

    const slowAfter = updateGameState(slowState, 0.05, { clicks: [], selectedAbility: null })
    const fastAfter = updateGameState(fastState, 0.05, { clicks: [], selectedAbility: null })

    // Both started at +speed; target is -speed. Fast enemy should have rotated
    // its velocity further toward the negative direction than the slow one,
    // i.e. velMagOverSpeedRatio is lower (more turned) for the fast enemy.
    const slowAt = slowAfter.enemies.find((e) => e.id === 'slow')
    const fastAt = fastAfter.enemies.find((e) => e.id === 'fast')
    if (slowAt && fastAt) {
      const slowRatio = slowAt.vel.x / 40
      const fastRatio = fastAt.vel.x / 150
      // slowRatio still ~+0.93, fastRatio ~+0.78 — fast turned more.
      expect(fastRatio).toBeLessThan(slowRatio)
    }
  })
})

// updateGameState relies on phase-gating to halt the game when paused. These
// tests guard that a paused game truly stops simulating — no enemy spawns,
// no collectible collection, no power regen, no projectiles moving — so any
// future refactor that bypasses the phase guard is caught immediately.
describe('updateGameState — paused phase halts simulation', () => {
  it('returns the same state object unchanged when phase === paused', () => {
    let state = startGame(createInitialState())
    state = startNextWave(state)
    state = { ...state, phase: GamePhase.paused }

    const result = updateGameState(state, 1 / 60, { clicks: [], selectedAbility: null })
    expect(result).toBe(state)
  })

  it('queued enemies do not spawn while paused', () => {
    let state = startGame(createInitialState())
    state = startNextWave(state)
    const queueBefore = state.spawnQueue.length
    state = { ...state, phase: GamePhase.paused, waveTimer: 0 }

    for (let i = 0; i < 240; i++) {
      state = updateGameState(state, 1 / 60, { clicks: [], selectedAbility: null })
    }

    expect(state.spawnQueue.length).toBe(queueBefore)
    expect(state.enemies.length).toBe(0)
    expect(state.spawnedInWave).toBe(0)
  })

  it('power orbs at the ship are not collected while paused', () => {
    let state = startGame(createInitialState())
    state = startNextWave(state)
    state = {
      ...state,
      phase: GamePhase.paused,
      power: 50,
      collectibles: [
        {
          id: 'orb-paused',
          kind: CollectibleKind.powerOrb,
          pos: { x: state.ship.pos.x, y: state.ship.pos.y },
          vel: { x: 0, y: 0 },
          value: 10,
          elapsed: 1,
          lifetime: 12,
          homing: true,
        },
      ],
    }

    for (let i = 0; i < 30; i++) {
      state = updateGameState(state, 1 / 60, { clicks: [], selectedAbility: null })
    }

    expect(state.power).toBe(50)
    expect(state.collectibles.find((c) => c.id === 'orb-paused')).toBeDefined()
  })

  it('does not regenerate power while paused', () => {
    let state = startGame(createInitialState())
    state = startNextWave(state)
    state = { ...state, phase: GamePhase.paused, power: 100 }

    for (let i = 0; i < 60; i++) {
      state = updateGameState(state, 1 / 60, { clicks: [], selectedAbility: null })
    }

    expect(state.power).toBe(100)
  })
})

// The wave delay (waveTimer > 0) is meant to delay the FIRST enemy spawn of
// the next wave — not to freeze the whole simulation. These tests guard that
// in-flight effects and collectibles keep moving through the delay, so e.g.
// a meteor launched at the end of one wave still descends and detonates
// during the run-up to the next wave.
describe('updateGameState — wave delay only gates spawning', () => {
  it('in-flight meteor strikes keep advancing during the wave delay', () => {
    let state = startGame(createInitialState())
    state = startNextWave(state)
    // Construct a state mimicking the moment right after "Next Wave": waveTimer
    // is positive (1s for wave 2+), an effect is in flight from the prior wave.
    state = {
      ...state,
      wave: 2,
      waveTimer: 1,
      activeEffects: [
        {
          id: 'mid-flight-meteor',
          kind: EffectKind.meteorStrike,
          pos: { x: 1500, y: 1500 },
          elapsed: 0,
          duration: 0.5,
          delay: 0.5,
          damage: 60,
          aoeRadius: 100,
        },
      ],
    }

    const before = state.activeEffects[0].elapsed
    const next = updateGameState(state, 0.1, { clicks: [], selectedAbility: null })
    const after = next.activeEffects.find((e) => e.id === 'mid-flight-meteor')
    expect(after).toBeDefined()
    expect(after!.elapsed).toBeGreaterThan(before)
  })

  it('power orbs in flight keep homing during the wave delay', () => {
    let state = startGame(createInitialState())
    state = startNextWave(state)
    state = {
      ...state,
      wave: 2,
      waveTimer: 1,
      collectibles: [
        {
          id: 'mid-flight-orb',
          kind: CollectibleKind.powerOrb,
          pos: { x: state.ship.pos.x + 50, y: state.ship.pos.y },
          vel: { x: -50, y: 0 },
          value: 5,
          elapsed: 1,
          lifetime: 12,
          homing: true,
        },
      ],
    }

    const before = state.collectibles[0].pos.x
    const next = updateGameState(state, 0.05, { clicks: [], selectedAbility: null })
    const after = next.collectibles.find((c) => c.id === 'mid-flight-orb')
    if (after) {
      expect(after.pos.x).toBeLessThan(before)
    } else {
      // Acceptable: orb may have been collected this frame
      expect(next.power).toBeGreaterThan(state.power)
    }
  })

  it('the wave delay still prevents enemies from spawning', () => {
    let state = startGame(createInitialState())
    state = startNextWave(state)
    state = { ...state, wave: 2, waveTimer: 1, spawnTimer: 0 }
    const queueBefore = state.spawnQueue.length

    const next = updateGameState(state, 0.05, { clicks: [], selectedAbility: null })

    expect(next.spawnQueue.length).toBe(queueBefore)
    expect(next.enemies.length).toBe(0)
    expect(next.spawnedInWave).toBe(0)
  })

  it('the wave timer decrements down to zero', () => {
    let state = startGame(createInitialState())
    state = startNextWave(state)
    state = { ...state, wave: 2, waveTimer: 0.5 }

    const next = updateGameState(state, 0.1, { clicks: [], selectedAbility: null })
    expect(next.waveTimer).toBeCloseTo(0.4, 5)
  })
})

// The bomber's defining mechanic is its on-death explosion. It must fire on
// EVERY death path — including the most common one, dying by ramming the ship
// (handled by resolveEnemyShipCollisions, separate from ability/projectile
// kills). A regression here would silently reduce the bomber to its trivial
// contact damage.
describe('updateGameState — bomber explodes on death (including by ramming)', () => {
  it('a bomber killed by ramming the ship deals its explosion AoE, not just contact', () => {
    let state = startGame(createInitialState())
    state = startNextWave(state)

    const shipPos = state.ship.pos
    // A bomber sitting on the ship with effectively unkillable HP, so the only
    // way it leaves this frame is by ramming — exercising the ship-collision
    // death path (not the projectile/ability paths).
    state = {
      ...state,
      spawnQueue: [],
      waveTimer: 0,
      projectiles: [],
      enemies: [{ ...createEnemy(EnemyKind.bomber, { x: shipPos.x, y: shipPos.y }), hp: 100000 }],
    }

    const before = state.ship.hp
    const next = updateGameState(state, 1 / 60, { clicks: [], selectedAbility: null })

    // The bomber is destroyed by the ram...
    expect(next.enemies.some((e) => e.kind === EnemyKind.bomber)).toBe(false)
    // ...and the ship took at least the explosion AoE on top of contact damage.
    // Pre-fix this path skipped resolveDeathEffects, so hpLost was only the
    // bomber's contact damage (well under explosionDamage).
    const hpLost = before - next.ship.hp
    expect(hpLost).toBeGreaterThanOrEqual(ENEMY_STATS.bomber.explosionDamage)
  })
})

// Swarm enemies weave side-to-side. That oscillation must be driven by the
// enemy's own (speed-scaled) age — game time — not the wall clock, so it stays
// deterministic, testable, and in sync with the game-speed setting. A
// regression to Date.now() would make the path independent of enemy.age.
describe('updateGameState — swarm weave is driven by game time, not wall-clock', () => {
  it('the weave reads enemy.age (twins differing only in age move differently)', () => {
    let state = startGame(createInitialState())
    state = startNextWave(state)
    const pos = { x: state.ship.pos.x + 300, y: state.ship.pos.y }
    // Two swarm "twins": identical id (→ identical phase offset) and start
    // position, differing only in age. Processed in ONE tick (shared Date.now),
    // age is the only thing that can make them diverge — and the age-driven
    // weave does. A wall-clock weave would move them identically.
    const twinA = { ...createEnemy(EnemyKind.swarm, pos), id: 'twin', age: 0 }
    const twinB = { ...createEnemy(EnemyKind.swarm, pos), id: 'twin', age: 0.6 }
    state = { ...state, spawnQueue: [], waveTimer: 0, enemies: [twinA, twinB] }

    const next = updateGameState(state, 1 / 60, { clicks: [], selectedAbility: null })
    const [a, b] = next.enemies
    expect(a.pos.x !== b.pos.x || a.pos.y !== b.pos.y).toBe(true)
  })

  it('advances enemy age by the (speed-scaled) dt each tick', () => {
    let state = startGame(createInitialState())
    state = startNextWave(state)
    const swarm = {
      ...createEnemy(EnemyKind.swarm, { x: state.ship.pos.x + 300, y: state.ship.pos.y }),
      age: 0,
    }
    state = { ...state, spawnQueue: [], waveTimer: 0, enemies: [swarm] }
    const next = updateGameState(state, 0.05, { clicks: [], selectedAbility: null })
    expect(next.enemies.find((e) => e.id === swarm.id)!.age).toBeCloseTo(0.05, 5)
  })
})

// A bomber's death explosion damages the ship if it's within range. The
// shield should eat the blast ONLY when the ship is INSIDE the dome AND the
// bomber is OUTSIDE the dome — every other combination still hurts.
describe('updateGameState — shield blocks bomber explosions', () => {
  function shieldEffect(centerOn: { x: number; y: number }, radius = 120) {
    return {
      id: 'test-shield',
      kind: EffectKind.shield,
      pos: { x: centerOn.x, y: centerOn.y },
      elapsed: 0,
      duration: 6,
      radius,
      grandfatheredEnemyIds: [] as string[],
    }
  }

  it('BLOCKS when ship is inside and bomber is outside', () => {
    let state = startGame(createInitialState())
    state = startNextWave(state)
    const bomber = {
      ...createEnemy(EnemyKind.bomber, { x: state.ship.pos.x + 30, y: state.ship.pos.y }),
      hp: 1,
    }
    state = {
      ...state,
      ship: { ...state.ship, hp: 100 },
      enemies: [bomber],
      activeEffects: [...state.activeEffects, shieldEffect(state.ship.pos, 20)],
    }
    for (let i = 0; i < 30 && state.enemies.length > 0; i++) {
      state = updateGameState(state, 0.05, { clicks: [], selectedAbility: null })
    }
    expect(state.ship.hp).toBe(100)
  })

  it('does NOT block when bomber is inside the same shield as the ship', () => {
    let state = startGame(createInitialState())
    state = startNextWave(state)
    const bomber = {
      ...createEnemy(EnemyKind.bomber, { x: state.ship.pos.x + 30, y: state.ship.pos.y }),
      hp: 1,
    }
    // Grandfather the bomber so the shield doesn't push it out — we want to
    // exercise the "bomber inside dome" branch of resolveDeathEffects.
    const shield = { ...shieldEffect(state.ship.pos, 200), grandfatheredEnemyIds: [bomber.id] }
    state = {
      ...state,
      ship: { ...state.ship, hp: 100 },
      enemies: [bomber],
      activeEffects: [...state.activeEffects, shield],
    }
    for (let i = 0; i < 30 && state.enemies.length > 0; i++) {
      state = updateGameState(state, 0.05, { clicks: [], selectedAbility: null })
    }
    expect(state.ship.hp).toBeLessThan(100)
  })

  it('does NOT block when ship is outside the shield', () => {
    let state = startGame(createInitialState())
    state = startNextWave(state)
    const bomber = {
      ...createEnemy(EnemyKind.bomber, { x: state.ship.pos.x + 30, y: state.ship.pos.y }),
      hp: 1,
    }
    state = {
      ...state,
      ship: { ...state.ship, hp: 100 },
      enemies: [bomber],
      activeEffects: [
        ...state.activeEffects,
        shieldEffect({ x: state.ship.pos.x + 1000, y: state.ship.pos.y }, 120),
      ],
    }
    for (let i = 0; i < 30 && state.enemies.length > 0; i++) {
      state = updateGameState(state, 0.05, { clicks: [], selectedAbility: null })
    }
    expect(state.ship.hp).toBeLessThan(100)
  })
})
