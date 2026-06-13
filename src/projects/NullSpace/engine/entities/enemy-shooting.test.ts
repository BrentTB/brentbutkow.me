import { describe, it, expect } from 'vitest'
import { createEnemy, createShip } from './entity-creator'
import { updateEnemyShooting } from './enemy'
import { EnemyKind, ProjectileOwner, ShipKind } from '../types'
import { PROJECTILE_SPEED, WORLD_SIZE } from '../../data'

function shipAt(x: number, y: number) {
  return { ...createShip(ShipKind.fighter, WORLD_SIZE), pos: { x, y } }
}

describe('updateEnemyShooting — boss & generator lasers', () => {
  it('dreadnought fires a slow beam laser from beyond its movement standoff', () => {
    const boss = createEnemy(EnemyKind.dreadnought, { x: 0, y: 0 })
    // 300px away: past the 220 standoff but inside the 480 fireRange.
    const { projectiles } = updateEnemyShooting([boss], shipAt(300, 0), [], [], 0.1)
    expect(projectiles).toHaveLength(1)
    const p = projectiles[0]
    expect(p.owner).toBe(ProjectileOwner.enemy)
    expect(p.beam).toBe(true)
    expect(p.damage).toBe(12)
    const speed = Math.hypot(p.vel.x, p.vel.y)
    expect(speed).toBeCloseTo(300, 0)
    // Slower than the player's laser (PROJECTILE_SPEED × 2).
    expect(speed).toBeLessThan(PROJECTILE_SPEED * 2)
  })

  it('shield generator fires a beam laser', () => {
    const gen = createEnemy(EnemyKind.shieldGenerator, { x: 0, y: 0 })
    const { projectiles } = updateEnemyShooting([gen], shipAt(300, 0), [], [], 0.1)
    expect(projectiles).toHaveLength(1)
    expect(projectiles[0].beam).toBe(true)
    expect(projectiles[0].damage).toBe(6)
  })

  it('boss holds fire when the player is beyond its fireRange', () => {
    const boss = createEnemy(EnemyKind.dreadnought, { x: 0, y: 0 })
    const { projectiles } = updateEnemyShooting([boss], shipAt(600, 0), [], [], 0.1)
    expect(projectiles).toHaveLength(0)
  })

  it('shooter still fires a normal (non-beam) bullet', () => {
    const shooter = createEnemy(EnemyKind.shooter, { x: 0, y: 0 })
    const { projectiles } = updateEnemyShooting([shooter], shipAt(300, 0), [], [], 0.1)
    expect(projectiles).toHaveLength(1)
    expect(projectiles[0].beam).toBeFalsy()
    expect(Math.hypot(projectiles[0].vel.x, projectiles[0].vel.y)).toBeCloseTo(PROJECTILE_SPEED, 0)
  })

  it('non-shooting enemies (drone) fire nothing', () => {
    const drone = createEnemy(EnemyKind.drone, { x: 0, y: 0 })
    const { projectiles } = updateEnemyShooting([drone], shipAt(100, 0), [], [], 0.1)
    expect(projectiles).toHaveLength(0)
  })
})
