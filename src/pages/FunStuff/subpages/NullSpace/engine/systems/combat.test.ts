import { describe, it, expect, beforeEach } from 'vitest'
import {
  resolveEnemyAllyMeleeCollisions,
  resolveEnemyProjectileShipCollisions,
  resolveEnemyShipCollisions,
} from './combat'
import {
  createAlly,
  createEnemy,
  createProjectile,
  createShip,
  resetUid,
} from '../entities/entity-creator'
import { distance } from '../math/collision'
import { EnemyKind, ProjectileOwner, ShipKind } from '../types'
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

// Non-bomber enemies used to suicide on contact (dealing one tap of damage and
// vanishing). They now survive a ram, deal damage, and get knocked back. The
// bomber stays as the sole self-destructing kind so its on-death AoE keeps
// firing as designed.
describe('resolveEnemyShipCollisions — bounce vs explode', () => {
  it('a ramming drone survives, damages the ship, and is pushed clear of the hull', () => {
    const ship = createShip(ShipKind.fighter, WORLD_SIZE)
    const drone = { ...createEnemy(EnemyKind.drone, { x: ship.pos.x, y: ship.pos.y }) }

    const before = ship.hp + ship.shield
    const result = resolveEnemyShipCollisions([drone], ship)

    expect(result.enemies.length).toBe(1)
    expect(result.killedEnemies.length).toBe(0)
    expect(result.ship.hp + result.ship.shield).toBeLessThan(before)
    expect(distance(result.enemies[0].pos, result.ship.pos)).toBeGreaterThan(
      drone.radius + result.ship.radius
    )
  })

  it('a ramming bomber still dies on contact and is reported as killed', () => {
    const ship = createShip(ShipKind.fighter, WORLD_SIZE)
    const bomber = { ...createEnemy(EnemyKind.bomber, { x: ship.pos.x, y: ship.pos.y }) }

    const result = resolveEnemyShipCollisions([bomber], ship)

    expect(result.enemies.length).toBe(0)
    expect(result.killedEnemies.length).toBe(1)
    expect(result.killedEnemies[0].kind).toBe(EnemyKind.bomber)
  })
})

describe('resolveEnemyAllyMeleeCollisions — bounce vs explode', () => {
  it('a ramming drone survives, damages the ally, and is knocked back', () => {
    const ally = createAlly({ x: 500, y: 500 })
    const drone = { ...createEnemy(EnemyKind.drone, { x: ally.pos.x, y: ally.pos.y }) }

    const result = resolveEnemyAllyMeleeCollisions([drone], [ally])

    expect(result.enemies.length).toBe(1)
    expect(result.killedEnemies.length).toBe(0)
    expect(result.allies[0].hp).toBeLessThan(ally.hp)
    expect(distance(result.enemies[0].pos, ally.pos)).toBeGreaterThan(drone.radius + ally.radius)
  })

  it('a ramming bomber dies on contact and is reported as killed', () => {
    const ally = createAlly({ x: 500, y: 500 })
    const bomber = { ...createEnemy(EnemyKind.bomber, { x: ally.pos.x, y: ally.pos.y }) }

    const result = resolveEnemyAllyMeleeCollisions([bomber], [ally])

    expect(result.enemies.length).toBe(0)
    expect(result.killedEnemies.length).toBe(1)
    expect(result.killedEnemies[0].kind).toBe(EnemyKind.bomber)
  })
})
