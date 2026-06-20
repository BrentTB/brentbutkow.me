import { describe, it, expect } from 'vitest'
import { runHoldAbility } from './hold-runtime'
import type { HoldAbilityConfig, HoldBag } from './hold-runtime'
import { AbilityKind } from '../types'
import type { Ability, HoldRuntimeState } from '../types'

const ability: Ability = {
  kind: AbilityKind.singularity,
  cooldown: 0,
  cooldownRemaining: 0,
  powerCost: 10,
  damage: 0,
  aoeRadius: 100,
  unlocked: true,
  unlockedAt: 0,
}

// onRelease bumps power by a sentinel so a fired release is detectable.
const RELEASE_MARK = 999
const config: HoldAbilityConfig = {
  armSeconds: 1,
  onRelease: (bag) => ({ ...bag, power: bag.power + RELEASE_MARK }),
}

function bag(power = 100): HoldBag {
  return { enemies: [], particles: [], power, killedEnemies: [], asteroids: [] }
}

const ACTIVE: HoldRuntimeState = { active: true, timer: 0, target: { x: 5, y: 5 } }
const INACTIVE: HoldRuntimeState = { active: false, timer: 0, target: null }

function run(
  state: HoldRuntimeState,
  requested: boolean,
  holdPos: { x: number; y: number } | null,
  b = bag()
) {
  return runHoldAbility({ config, ability, state, requested, holdPos, bag: b, dt: 0.1 })
}

describe('runHoldAbility — onRelease', () => {
  it('fires the release burst on the active → inactive edge (player let go)', () => {
    const result = run(ACTIVE, false, null)
    expect(result.state.active).toBe(false)
    expect(result.bag.power).toBe(100 + RELEASE_MARK)
  })

  it('does NOT fire when the ability was never active', () => {
    const result = run(INACTIVE, false, null)
    expect(result.bag.power).toBe(100)
  })

  it('does NOT fire while the hold continues', () => {
    const result = run(ACTIVE, true, { x: 1, y: 1 })
    expect(result.state.active).toBe(true)
    expect(result.bag.power).toBeLessThan(100) // drained, not release-bumped
  })

  it('fires the release burst when power runs out mid-hold', () => {
    // power 5, drain = powerCost(10) × dt(0.1)... not enough to hit 0 in one frame,
    // so start at exactly the drain so it bottoms out.
    const result = run(ACTIVE, true, { x: 1, y: 1 }, bag(1))
    expect(result.state.active).toBe(false)
    expect(result.bag.power).toBeGreaterThanOrEqual(RELEASE_MARK)
  })

  it('accumulates active hold time and threads it into onRelease', () => {
    let captured = -1
    const cfg: HoldAbilityConfig = {
      armSeconds: 1,
      onRelease: (b, _a, _p, heldSeconds) => {
        captured = heldSeconds
        return b
      },
    }
    const hold = { x: 1, y: 1 }
    // Frame 1: arm + accumulate one step.
    const r1 = runHoldAbility({
      config: cfg,
      ability,
      state: INACTIVE,
      requested: true,
      holdPos: hold,
      bag: bag(),
      dt: 0.1,
    })
    expect(r1.state.active).toBe(true)
    expect(r1.state.timer).toBeCloseTo(0.1, 5)
    // Frame 2: keep holding — timer grows.
    const r2 = runHoldAbility({
      config: cfg,
      ability,
      state: r1.state,
      requested: true,
      holdPos: hold,
      bag: bag(),
      dt: 0.1,
    })
    expect(r2.state.timer).toBeCloseTo(0.2, 5)
    // Frame 3: release — onRelease receives the accumulated hold time.
    runHoldAbility({
      config: cfg,
      ability,
      state: r2.state,
      requested: false,
      holdPos: null,
      bag: bag(),
      dt: 0.1,
    })
    expect(captured).toBeCloseTo(0.2, 5)
  })
})
