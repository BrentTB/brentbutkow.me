import { describe, it, expect } from 'vitest'
import {
  createShip,
  createEnemy,
  createCharmedAlly,
  createDeathAnim,
  createProjectile,
  createParticle,
  spawnExplosionParticles,
  updateDeathAnims,
} from './entity-creator'
import { createAbilities } from '../abilities'
import {
  AbilityKind,
  DeathBehavior,
  EnemyKind,
  EnemyModifier,
  MovementBehavior,
  ShipKind,
} from '../types'
import { applyModifier } from '../world/enemy-modifiers'
import { ANIMATION, WEAPON_ORDER, WORLD_SIZE } from '../../data'
import { rng } from '../math/random'

describe('createShip', () => {
  it('places ship at world center', () => {
    const ship = createShip(ShipKind.fighter, WORLD_SIZE)
    expect(ship.pos.x).toBe(WORLD_SIZE.x / 2)
    expect(ship.pos.y).toBe(WORLD_SIZE.y / 2)
  })

  it('has full health', () => {
    const ship = createShip(ShipKind.fighter, WORLD_SIZE)
    expect(ship.hp).toBe(ship.maxHp)
    expect(ship.hp).toBeGreaterThan(0)
  })

  it('starts with cleared cosmetic timers', () => {
    const ship = createShip(ShipKind.fighter, WORLD_SIZE)
    expect(ship.hitFlash).toBe(0)
  })

  it('starts with i-frames disarmed (worm contact + general post-hit)', () => {
    const ship = createShip(ShipKind.fighter, WORLD_SIZE)
    expect(ship.wormContactCooldown).toBe(0)
    expect(ship.damageIFrame).toBe(0)
  })
})

describe('createEnemy', () => {
  it('creates a drone with correct stats', () => {
    const enemy = createEnemy(EnemyKind.drone, { x: 100, y: 200 })
    expect(enemy.kind).toBe(EnemyKind.drone)
    expect(enemy.pos).toEqual({ x: 100, y: 200 })
    expect(enemy.hp).toBe(20)
    expect(enemy.speed).toBe(100)
  })

  it('creates a tank with correct stats', () => {
    const enemy = createEnemy(EnemyKind.tank, { x: 50, y: 50 })
    expect(enemy.kind).toBe(EnemyKind.tank)
    expect(enemy.hp).toBe(80)
    expect(enemy.speed).toBe(40)
  })

  it('creates a swarm with zigzag movement', () => {
    const enemy = createEnemy(EnemyKind.swarm, { x: 100, y: 100 })
    expect(enemy.kind).toBe(EnemyKind.swarm)
    expect(enemy.hp).toBe(8)
    expect(enemy.speed).toBe(150)
    expect(enemy.movementBehavior).toBe(MovementBehavior.zigzag)
    expect(enemy.deathBehavior).toBe(DeathBehavior.none)
  })

  it('creates a bomber with explode death behavior', () => {
    const enemy = createEnemy(EnemyKind.bomber, { x: 100, y: 100 })
    expect(enemy.kind).toBe(EnemyKind.bomber)
    expect(enemy.hp).toBe(50)
    expect(enemy.speed).toBe(35)
    expect(enemy.movementBehavior).toBe(MovementBehavior.chase)
    expect(enemy.deathBehavior).toBe(DeathBehavior.explode)
  })

  it('sets movement and death behaviors for all enemy kinds', () => {
    for (const kind of Object.values(EnemyKind)) {
      const enemy = createEnemy(kind, { x: 0, y: 0 })
      expect(enemy.movementBehavior).toBeDefined()
      expect(enemy.deathBehavior).toBeDefined()
    }
  })

  it('seeds the warp-in timer and clears cosmetic flashes', () => {
    const enemy = createEnemy(EnemyKind.drone, { x: 0, y: 0 })
    expect(enemy.spawnIn).toBeCloseTo(ANIMATION.spawnIn)
    expect(enemy.hitFlash).toBe(0)
    expect(enemy.fireFlash).toBe(0)
  })
})

describe('createDeathAnim + updateDeathAnims', () => {
  it('snapshots a dead enemy into a fresh disintegration', () => {
    const enemy = createEnemy(EnemyKind.drone, { x: 10, y: 20 })
    const anim = createDeathAnim(enemy)
    expect(anim.kind).toBe(EnemyKind.drone)
    expect(anim.pos).toEqual({ x: 10, y: 20 })
    expect(anim.elapsed).toBe(0)
    expect(anim.duration).toBeCloseTo(ANIMATION.deathAnim)
    expect(anim.isBoss).toBe(false)
  })

  it('advances elapsed and culls once the animation completes', () => {
    const enemy = createEnemy(EnemyKind.drone, { x: 0, y: 0 })
    let anims = [createDeathAnim(enemy)]
    anims = updateDeathAnims(anims, 0.1)
    expect(anims[0].elapsed).toBeCloseTo(0.1)
    anims = updateDeathAnims(anims, ANIMATION.deathAnim)
    expect(anims).toHaveLength(0)
  })
})

describe('createProjectile', () => {
  it('aims toward target', () => {
    const proj = createProjectile({ x: 0, y: 0 }, { x: 100, y: 0 }, 'ship', 10)
    expect(proj.vel.x).toBeGreaterThan(0)
    expect(Math.abs(proj.vel.y)).toBeLessThan(0.01)
    expect(proj.damage).toBe(10)
    expect(proj.owner).toBe('ship')
  })
})

describe('createCharmedAlly', () => {
  it('inherits the enemy faithfully and marks it charmed', () => {
    const enemy = createEnemy(EnemyKind.tank, { x: 40, y: 60 })
    const ally = createCharmedAlly(enemy)
    expect(ally.charmedFrom).toBe(EnemyKind.tank)
    expect(ally.hp).toBe(enemy.hp)
    expect(ally.maxHp).toBe(enemy.maxHp)
    expect(ally.damage).toBe(enemy.damage)
    expect(ally.pos).toEqual({ x: 40, y: 60 })
    expect(ally.anchor).toEqual({ x: 40, y: 60 })
  })

  it('grants bonus survival HP (the Duration upgrade) on top of the enemy HP', () => {
    const enemy = createEnemy(EnemyKind.tank, { x: 0, y: 0 })
    const ally = createCharmedAlly(enemy, 30)
    expect(ally.hp).toBe(enemy.hp + 30)
    expect(ally.maxHp).toBe(enemy.maxHp + 30)
  })

  it('keeps the enemy modifier — a giant charm stays giant (big HP + hitbox)', () => {
    const base = createEnemy(EnemyKind.tank, { x: 0, y: 0 })
    const giant = applyModifier(base, EnemyModifier.giant)
    const ally = createCharmedAlly(giant)
    expect(ally.modifier).toBe(EnemyModifier.giant)
    expect(ally.hp).toBe(giant.hp) // giant HP carried over
    expect(ally.radius).toBe(giant.radius) // giant hitbox carried over
    expect(ally.radius).toBeGreaterThan(base.radius)
  })

  it('keeps a melee enemy melee — faithful 0 reach, so it rams instead of shooting', () => {
    const drone = createEnemy(EnemyKind.drone, { x: 0, y: 0 })
    const ally = createCharmedAlly(drone)
    expect(ally.attackRange).toBe(drone.attackRange) // 0 → handled by the ram pass
    expect(ally.fireRate).toBe(drone.fireRate)
    expect(ally.damage).toBe(drone.damage)
    expect(ally.speed).toBe(drone.speed)
  })

  it('keeps a ranged enemy ranged — the shooter retains its reach + fire rate', () => {
    const shooter = createEnemy(EnemyKind.shooter, { x: 0, y: 0 })
    const ally = createCharmedAlly(shooter)
    expect(ally.attackRange).toBeGreaterThan(0)
    expect(ally.fireRate).toBeGreaterThan(0)
  })
})

describe('WEAPON_ORDER', () => {
  it('contains every AbilityKind value exactly once', () => {
    const seen = new Set<string>()
    for (const kind of WEAPON_ORDER) {
      expect(seen.has(kind)).toBe(false)
      seen.add(kind)
    }
    for (const kind of Object.values(AbilityKind)) {
      expect(seen.has(kind)).toBe(true)
    }
    expect(seen.size).toBe(Object.values(AbilityKind).length)
  })
})

describe('createAbilities', () => {
  it('returns one ability per WEAPON_ORDER entry, in order', () => {
    const abilities = createAbilities()
    expect(abilities.map((a) => a.kind)).toEqual([...WEAPON_ORDER])
    for (const a of abilities) {
      expect(a.cooldownRemaining).toBe(0)
    }
    // Meteorite is always present and the first entry.
    expect(abilities[0].kind).toBe(AbilityKind.meteorite)
  })

  // Regression guard: someone re-introducing the old inline `.sort((a, b) =>
  // a.powerCost - b.powerCost)` would break this. Hotbar order is now whatever
  // WEAPON_ORDER says, not a derived sort.
  it('preserves WEAPON_ORDER positionally (no automatic sort by cost)', () => {
    const order = createAbilities().map((a) => a.kind)
    expect(order).toEqual([...WEAPON_ORDER])
  })
})

describe('createParticle', () => {
  it('creates particle with given properties', () => {
    const p = createParticle({ x: 10, y: 20 }, { x: 5, y: -3 }, '#ff0000', 1.0, 4)
    expect(p.pos).toEqual({ x: 10, y: 20 })
    expect(p.color).toBe('#ff0000')
    expect(p.elapsed).toBe(0)
  })
})

describe('spawnExplosionParticles', () => {
  it('creates the requested number of particles', () => {
    const particles = spawnExplosionParticles({ x: 100, y: 100 }, 8, '#ff0000')
    expect(particles).toHaveLength(8)
  })

  it('each particle has unique id', () => {
    const particles = spawnExplosionParticles({ x: 0, y: 0 }, 5, '#fff')
    const ids = new Set(particles.map((p) => p.id))
    expect(ids.size).toBe(5)
  })

  // The radius upgrade is invisible without this: spread must scale particle reach.
  it('scales particle velocity with the spread factor', () => {
    rng.reseed(99)
    const base = spawnExplosionParticles({ x: 0, y: 0 }, 12, '#fff', 1)
    rng.reseed(99)
    const wide = spawnExplosionParticles({ x: 0, y: 0 }, 12, '#fff', 2)
    for (let i = 0; i < base.length; i++) {
      const baseSpeed = Math.hypot(base[i].vel.x, base[i].vel.y)
      const wideSpeed = Math.hypot(wide[i].vel.x, wide[i].vel.y)
      expect(wideSpeed).toBeCloseTo(baseSpeed * 2, 5)
    }
  })

  it('defaults to spread 1 (unchanged) when omitted', () => {
    rng.reseed(7)
    const explicit = spawnExplosionParticles({ x: 0, y: 0 }, 6, '#fff', 1)
    rng.reseed(7)
    const omitted = spawnExplosionParticles({ x: 0, y: 0 }, 6, '#fff')
    expect(omitted.map((p) => p.vel)).toEqual(explicit.map((p) => p.vel))
  })
})
