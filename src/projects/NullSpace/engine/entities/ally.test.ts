import { describe, it, expect, beforeEach } from 'vitest'
import { applyDamageToAlly, rollAllyWeapon, updateAllies } from './ally'
import { createAlly, createCharmedAlly, createEnemy, createShip } from './entity-creator'
import { EnemyKind, ShipKind, HelperWeaponKind } from '../types'
import { WORLD_SIZE } from '../../data'
import { CHARM, HELPER } from '../abilities/ability-data'
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

describe('charmed allies (Hypnosis)', () => {
  const ship = createShip(ShipKind.fighter, WORLD_SIZE)
  // Charmed far from the ship (which sits at world center) so "holds station" is
  // distinguishable from a helper flying back to orbit.
  const charmed = (overrides: Partial<ReturnType<typeof createCharmedAlly>> = {}) => ({
    ...createCharmedAlly(createEnemy(EnemyKind.tank, { x: 100, y: 100 }), 5),
    ...overrides,
  })

  it('holds station near its anchor instead of flying to the ship', () => {
    // Long timer so this isolates steering from expiry.
    let allies = [charmed({ expiresIn: 100 })]
    const anchor = allies[0].anchor!
    for (let i = 0; i < 40; i++) {
      allies = updateAllies(allies, [], ship, [], 0.1, []).allies // no enemies
    }
    const drift = Math.hypot(allies[0].pos.x - anchor.x, allies[0].pos.y - anchor.y)
    expect(drift).toBeLessThanOrEqual(CHARM.leash + 1)
    // ...and nowhere near the ship at world center.
    expect(Math.hypot(allies[0].pos.x - ship.pos.x, allies[0].pos.y - ship.pos.y)).toBeGreaterThan(
      100
    )
  })

  it('does not bleed HP — it runs on its expiry timer', () => {
    const { allies } = updateAllies(
      [charmed({ hp: 80, maxHp: 80, expiresIn: 5 })],
      [],
      ship,
      [],
      1,
      []
    )
    expect(allies[0].hp).toBe(80)
    expect(allies[0].expiresIn).toBeCloseTo(4)
  })

  it('despawns with a poof when its timer runs out', () => {
    const { allies, particles } = updateAllies(
      [charmed({ expiresIn: 0.05 })],
      [],
      ship,
      [],
      0.1,
      []
    )
    expect(allies).toHaveLength(0)
    expect(particles.length).toBeGreaterThan(0)
  })

  it('still dies if shot down before its timer ends', () => {
    // hp already driven to 0 by enemy fire this frame.
    const { allies } = updateAllies([charmed({ hp: 0, expiresIn: 5 })], [], ship, [], 0.1, [])
    expect(allies).toHaveLength(0)
  })

  // Regression: the no-HP-decay branch is charmed-only — a normal helper must still bleed.
  it('a normal helper still bleeds HP over time', () => {
    const { allies } = updateAllies([createAlly({ x: 0, y: 0 })], [], ship, [], 1, [])
    expect(allies[0].hp).toBeCloseTo(HELPER.hp - HELPER.hpDecayPerSec * 1)
  })
})
