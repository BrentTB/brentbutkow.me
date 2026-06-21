import { describe, it, expect } from 'vitest'
import { ABILITY_DEFINITIONS } from '..'
import { createEventHorizonEffect } from './event-horizon'
import { updateActiveEffects } from '../../systems/effects'
import { BLACK_HOLE, EVENT_HORIZON } from '../ability-data'
import { createShip, createEnemy } from '../../entities/entity-creator'
import { createInitialUpgrades } from '../../upgrades'
import { distance } from '../../math/collision'
import { AbilityKind, EffectKind, EnemyKind, ShipKind } from '../../types'
import { UpgradeId } from '../../upgrade-ids'
import type { Ability } from '../../types'
import { WORLD_SIZE } from '../../../data'

const eventHorizon = ABILITY_DEFINITIONS[AbilityKind.eventHorizon]
const ship = createShip(ShipKind.fighter, WORLD_SIZE)
const BASE_PULL = BLACK_HOLE.pullStrength * EVENT_HORIZON.pullScale

function makeAbility(overrides: Partial<Ability> = {}): Ability {
  return {
    ...eventHorizon.base(),
    cooldownRemaining: 0,
    unlocked: true,
    unlockedAt: 0,
    ...overrides,
  }
}

describe('eventHorizon', () => {
  it('is registered as the black hole ultimate', () => {
    expect(eventHorizon.ultimateOf).toBe(AbilityKind.blackHole)
  })

  it('costs the black hole cost × the multiplier and widens the radius', () => {
    expect(makeAbility().powerCost).toBe(BLACK_HOLE.powerCost * EVENT_HORIZON.costMultiplier)
    expect(makeAbility().aoeRadius).toBe(BLACK_HOLE.radius * EVENT_HORIZON.radiusScale)
  })

  it('spawns a single event horizon effect with a derived core radius', () => {
    const effects = eventHorizon.effectFactory!(makeAbility(), { x: 0, y: 0 }, ship)
    expect(effects.length).toBe(1)
    expect(effects[0].kind).toBe(EffectKind.eventHorizon)
    const eff = effects[0] as ReturnType<typeof createEventHorizonEffect>
    expect(eff.coreRadius).toBeCloseTo(eff.radius * EVENT_HORIZON.coreRadiusFraction, 5)
  })

  it('pulls enemies toward the center', () => {
    const eff = createEventHorizonEffect({ x: 500, y: 500 }, 180, BASE_PULL, BLACK_HOLE.damage, 4)
    const enemy = createEnemy(EnemyKind.drone, { x: 640, y: 500 }) // inside radius, outside core
    const before = distance(enemy.pos, { x: 500, y: 500 })
    const result = updateActiveEffects([eff], [enemy], [], ship, WORLD_SIZE, 0.1)
    const after = result.enemies.find((e) => e.id === enemy.id)!
    expect(distance(after.pos, { x: 500, y: 500 })).toBeLessThan(before)
  })

  it('banishes an enemy that reaches the core — further from the ship + core damage', () => {
    const player = { ...ship, pos: { x: 100, y: 100 } }
    const eff = createEventHorizonEffect({ x: 300, y: 300 }, 180, BASE_PULL, BLACK_HOLE.damage, 4)
    // High HP so it survives the core hit and shows up (moved) in the result.
    const enemy = { ...createEnemy(EnemyKind.tank, { x: 300, y: 300 }), hp: 9999, maxHp: 9999 }
    const before = distance(enemy.pos, player.pos)
    const result = updateActiveEffects([eff], [enemy], [], player, WORLD_SIZE, 0.1)
    const after = result.enemies.find((e) => e.id === enemy.id)!
    expect(distance(after.pos, player.pos)).toBeGreaterThan(before)
    expect(after.hp).toBe(9999 - EVENT_HORIZON.coreDamage)
  })

  it('the Spaghettification upgrade raises the pull strength', () => {
    const upgrades = createInitialUpgrades()
    expect(eventHorizon.applyUpgrades!(makeAbility(), upgrades).force).toBe(BASE_PULL)
    upgrades[UpgradeId.eventHorizonPull] = { currentTier: 1 }
    const patch = eventHorizon.applyUpgrades!(makeAbility(), upgrades)
    expect(patch.force).toBeGreaterThan(BASE_PULL)
  })

  it('inherits the black hole damage upgrade', () => {
    const upgrades = createInitialUpgrades()
    upgrades[UpgradeId.blackHoleDamage] = { currentTier: 1 }
    const patch = eventHorizon.applyUpgrades!(makeAbility(), upgrades)
    expect(patch.damage).toBe(BLACK_HOLE.damage + 1) // black hole damage tier 1 = +1
  })
})
