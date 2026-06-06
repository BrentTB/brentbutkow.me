import { describe, it, expect, beforeEach } from 'vitest'
import { resolveEnemyProjectileShipCollisions } from './combat'
import { createShip, createProjectile, resetUid } from '../entities/entity-creator'
import { distance } from '../math/collision'
import { ProjectileOwner, ShipKind } from '../types'
import { WORLD_SIZE } from '../../data'

beforeEach(() => {
  resetUid()
})

describe('resolveEnemyProjectileShipCollisions — swept regression', () => {
  // A fast enemy bullet can step clean over the ship in one frame: its final
  // position lands past the ship, so the old point check (checkCollision on
  // proj.pos vs ship) misses. The swept prevPos→pos segment test must still
  // catch it. Guards the same 2× tunnel bug that was fixed for ship→enemy.
  it('catches an enemy bullet that jumps over the ship in one frame', () => {
    const ship = createShip(ShipKind.fighter, WORLD_SIZE)
    const proj = createProjectile(
      ship.pos,
      { x: ship.pos.x + 100, y: ship.pos.y },
      ProjectileOwner.enemy,
      10
    )
    const combinedRadius = ship.radius + proj.radius
    const offset = combinedRadius + 10
    // Sweep straight through the ship center; land `offset` past it.
    const swept = {
      ...proj,
      prevPos: { x: ship.pos.x - offset, y: ship.pos.y },
      pos: { x: ship.pos.x + offset, y: ship.pos.y },
      vel: { x: 1, y: 0 },
    }

    // Old point check would miss — final pos is outside the combined radius.
    expect(distance(swept.pos, ship.pos)).toBeGreaterThan(combinedRadius)

    const result = resolveEnemyProjectileShipCollisions([swept], ship)
    // Ship took damage (hp + shield drops by the bullet damage) and the bullet
    // was consumed rather than passing through.
    expect(result.ship.hp + result.ship.shield).toBeLessThan(ship.hp + ship.shield)
    expect(result.projectiles.length).toBe(0)
  })

  it('leaves a bullet that never reaches the ship untouched', () => {
    const ship = createShip(ShipKind.fighter, WORLD_SIZE)
    const proj = createProjectile(
      ship.pos,
      { x: ship.pos.x + 100, y: ship.pos.y },
      ProjectileOwner.enemy,
      10
    )
    const far = ship.radius + proj.radius + 500
    const miss = {
      ...proj,
      prevPos: { x: ship.pos.x + far, y: ship.pos.y },
      pos: { x: ship.pos.x + far + 40, y: ship.pos.y },
    }

    const result = resolveEnemyProjectileShipCollisions([miss], ship)
    expect(result.ship.hp + result.ship.shield).toBe(ship.hp + ship.shield)
    expect(result.projectiles.length).toBe(1)
  })
})
