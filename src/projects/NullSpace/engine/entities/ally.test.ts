import { describe, it, expect, beforeEach } from 'vitest'
import { applyDamageToAlly, rollAllyWeapon, updateAllies } from './ally'
import { createAlly, createEnemy, createShip } from './entity-creator'
import { EnemyKind, ShipKind, HelperWeaponKind } from '../types'
import { WORLD_SIZE } from '../../data'
import { rng } from '../math/random'

beforeEach(() => rng.reseed(1))

describe('rollAllyWeapon', () => {
  it('always returns bullet when no ally weapon is unlocked', () => {
    for (let s = 0; s < 24; s++) {
      rng.reseed(s)
      expect(rollAllyWeapon([])).toBe(HelperWeaponKind.bullet)
    }
  })

  it('rolls only the unlocked weapon or bullet — never an un-unlocked one', () => {
    const seen = new Set<HelperWeaponKind>()
    for (let s = 0; s < 80; s++) {
      rng.reseed(s)
      seen.add(rollAllyWeapon([HelperWeaponKind.laser]))
    }
    expect(seen.has(HelperWeaponKind.laser)).toBe(true) // its ~1/4 slot
    expect(seen.has(HelperWeaponKind.bullet)).toBe(true) // the other ~3/4
    expect(seen.has(HelperWeaponKind.missile)).toBe(false)
    expect(seen.has(HelperWeaponKind.nuke)).toBe(false)
  })

  it('always arms an ally once all four weapons are unlocked', () => {
    const all = [
      HelperWeaponKind.laser,
      HelperWeaponKind.missile,
      HelperWeaponKind.ricochet,
      HelperWeaponKind.nuke,
    ]
    for (let s = 0; s < 40; s++) {
      rng.reseed(s)
      expect(rollAllyWeapon(all)).not.toBe(HelperWeaponKind.bullet)
    }
  })
})

describe('allies fire their rolled weapon', () => {
  const fireOnce = (weapon: HelperWeaponKind) => {
    const ship = createShip(ShipKind.fighter, WORLD_SIZE)
    const ally = { ...createAlly({ x: 0, y: 0 }), weapon, fireCooldown: 0 }
    const enemy = createEnemy(EnemyKind.drone, { x: 30, y: 0 })
    return updateAllies([ally], [enemy], ship, [], 0.1, [weapon])
  }

  it('an unarmed ally fires a single plain shot (bullet path unchanged)', () => {
    const { projectiles } = fireOnce(HelperWeaponKind.bullet)
    expect(projectiles.length).toBe(1)
    expect(projectiles[0].homing).toBeUndefined()
  })

  it('a nuke-armed ally fires on a far slower cadence than a bullet ally', () => {
    const bulletCooldown = fireOnce(HelperWeaponKind.bullet).allies[0].fireCooldown
    const nuke = fireOnce(HelperWeaponKind.nuke)
    expect(nuke.projectiles.length).toBeGreaterThan(0)
    // Nuke's low fireRateMultiplier means a much longer post-fire cooldown.
    expect(nuke.allies[0].fireCooldown).toBeGreaterThan(bulletCooldown)
  })
})

describe('allies skip fog-concealed enemies', () => {
  const ship = createShip(ShipKind.fighter, WORLD_SIZE)
  const armedAlly = () => ({
    ...createAlly({ x: 0, y: 0 }),
    weapon: HelperWeaponKind.bullet,
    fireCooldown: 0,
  })
  const enemyPos = { x: 30, y: 0 }

  it('holds fire on an enemy hidden in fog, fires once a bubble reveals it', () => {
    const enemy = createEnemy(EnemyKind.drone, { ...enemyPos })
    const concealed = { fog: [{ pos: enemyPos, radius: 100 }], slow: [], haze: [], circles: [] }
    expect(
      updateAllies([armedAlly()], [enemy], ship, [], 0.1, [HelperWeaponKind.bullet], concealed)
        .projectiles
    ).toHaveLength(0)
    const revealed = { ...concealed, circles: [{ center: enemyPos, radius: 60 }] }
    expect(
      updateAllies([armedAlly()], [enemy], ship, [], 0.1, [HelperWeaponKind.bullet], revealed)
        .projectiles.length
    ).toBeGreaterThan(0)
  })

  // Regression: bosses ignore fog (always rendered + tracked by enemy AI), so ally
  // targeting must not skip a fog-concealed boss the way it skips concealed minions.
  it('still fires on a boss concealed by fog', () => {
    const boss = createEnemy(EnemyKind.phaseShifter, { ...enemyPos })
    const concealed = { fog: [{ pos: enemyPos, radius: 100 }], slow: [], haze: [], circles: [] }
    expect(
      updateAllies([armedAlly()], [boss], ship, [], 0.1, [HelperWeaponKind.bullet], concealed)
        .projectiles.length
    ).toBeGreaterThan(0)
  })
})

describe('applyDamageToAlly', () => {
  it('subtracts damage straight off hp (allies have no shield)', () => {
    const ally = createAlly({ x: 0, y: 0 })
    expect(applyDamageToAlly(ally, 10).hp).toBe(ally.hp - 10)
  })

  it('ignores non-positive damage', () => {
    const ally = createAlly({ x: 0, y: 0 })
    expect(applyDamageToAlly(ally, 0)).toBe(ally)
    expect(applyDamageToAlly(ally, -5)).toBe(ally)
  })

  it('can drive hp to zero or below — the caller filters the death', () => {
    const ally = createAlly({ x: 0, y: 0 })
    expect(applyDamageToAlly(ally, ally.hp + 50).hp).toBeLessThanOrEqual(0)
  })
})
