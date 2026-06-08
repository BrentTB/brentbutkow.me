import { describe, it, expect, beforeEach } from 'vitest'
import {
  SHIP_WEAPON_DEFINITIONS,
  SHIP_WEAPON_LIST,
  SHIP_WEAPON_ORDER,
  SHIP_WEAPON_UNLOCK_UPGRADE,
  getShipWeaponForUnlockUpgrade,
} from './index'
import { resetUid } from '../entities/entity-creator'
import { createInitialUpgrades } from '../upgrades'
import { ShipWeaponKind, UpgradeId } from '../types'

beforeEach(() => {
  resetUid()
})

// Registry integrity — adding a new weapon kind to types.ts without wiring it
// here would silently leave the lookup tables empty for that kind. These tests
// catch that.
describe('SHIP_WEAPON registry', () => {
  it('has a definition for every ShipWeaponKind', () => {
    for (const kind of Object.values(ShipWeaponKind)) {
      expect(SHIP_WEAPON_DEFINITIONS[kind]).toBeDefined()
      expect(SHIP_WEAPON_DEFINITIONS[kind].kind).toBe(kind)
    }
  })

  it('SHIP_WEAPON_ORDER covers every kind exactly once', () => {
    const seen = new Set<string>()
    for (const kind of SHIP_WEAPON_ORDER) {
      expect(seen.has(kind)).toBe(false)
      seen.add(kind)
    }
    expect(seen.size).toBe(Object.values(ShipWeaponKind).length)
  })

  it('only the bullet starts unlocked', () => {
    expect(SHIP_WEAPON_DEFINITIONS[ShipWeaponKind.bullet].startsUnlocked).toBe(true)
    for (const kind of Object.values(ShipWeaponKind)) {
      if (kind === ShipWeaponKind.bullet) continue
      expect(SHIP_WEAPON_DEFINITIONS[kind].startsUnlocked).not.toBe(true)
    }
  })

  it('non-bullet weapons all have an unlock upgrade; bullet does not', () => {
    expect(SHIP_WEAPON_UNLOCK_UPGRADE[ShipWeaponKind.bullet]).toBeUndefined()
    for (const kind of Object.values(ShipWeaponKind)) {
      if (kind === ShipWeaponKind.bullet) continue
      expect(SHIP_WEAPON_UNLOCK_UPGRADE[kind]).toBeDefined()
    }
  })

  it('getShipWeaponForUnlockUpgrade is the inverse of SHIP_WEAPON_UNLOCK_UPGRADE', () => {
    for (const def of SHIP_WEAPON_LIST) {
      if (!def.unlockUpgrade) continue
      expect(getShipWeaponForUnlockUpgrade(def.unlockUpgrade.id)).toBe(def.kind)
    }
    // Returns null for unknown upgrades.
    expect(getShipWeaponForUnlockUpgrade(UpgradeId.shipDamage)).toBeNull()
  })
})

describe('ShipWeaponDefinition.createProjectiles', () => {
  const shipPos = { x: 0, y: 0 }
  const targetPos = { x: 100, y: 0 }
  const upgrades = createInitialUpgrades()

  // Bullet must stay byte-identical to the original behavior: one straight-line
  // projectile, none of the new optional tags set.
  it('bullet returns exactly one untagged projectile aimed at the target', () => {
    const def = SHIP_WEAPON_DEFINITIONS[ShipWeaponKind.bullet]
    const projectiles = def.createProjectiles(shipPos, targetPos, 10, upgrades)
    expect(projectiles).toHaveLength(1)
    const p = projectiles[0]
    expect(p.damage).toBe(10)
    expect(p.vel.x).toBeGreaterThan(0)
    expect(p.pierce).toBeUndefined()
    expect(p.homing).toBeUndefined()
    expect(p.bounce).toBeUndefined()
    expect(p.detonate).toBeUndefined()
  })

  it('laser tags pierce with the configured maxHits', () => {
    const def = SHIP_WEAPON_DEFINITIONS[ShipWeaponKind.laser]
    const [proj] = def.createProjectiles(shipPos, targetPos, 10, upgrades)
    expect(proj.pierce).toBeDefined()
    expect(proj.pierce!.maxHits).toBeGreaterThan(0)
    expect(proj.pierce!.hitEnemyIds).toEqual([])
  })

  it('missile tags homing', () => {
    const def = SHIP_WEAPON_DEFINITIONS[ShipWeaponKind.missile]
    const [proj] = def.createProjectiles(shipPos, targetPos, 10, upgrades)
    expect(proj.homing).toBe(true)
  })

  it('ricochet tags bounce with remaining > 0 and a bounceRange', () => {
    const def = SHIP_WEAPON_DEFINITIONS[ShipWeaponKind.ricochet]
    const [proj] = def.createProjectiles(shipPos, targetPos, 10, upgrades)
    expect(proj.bounce).toBeDefined()
    expect(proj.bounce!.remaining).toBeGreaterThan(0)
    expect(proj.bounce!.bounceRange).toBeGreaterThan(0)
  })

  it('nuke tags detonate with positive AoE radius and waste DOT params', () => {
    const def = SHIP_WEAPON_DEFINITIONS[ShipWeaponKind.nuke]
    const [proj] = def.createProjectiles(shipPos, targetPos, 50, upgrades)
    expect(proj.detonate).toBeDefined()
    expect(proj.detonate!.aoeRadius).toBeGreaterThan(0)
    expect(proj.detonate!.blastDamage).toBe(50)
    expect(proj.detonate!.wasteRadius).toBeGreaterThan(0)
    expect(proj.detonate!.wasteDps).toBeGreaterThan(0)
    expect(proj.detonate!.wasteDuration).toBeGreaterThan(0)
  })
})

describe('ShipWeaponDefinition.weaponDamage', () => {
  it('bullet damage scales with ship.damage (1× by default)', () => {
    const def = SHIP_WEAPON_DEFINITIONS[ShipWeaponKind.bullet]
    expect(def.weaponDamage(10, createInitialUpgrades())).toBe(10)
  })

  it('damage upgrade tiers add to the weapon damage', () => {
    const def = SHIP_WEAPON_DEFINITIONS[ShipWeaponKind.laser]
    const base = def.weaponDamage(10, createInitialUpgrades())
    const oneTier = def.weaponDamage(10, {
      ...createInitialUpgrades(),
      [UpgradeId.laserDamage]: { currentTier: 1 },
    })
    expect(oneTier).toBeGreaterThan(base)
  })
})
