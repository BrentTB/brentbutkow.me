import { describe, it, expect } from 'vitest'
import { tryUseAbility, updateAbilityCooldowns, createAbilities } from '.'
import { createAlly, createEnemy, createShip } from '../entities/entity-creator'
import { AbilityKind, EffectKind, EnemyKind, ShipKind } from '../types'
import { WORLD_SIZE } from '../../data'
import { HYPNOSIS } from './ability-data'

const ship = createShip(ShipKind.fighter, WORLD_SIZE)

// A live, charmable enemy (warp-in cleared) at a position.
const charmable = (kind: EnemyKind, x: number, y: number) => ({
  ...createEnemy(kind, { x, y }),
  spawnIn: 0,
})

describe('tryUseAbility', () => {
  it('creates a meteorite effect when off cooldown and has power', () => {
    const abilities = createAbilities().map((a) =>
      a.kind === AbilityKind.meteorite ? { ...a, unlocked: true } : a
    )
    const result = tryUseAbility(abilities, AbilityKind.meteorite, { x: 100, y: 200 }, 100, ship)
    expect(result.effects.length).toBe(1)
    expect(result.effects[0].pos).toEqual({ x: 100, y: 200 })
    expect(result.effects[0].kind).toBe(EffectKind.meteoriteStrike)
    const meteoriteIdx = abilities.findIndex((a) => a.kind === AbilityKind.meteorite)
    expect(result.abilities[meteoriteIdx].cooldownRemaining).toBeGreaterThan(0)
    expect(result.powerSpent).toBe(abilities[meteoriteIdx].powerCost)
  })

  it('returns no effect when on cooldown', () => {
    const abilities = createAbilities().map((a) => ({ ...a, cooldownRemaining: 2 }))
    const result = tryUseAbility(abilities, AbilityKind.meteorite, { x: 100, y: 200 }, 100, ship)
    expect(result.effects.length).toBe(0)
    expect(result.powerSpent).toBe(0)
  })

  it('returns no effect when not enough power', () => {
    const abilities = createAbilities()
    const result = tryUseAbility(abilities, AbilityKind.meteorite, { x: 100, y: 200 }, 1, ship)
    expect(result.effects.length).toBe(0)
    expect(result.powerSpent).toBe(0)
  })

  it('cannot use a locked ability', () => {
    const abilities = createAbilities().map((a) =>
      a.kind === AbilityKind.meteor ? { ...a, unlocked: false } : a
    )
    const result = tryUseAbility(abilities, AbilityKind.meteor, { x: 100, y: 200 }, 100, ship)
    expect(result.effects.length).toBe(0)
    expect(result.powerSpent).toBe(0)
  })

  it('can use meteor when unlocked', () => {
    const abilities = createAbilities().map((a) =>
      a.kind === AbilityKind.meteor ? { ...a, unlocked: true } : a
    )
    const result = tryUseAbility(abilities, AbilityKind.meteor, { x: 50, y: 50 }, 100, ship)
    expect(result.effects.length).toBe(1)
    expect(result.effects[0].kind).toBe(EffectKind.meteorStrike)
    expect(result.powerSpent).toBeGreaterThan(0)
  })

  it('creates a black hole effect when unlocked', () => {
    const abilities = createAbilities().map((a) =>
      a.kind === AbilityKind.blackHole ? { ...a, unlocked: true } : a
    )
    const result = tryUseAbility(abilities, AbilityKind.blackHole, { x: 300, y: 400 }, 200, ship)
    expect(result.effects.length).toBe(1)
    expect(result.effects[0].kind).toBe(EffectKind.blackHole)
    expect(result.powerSpent).toBeGreaterThan(0)
  })
})

describe('tryUseAbility — Hypnosis (charm)', () => {
  const unlocked = () =>
    createAbilities().map((a) => (a.kind === AbilityKind.hypnosis ? { ...a, unlocked: true } : a))

  it('charms the nearest enemy in range — returns the ally + consumed id, spends power + cooldown', () => {
    const abilities = unlocked()
    const enemy = charmable(EnemyKind.drone, 20, 0)
    const result = tryUseAbility(
      abilities,
      AbilityKind.hypnosis,
      { x: 0, y: 0 },
      100,
      ship,
      [enemy],
      []
    )
    expect(result.charmedAllies).toHaveLength(1)
    expect(result.charmedAllies[0].charmedFrom).toBe(EnemyKind.drone)
    expect(result.consumedEnemyIds).toEqual([enemy.id])
    expect(result.powerSpent).toBeGreaterThan(0)
    const idx = abilities.findIndex((a) => a.kind === AbilityKind.hypnosis)
    expect(result.abilities[idx].cooldownRemaining).toBeGreaterThan(0)
  })

  it('is a no-op when no enemy is in range — no power or cooldown spent', () => {
    const abilities = unlocked()
    const far = charmable(EnemyKind.drone, 9999, 0)
    const result = tryUseAbility(
      abilities,
      AbilityKind.hypnosis,
      { x: 0, y: 0 },
      100,
      ship,
      [far],
      []
    )
    expect(result.consumedEnemyIds).toHaveLength(0)
    expect(result.powerSpent).toBe(0)
    const idx = abilities.findIndex((a) => a.kind === AbilityKind.hypnosis)
    expect(result.abilities[idx].cooldownRemaining).toBe(0)
  })

  it('cannot charm a boss', () => {
    const abilities = unlocked()
    const boss = charmable(EnemyKind.phaseShifter, 10, 0)
    const result = tryUseAbility(
      abilities,
      AbilityKind.hypnosis,
      { x: 0, y: 0 },
      100,
      ship,
      [boss],
      []
    )
    expect(result.consumedEnemyIds).toHaveLength(0)
    expect(result.powerSpent).toBe(0)
  })

  it('is a no-op once the concurrent-charm cap is reached', () => {
    const abilities = unlocked()
    const enemy = charmable(EnemyKind.drone, 20, 0)
    const atCap = Array.from({ length: HYPNOSIS.maxCharmed }, () => ({
      ...createAlly({ x: 0, y: 0 }),
      charmedFrom: EnemyKind.drone,
      expiresIn: 5,
    }))
    const result = tryUseAbility(
      abilities,
      AbilityKind.hypnosis,
      { x: 0, y: 0 },
      100,
      ship,
      [enemy],
      atCap
    )
    expect(result.consumedEnemyIds).toHaveLength(0)
    expect(result.powerSpent).toBe(0)
  })
})

describe('tryUseAbility — Pied Piper (AoE charm)', () => {
  it('charms every charmable enemy within the radius, up to the cap', () => {
    const abilities = createAbilities().map((a) =>
      a.kind === AbilityKind.piedPiper ? { ...a, unlocked: true } : a
    )
    const enemies = [10, 40, 70, 100].map((x) => charmable(EnemyKind.swarm, x, 0))
    const result = tryUseAbility(
      abilities,
      AbilityKind.piedPiper,
      { x: 0, y: 0 },
      999,
      ship,
      enemies,
      []
    )
    expect(result.charmedAllies.length).toBe(enemies.length)
    expect(result.consumedEnemyIds.length).toBe(enemies.length)
  })
})

describe('updateAbilityCooldowns', () => {
  it('reduces cooldowns by dt', () => {
    const abilities = createAbilities().map((a) => ({ ...a, cooldownRemaining: 2 }))
    const updated = updateAbilityCooldowns(abilities, 0.5)
    expect(updated[0].cooldownRemaining).toBe(1.5)
  })

  it('clamps cooldown at zero', () => {
    const abilities = createAbilities().map((a) => ({ ...a, cooldownRemaining: 0.1 }))
    const updated = updateAbilityCooldowns(abilities, 1)
    expect(updated[0].cooldownRemaining).toBe(0)
  })
})
