import { describe, it, expect } from 'vitest'
import { createInitialState } from '../game-loop'
import { CollectibleKind, GamePhase, ShipKind } from '../types'
import { updateEnemyMovement } from '../entities/enemy'
import {
  applyTutorialStepEnter,
  ensureTutorialEnemy,
  pickSpotlightEnemyId,
  startTutorialRun,
} from './demo-wave'
import { TUTORIAL_STEPS } from './tutorial-script'

describe('startTutorialRun', () => {
  const run = () => startTutorialRun(createInitialState())

  it('starts a playing fighter run', () => {
    const state = run()
    expect(state.phase).toBe(GamePhase.playing)
    expect(state.shipKind).toBe(ShipKind.fighter)
  })

  it('places harmless, stationary demo drones ahead', () => {
    const state = run()
    expect(state.enemies.length).toBeGreaterThan(0)
    for (const e of state.enemies) {
      expect(e.damage).toBe(0)
      expect(e.speed).toBe(0)
    }
  })

  it('keeps the wave economy off so wave-complete can never fire', () => {
    const state = run()
    expect(state.spawn.total).toBe(0)
    expect(state.spawn.queue).toEqual([])
  })

  it('lowers the power pool so a few casts drain it', () => {
    const state = run()
    expect(state.maxPower).toBeLessThan(createInitialState().maxPower)
    expect(state.power).toBe(state.maxPower)
  })

  it('unlocks a second ability so the swap beat has a target', () => {
    const state = run()
    expect(state.abilities.filter((a) => a.unlocked).length).toBeGreaterThanOrEqual(2)
  })

  // Regression: demo drones were chase + speed 0, so a slingshot knockback was
  // never damped (chase smooths velocity at a rate of speed/30 = 0) and the drone
  // coasted forever. Stationary movement decays the bump back to rest.
  it('damps a slingshot knockback instead of coasting forever', () => {
    const state = run()
    let drone = { ...state.enemies[0], vel: { x: 240, y: 0 } }
    for (let i = 0; i < 180; i++) {
      drone = updateEnemyMovement([drone], state.ship, [], 1 / 60)[0]
    }
    expect(Math.hypot(drone.vel.x, drone.vel.y)).toBeLessThan(1)
  })
})

describe('ensureTutorialEnemy', () => {
  it('spawns a fresh, harmless drone when none remain', () => {
    const empty = { ...startTutorialRun(createInitialState()), enemies: [] }
    const refilled = ensureTutorialEnemy(empty)
    expect(refilled.enemies.length).toBe(1)
    expect(refilled.enemies[0].damage).toBe(0)
  })

  it('leaves the state untouched while an enemy still lives', () => {
    const state = startTutorialRun(createInitialState())
    expect(ensureTutorialEnemy(state)).toBe(state)
  })
})

describe('applyTutorialStepEnter', () => {
  const base = () => startTutorialRun(createInitialState())
  const stepWhere = (pred: (s: (typeof TUTORIAL_STEPS)[number]) => boolean) =>
    TUTORIAL_STEPS.find(pred)!

  it('drops a space metal pickup on the collect beat', () => {
    const after = applyTutorialStepEnter(
      base(),
      stepWhere((s) => !!s.spawnsMetal)
    )
    expect(after.collectibles.some((c) => c.kind === CollectibleKind.spaceMetal)).toBe(true)
  })

  it('breaks the shield on the refresh beat', () => {
    const after = applyTutorialStepEnter(
      base(),
      stepWhere((s) => !!s.breaksShield)
    )
    expect(after.ship.shield).toBe(0)
  })

  it('places a mine on the mine beat', () => {
    const after = applyTutorialStepEnter(
      base(),
      stepWhere((s) => !!s.spawnsMine)
    )
    expect(after.hazards.length).toBeGreaterThan(0)
  })
})

describe('pickSpotlightEnemyId', () => {
  it('returns the nearest living enemy id', () => {
    const state = startTutorialRun(createInitialState())
    const id = pickSpotlightEnemyId(state)
    expect(state.enemies.some((e) => e.id === id)).toBe(true)
  })

  it('returns null when no enemies remain', () => {
    const state = { ...startTutorialRun(createInitialState()), enemies: [] }
    expect(pickSpotlightEnemyId(state)).toBeNull()
  })
})
