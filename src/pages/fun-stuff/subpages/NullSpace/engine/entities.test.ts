import { describe, it, expect, beforeEach } from 'vitest'
import {
  createShip,
  createEnemy,
  createProjectile,
  createAbilities,
  createParticle,
  spawnExplosionParticles,
  resetUid,
} from './entities'
import { AbilityKind, EnemyKind } from './types'
import { WORLD_SIZE } from '../data'

beforeEach(() => {
  resetUid()
})

describe('createShip', () => {
  it('places ship at world center', () => {
    const ship = createShip(WORLD_SIZE)
    expect(ship.pos.x).toBe(WORLD_SIZE.x / 2)
    expect(ship.pos.y).toBe(WORLD_SIZE.y / 2)
  })

  it('has full health', () => {
    const ship = createShip(WORLD_SIZE)
    expect(ship.hp).toBe(ship.maxHp)
    expect(ship.hp).toBeGreaterThan(0)
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

describe('createAbilities', () => {
  it('creates two abilities — meteorite unlocked, meteor locked', () => {
    const abilities = createAbilities()
    expect(abilities).toHaveLength(2)

    const meteorite = abilities.find((a) => a.kind === AbilityKind.meteorite)
    expect(meteorite).toBeDefined()
    expect(meteorite!.unlocked).toBe(true)
    expect(meteorite!.cooldownRemaining).toBe(0)

    const meteor = abilities.find((a) => a.kind === AbilityKind.meteor)
    expect(meteor).toBeDefined()
    expect(meteor!.unlocked).toBe(false)
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
})
