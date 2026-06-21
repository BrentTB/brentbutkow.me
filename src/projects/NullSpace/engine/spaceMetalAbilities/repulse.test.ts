import { describe, it, expect, beforeEach } from 'vitest'
import { createInitialState, startGame } from '../game-loop'
import { EffectKind, EnemyKind, ProjectileOwner, ShipKind } from '../types'
import type { RepulseFieldEffect } from '../types'
import { SpaceMetalAbilityKind, tryActivateSpaceMetalAbility } from '.'
import { REPULSE, recentreRepulseFields, repulseFieldEffect } from './repulse'
import { applyShieldConstraints } from '../abilities/shield/shield'
import { createEnemy, createProjectile } from '../entities/entity-creator'

beforeEach(() => {
  localStorage.clear()
})

function ready(): ReturnType<typeof createInitialState> {
  return { ...startGame(createInitialState(), ShipKind.fighter), spaceMetal: 5 }
}

function repulseFieldOf(state: ReturnType<typeof createInitialState>): RepulseFieldEffect {
  const field = state.activeEffects.find((e) => e.kind === EffectKind.repulseField)
  if (!field) throw new Error('no repulse field in state')
  return field as RepulseFieldEffect
}

const dist = (a: { x: number; y: number }, b: { x: number; y: number }) =>
  Math.hypot(a.x - b.x, a.y - b.y)

describe('repulse space-metal ability', () => {
  it('activate deducts the cost and spawns one repulse field', () => {
    const state = tryActivateSpaceMetalAbility(ready(), SpaceMetalAbilityKind.repulse)
    expect(state.spaceMetal).toBe(5 - REPULSE.cost)
    expect(state.activeEffects.filter((e) => e.kind === EffectKind.repulseField)).toHaveLength(1)
  })

  it('activation is a no-op without enough space metal', () => {
    const state = { ...ready(), spaceMetal: REPULSE.cost - 1 }
    const result = tryActivateSpaceMetalAbility(state, SpaceMetalAbilityKind.repulse)
    expect(result.spaceMetal).toBe(REPULSE.cost - 1)
    expect(result.activeEffects.filter((e) => e.kind === EffectKind.repulseField)).toHaveLength(0)
  })

  it('the field follows the ship and grows over its life', () => {
    const state = tryActivateSpaceMetalAbility(ready(), SpaceMetalAbilityKind.repulse)
    const field = repulseFieldOf(state)
    const ship = { ...state.ship, pos: { x: 1234, y: 567 } }
    const ctx = { enemies: [], projectiles: [], ship, worldSize: state.worldSize, dt: 0.1 }

    const early = repulseFieldEffect.tick({ ...field, elapsed: 0 }, ctx)
    const late = repulseFieldEffect.tick({ ...field, elapsed: 1 }, ctx)
    const earlyField = early.effect as RepulseFieldEffect
    const lateField = late.effect as RepulseFieldEffect

    // Follows the ship.
    expect(earlyField.pos).toEqual(ship.pos)
    // Grows: starts at startRadius, larger later.
    expect(earlyField.radius).toBeCloseTo(REPULSE.startRadius)
    expect(lateField.radius).toBeGreaterThan(earlyField.radius)
  })

  it('launches enemies outward like the force field (outward velocity + snap to edge)', () => {
    const state = tryActivateSpaceMetalAbility(ready(), SpaceMetalAbilityKind.repulse)
    const field = repulseFieldOf(state)
    const ship = state.ship
    const enemy = createEnemy(EnemyKind.drone, { x: ship.pos.x + 30, y: ship.pos.y })

    // Knockback runs through applyShieldConstraints (shared with Force Field).
    const result = applyShieldConstraints([field], [enemy], 0.016)
    const knocked = result.enemies[0]

    // A real launch: outward velocity along +x at the field's knockback speed,
    // not a per-frame positional nudge. Enemy is snapped out to the field edge.
    expect(knocked.vel.x).toBeCloseTo(REPULSE.knockback)
    expect(Math.abs(knocked.vel.y)).toBeLessThan(1)
    expect(dist(knocked.pos, ship.pos)).toBeCloseTo(field.radius)
  })

  it('recentres the field on the ship so it does not lag a frame behind movement', () => {
    const state = tryActivateSpaceMetalAbility(ready(), SpaceMetalAbilityKind.repulse)
    const moved = { x: 999, y: 111 }
    const next = recentreRepulseFields(state.activeEffects, moved)
    const field = next.find((e) => e.kind === EffectKind.repulseField) as RepulseFieldEffect
    expect(field.pos).toEqual(moved)
  })

  it('recentreRepulseFields returns the same array when no field is active', () => {
    const empty: never[] = []
    expect(recentreRepulseFields(empty, { x: 1, y: 2 })).toBe(empty)
  })

  it('absorbs enemy fire inside the field but leaves ship fire and distant fire', () => {
    const state = tryActivateSpaceMetalAbility(ready(), SpaceMetalAbilityKind.repulse)
    const field = repulseFieldOf(state)
    const ship = state.ship
    const enemyInside = createProjectile(
      { x: ship.pos.x + 20, y: ship.pos.y },
      ship.pos,
      ProjectileOwner.enemy,
      5
    )
    const shipInside = createProjectile(
      { x: ship.pos.x + 20, y: ship.pos.y },
      ship.pos,
      ProjectileOwner.ship,
      5
    )
    const enemyOutside = createProjectile(
      { x: ship.pos.x + 500, y: ship.pos.y },
      ship.pos,
      ProjectileOwner.enemy,
      5
    )

    const result = repulseFieldEffect.tick(
      { ...field, elapsed: 0 },
      {
        enemies: [],
        projectiles: [enemyInside, shipInside, enemyOutside],
        ship,
        worldSize: state.worldSize,
        dt: 0.1,
      }
    )

    const ids = result.projectiles.map((p) => p.id)
    expect(ids).not.toContain(enemyInside.id)
    expect(ids).toContain(shipInside.id)
    expect(ids).toContain(enemyOutside.id)
  })

  it('expires once its duration is reached', () => {
    const state = tryActivateSpaceMetalAbility(ready(), SpaceMetalAbilityKind.repulse)
    const field = repulseFieldOf(state)
    const result = repulseFieldEffect.tick(
      { ...field, elapsed: REPULSE.duration },
      {
        enemies: [],
        projectiles: [],
        ship: state.ship,
        worldSize: state.worldSize,
        dt: 0.1,
      }
    )
    expect(result.effect).toBeNull()
  })
})
