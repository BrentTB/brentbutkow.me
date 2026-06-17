import { describe, it, expect, beforeEach } from 'vitest'
import { rollAllyWeapon, updateAllies } from './ally'
import { createAlly, createEnemy, createShip } from './entity-creator'
import { createInitialUpgrades } from '../upgrades'
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
    return updateAllies([ally], [enemy], ship, [], 0.1, [weapon], createInitialUpgrades())
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
