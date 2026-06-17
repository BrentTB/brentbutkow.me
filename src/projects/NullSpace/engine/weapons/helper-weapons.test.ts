import { describe, it, expect } from 'vitest'
import {
  HELPER_WEAPON_DEFINITIONS,
  HELPER_WEAPON_LIST,
  HELPER_WEAPON_UNLOCK_UPGRADE,
  getHelperWeaponForUnlockUpgrade,
} from './index'
import { HelperWeaponKind } from '../types'
import { UpgradeId } from '../upgrade-ids'

// Registry integrity — adding a new weapon kind to types.ts without wiring it
// here would silently leave the lookup tables empty for that kind. These tests
// catch that.
describe('helper weapon registry', () => {
  it('has a definition for every HelperWeaponKind', () => {
    for (const kind of Object.values(HelperWeaponKind)) {
      expect(HELPER_WEAPON_DEFINITIONS[kind]).toBeDefined()
      expect(HELPER_WEAPON_DEFINITIONS[kind].kind).toBe(kind)
    }
  })

  it('only the bullet starts unlocked', () => {
    expect(HELPER_WEAPON_DEFINITIONS[HelperWeaponKind.bullet].startsUnlocked).toBe(true)
    for (const kind of Object.values(HelperWeaponKind)) {
      if (kind === HelperWeaponKind.bullet) continue
      expect(HELPER_WEAPON_DEFINITIONS[kind].startsUnlocked).not.toBe(true)
    }
  })

  it('non-bullet weapons all have an unlock upgrade; bullet does not', () => {
    expect(HELPER_WEAPON_UNLOCK_UPGRADE[HelperWeaponKind.bullet]).toBeUndefined()
    for (const kind of Object.values(HelperWeaponKind)) {
      if (kind === HelperWeaponKind.bullet) continue
      expect(HELPER_WEAPON_UNLOCK_UPGRADE[kind]).toBeDefined()
    }
  })

  it('getHelperWeaponForUnlockUpgrade is the inverse of HELPER_WEAPON_UNLOCK_UPGRADE', () => {
    for (const def of HELPER_WEAPON_LIST) {
      if (!def.unlockUpgrade) continue
      expect(getHelperWeaponForUnlockUpgrade(def.unlockUpgrade.id)).toBe(def.kind)
    }
    // Returns null for unknown upgrades.
    expect(getHelperWeaponForUnlockUpgrade(UpgradeId.shipMaxHp)).toBeNull()
  })
})

describe('HelperWeaponDefinition.createProjectiles', () => {
  const shipPos = { x: 0, y: 0 }
  const targetPos = { x: 100, y: 0 }

  // Bullet is the plain projectile: one straight-line shot, none of the optional
  // tags set.
  it('bullet returns exactly one untagged projectile aimed at the target', () => {
    const def = HELPER_WEAPON_DEFINITIONS[HelperWeaponKind.bullet]
    const projectiles = def.createProjectiles(shipPos, targetPos, 10)
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
    const def = HELPER_WEAPON_DEFINITIONS[HelperWeaponKind.laser]
    const [proj] = def.createProjectiles(shipPos, targetPos, 10)
    expect(proj.pierce).toBeDefined()
    expect(proj.pierce!.maxHits).toBeGreaterThan(0)
    expect(proj.pierce!.hitEnemyIds).toEqual([])
  })

  it('missile tags homing AND a detonate splash with no waste zone', () => {
    const def = HELPER_WEAPON_DEFINITIONS[HelperWeaponKind.missile]
    const [proj] = def.createProjectiles(shipPos, targetPos, 10)
    expect(proj.homing).toBe(true)
    expect(proj.detonate).toBeDefined()
    expect(proj.detonate!.aoeRadius).toBeGreaterThan(0)
    expect(proj.detonate!.blastDamage).toBeGreaterThan(0)
    // Splash only — no lingering DOT zone.
    expect(proj.detonate!.wasteRadius).toBeUndefined()
    expect(proj.detonate!.wasteDps).toBeUndefined()
    expect(proj.detonate!.wasteDuration).toBeUndefined()
  })

  it('ricochet tags bounce with remaining > 0 and a bounceRange', () => {
    const def = HELPER_WEAPON_DEFINITIONS[HelperWeaponKind.ricochet]
    const [proj] = def.createProjectiles(shipPos, targetPos, 10)
    expect(proj.bounce).toBeDefined()
    expect(proj.bounce!.remaining).toBeGreaterThan(0)
    expect(proj.bounce!.bounceRange).toBeGreaterThan(0)
  })

  it('nuke tags detonate with positive AoE radius and waste DOT params', () => {
    const def = HELPER_WEAPON_DEFINITIONS[HelperWeaponKind.nuke]
    const [proj] = def.createProjectiles(shipPos, targetPos, 50)
    expect(proj.detonate).toBeDefined()
    expect(proj.detonate!.aoeRadius).toBeGreaterThan(0)
    expect(proj.detonate!.blastDamage).toBe(50)
    expect(proj.detonate!.wasteRadius).toBeGreaterThan(0)
    expect(proj.detonate!.wasteDps).toBeGreaterThan(0)
    expect(proj.detonate!.wasteDuration).toBeGreaterThan(0)
    expect(proj.detonate!.wasteGrowDuration).toBeGreaterThan(0)
  })
})

describe('HelperWeaponDefinition.weaponDamage', () => {
  it('bullet damage scales 1× with the base damage by default', () => {
    const def = HELPER_WEAPON_DEFINITIONS[HelperWeaponKind.bullet]
    expect(def.weaponDamage(10)).toBe(10)
  })

  it('a specialty weapon scales the base damage by its multiplier', () => {
    // Laser deals 0.85× its base damage.
    const def = HELPER_WEAPON_DEFINITIONS[HelperWeaponKind.laser]
    expect(def.weaponDamage(10)).toBeCloseTo(8.5, 5)
  })
})
