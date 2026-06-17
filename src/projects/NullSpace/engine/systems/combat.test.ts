import { describe, it, expect } from 'vitest'
import {
  resolveDeathEffects,
  resolveEnemyAllyMeleeCollisions,
  resolveEnemyProjectileAllyCollisions,
  resolveEnemyProjectileShipCollisions,
  resolveEnemyShipCollisions,
  resolveProjectileEnemyCollisions,
  updateProjectiles,
} from './combat'
import { createAlly, createEnemy, createProjectile, createShip } from '../entities/entity-creator'
import { buildHelperProjectile } from '../weapons'
import { distance } from '../math/collision'
import { EffectKind, EnemyKind, ProjectileOwner, ShipKind } from '../types'
import type { ShieldEffect } from '../types'
import { ENEMY_STATS, WORLD_SIZE } from '../../data'

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

// Non-bomber enemies survive a ram, deal damage, and get knocked back. The
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

// --- Regression: plain bullets behave exactly as they did pre-weapons ---
// If a future change adds new branches around the default collision path, this
// guard catches accidental fallout. Land it BEFORE refactoring the loop.
describe('resolveProjectileEnemyCollisions — bullet (default) unchanged', () => {
  it('a single bullet hits one enemy, is consumed, and damage applies', () => {
    const enemy = createEnemy(EnemyKind.drone, { x: 100, y: 0 })
    const proj = createProjectile({ x: 0, y: 0 }, enemy.pos, ProjectileOwner.ship, 10)
    // Place projectile at the enemy so the swept segment hits.
    const swept = { ...proj, prevPos: { x: 0, y: 0 }, pos: { x: enemy.pos.x, y: enemy.pos.y } }
    const result = resolveProjectileEnemyCollisions([swept], [enemy])
    expect(result.projectiles).toHaveLength(0)
    expect(result.enemies[0]?.hp ?? 0).toBeLessThan(enemy.hp)
    expect(result.newEffects).toEqual([])
  })

  it('two bullets passing through the same dead enemy only consume the one that killed it', () => {
    // Use 100-damage bullets vs a 20-hp drone so the first hit kills outright.
    const enemy = createEnemy(EnemyKind.drone, { x: 100, y: 0 })
    const p1 = {
      ...createProjectile({ x: 0, y: 0 }, enemy.pos, ProjectileOwner.ship, 100),
      prevPos: { x: 0, y: 0 },
      pos: { x: enemy.pos.x, y: enemy.pos.y },
    }
    const p2 = {
      ...createProjectile({ x: 0, y: 0 }, enemy.pos, ProjectileOwner.ship, 100),
      prevPos: { x: 0, y: 0 },
      pos: { x: enemy.pos.x, y: enemy.pos.y },
    }
    const result = resolveProjectileEnemyCollisions([p1, p2], [enemy])
    // One bullet consumed; one survived through the corpse.
    expect(result.projectiles).toHaveLength(1)
    expect(result.enemies).toHaveLength(0)
  })
})

describe('resolveProjectileEnemyCollisions — laser pierce', () => {
  it('damages multiple enemies in one pass, up to maxHits', () => {
    const enemies = [
      createEnemy(EnemyKind.drone, { x: 100, y: 0 }),
      createEnemy(EnemyKind.drone, { x: 200, y: 0 }),
      createEnemy(EnemyKind.drone, { x: 300, y: 0 }),
    ]
    // Beam swept across all three — pierce=2 should hit the first two only.
    const beam = buildHelperProjectile({ x: 0, y: 0 }, { x: 1000, y: 0 }, 5, {
      speed: 1000,
      lifetime: 1,
      pierce: { maxHits: 2, hitEnemyIds: [] },
    })
    beam.prevPos = { x: 0, y: 0 }
    beam.pos = { x: 400, y: 0 }

    const result = resolveProjectileEnemyCollisions([beam], enemies)
    // Beam consumed once maxHits reached.
    expect(result.projectiles).toHaveLength(0)
    // First two damaged, third untouched.
    expect(result.enemies.find((e) => e.id === enemies[0].id)?.hp).toBeLessThan(enemies[0].hp)
    expect(result.enemies.find((e) => e.id === enemies[1].id)?.hp).toBeLessThan(enemies[1].hp)
    expect(result.enemies.find((e) => e.id === enemies[2].id)?.hp).toBe(enemies[2].hp)
    // Hit ids accumulated so subsequent ticks don't re-damage.
    expect(beam.pierce?.hitEnemyIds).toHaveLength(2)
  })
})

describe('resolveProjectileEnemyCollisions — ricochet bounce', () => {
  it('redirects velocity toward the nearest unhit enemy in range after a hit', () => {
    const a = createEnemy(EnemyKind.drone, { x: 100, y: 0 })
    const b = createEnemy(EnemyKind.drone, { x: 120, y: 60 })
    const proj = buildHelperProjectile({ x: 0, y: 0 }, a.pos, 5, {
      speed: 200,
      lifetime: 3,
      bounce: { remaining: 2, hitEnemyIds: [], bounceRange: 300 },
    })
    proj.prevPos = { x: 0, y: 0 }
    proj.pos = { x: a.pos.x, y: a.pos.y }

    const result = resolveProjectileEnemyCollisions([proj], [a, b])
    // Projectile survives — one bounce left.
    expect(result.projectiles).toHaveLength(1)
    // Hit-list grew.
    expect(proj.bounce?.hitEnemyIds).toContain(a.id)
    expect(proj.bounce?.remaining).toBe(1)
    // Velocity now points roughly toward `b` (positive x and y).
    expect(proj.vel.x).toBeGreaterThan(0)
    expect(proj.vel.y).toBeGreaterThan(0)
  })

  it('is consumed when no unhit enemy is in range', () => {
    const a = createEnemy(EnemyKind.drone, { x: 100, y: 0 })
    const proj = buildHelperProjectile({ x: 0, y: 0 }, a.pos, 5, {
      speed: 200,
      lifetime: 3,
      bounce: { remaining: 3, hitEnemyIds: [], bounceRange: 10 },
    })
    proj.prevPos = { x: 0, y: 0 }
    proj.pos = { x: a.pos.x, y: a.pos.y }

    const result = resolveProjectileEnemyCollisions([proj], [a])
    // No bounce target → projectile consumed.
    expect(result.projectiles).toHaveLength(0)
  })
})

describe('resolveProjectileEnemyCollisions — nuke detonate', () => {
  it('applies AoE damage and emits a nuclearWaste effect', () => {
    const inBlast = createEnemy(EnemyKind.drone, { x: 110, y: 0 })
    const outside = createEnemy(EnemyKind.drone, { x: 500, y: 0 })
    const shell = buildHelperProjectile({ x: 0, y: 0 }, { x: 100, y: 0 }, 50, {
      speed: 100,
      lifetime: 2,
      radius: 8,
      detonate: {
        aoeRadius: 80,
        blastDamage: 50,
        wasteRadius: 100,
        wasteDps: 5,
        wasteDuration: 4,
        wasteGrowDuration: 0.5,
      },
    })
    shell.prevPos = { x: 0, y: 0 }
    shell.pos = { x: inBlast.pos.x, y: inBlast.pos.y }

    const result = resolveProjectileEnemyCollisions([shell], [inBlast, outside])
    // Shell consumed.
    expect(result.projectiles).toHaveLength(0)
    // In-blast enemy took damage; outside one untouched.
    expect(result.enemies.find((e) => e.id === outside.id)?.hp).toBe(outside.hp)
    // Lingering nuclear-waste effect emitted.
    expect(result.newEffects).toHaveLength(1)
    expect(result.newEffects[0].kind).toBe(EffectKind.nuclearWaste)
  })
})

// Single-frame collision tests cover the redirect math, but the user-facing
// bug is "ricochet hits one enemy then disappears" — which can only happen if
// the multi-frame pipeline (updateProjectiles → collisions, every frame)
// somehow drops the bounce state OR the bouncing projectile gets consumed.
// Stepping multiple frames here catches anything single-frame tests can't.
describe('resolveProjectileEnemyCollisions — ricochet lifetime extends per bounce', () => {
  it('chains through 6 spaced-out enemies despite a short base lifetime', () => {
    // Six enemies spread roughly 200px apart along a curve. Without lifetime
    // extension, a 1.5s round at 400px/s caps at ~3 hops. With extension, it
    // should make it through all of them.
    const enemies = [
      createEnemy(EnemyKind.tank, { x: 100, y: 0 }),
      createEnemy(EnemyKind.tank, { x: 240, y: 120 }),
      createEnemy(EnemyKind.tank, { x: 400, y: 220 }),
      createEnemy(EnemyKind.tank, { x: 560, y: 130 }),
      createEnemy(EnemyKind.tank, { x: 720, y: 0 }),
      createEnemy(EnemyKind.tank, { x: 880, y: 100 }),
    ]
    const proj = buildHelperProjectile({ x: 0, y: 0 }, enemies[0].pos, 5, {
      speed: 400,
      lifetime: 1.5,
      bounce: {
        remaining: 10,
        hitEnemyIds: [],
        bounceRange: 600,
        lifetimePerBounce: 1.0,
      },
    })

    let projectiles = [proj]
    let liveEnemies = enemies
    const dt = 0.016
    for (let i = 0; i < 400; i++) {
      projectiles = updateProjectiles(projectiles, liveEnemies, dt)
      const r = resolveProjectileEnemyCollisions(projectiles, liveEnemies)
      projectiles = r.projectiles
      liveEnemies = r.enemies
      if (projectiles.length === 0) break
    }
    // The bounce list should have grown well past what 1.5s of unextended
    // flight would allow — proving the per-bounce extension is doing its job.
    expect(proj.bounce!.hitEnemyIds.length).toBeGreaterThanOrEqual(5)
  })

  it('still dies of lifetime when bounces have no extension (control test)', () => {
    const enemies = [
      createEnemy(EnemyKind.tank, { x: 100, y: 0 }),
      createEnemy(EnemyKind.tank, { x: 240, y: 120 }),
      createEnemy(EnemyKind.tank, { x: 400, y: 220 }),
      createEnemy(EnemyKind.tank, { x: 560, y: 130 }),
      createEnemy(EnemyKind.tank, { x: 720, y: 0 }),
      createEnemy(EnemyKind.tank, { x: 880, y: 100 }),
    ]
    const proj = buildHelperProjectile({ x: 0, y: 0 }, enemies[0].pos, 5, {
      speed: 400,
      lifetime: 1.5,
      // No lifetimePerBounce — projectile times out naturally.
      bounce: { remaining: 10, hitEnemyIds: [], bounceRange: 600 },
    })
    let projectiles = [proj]
    let liveEnemies = enemies
    const dt = 0.016
    for (let i = 0; i < 400; i++) {
      projectiles = updateProjectiles(projectiles, liveEnemies, dt)
      const r = resolveProjectileEnemyCollisions(projectiles, liveEnemies)
      projectiles = r.projectiles
      liveEnemies = r.enemies
      if (projectiles.length === 0) break
    }
    // Without the extension, only the first few targets get hit before time
    // runs out. Asserts the extension is the thing making the difference above.
    expect(proj.bounce!.hitEnemyIds.length).toBeLessThan(5)
  })
})

describe('resolveProjectileEnemyCollisions — ricochet multi-frame flight', () => {
  it('hits multiple enemies across frames after firing', () => {
    const a = createEnemy(EnemyKind.drone, { x: 100, y: 0 })
    const b = createEnemy(EnemyKind.drone, { x: 220, y: 0 })
    const proj = buildHelperProjectile({ x: 0, y: 0 }, a.pos, 100, {
      speed: 400,
      lifetime: 3,
      bounce: { remaining: 3, hitEnemyIds: [], bounceRange: 500 },
    })

    let projectiles = [proj]
    let liveEnemies = [a, b]
    const dt = 0.016
    // Run up to 2 seconds of frames or until projectile is consumed.
    for (let i = 0; i < 125; i++) {
      projectiles = updateProjectiles(projectiles, liveEnemies, dt)
      const r = resolveProjectileEnemyCollisions(projectiles, liveEnemies)
      projectiles = r.projectiles
      liveEnemies = r.enemies
      if (projectiles.length === 0) break
    }

    // Both enemies should have been damaged or killed.
    const aAfter = liveEnemies.find((e) => e.id === a.id)
    const bAfter = liveEnemies.find((e) => e.id === b.id)
    const aDamaged = !aAfter || aAfter.hp < a.hp
    const bDamaged = !bAfter || bAfter.hp < b.hp
    expect(aDamaged).toBe(true)
    expect(bDamaged).toBe(true)
  })

  it('keeps the bounce state across frames (remaining stays in sync with hit count)', () => {
    const enemies = [
      createEnemy(EnemyKind.drone, { x: 100, y: 0 }),
      createEnemy(EnemyKind.drone, { x: 200, y: 80 }),
      createEnemy(EnemyKind.drone, { x: 320, y: 0 }),
    ]
    const proj = buildHelperProjectile({ x: 0, y: 0 }, enemies[0].pos, 100, {
      speed: 400,
      lifetime: 3,
      bounce: { remaining: 3, hitEnemyIds: [], bounceRange: 500 },
    })

    let projectiles = [proj]
    let liveEnemies = enemies
    const dt = 0.016
    for (let i = 0; i < 200; i++) {
      projectiles = updateProjectiles(projectiles, liveEnemies, dt)
      const r = resolveProjectileEnemyCollisions(projectiles, liveEnemies)
      projectiles = r.projectiles
      liveEnemies = r.enemies
      if (projectiles.length === 0) break
    }

    // The original proj should have hit ≥ 2 distinct enemies. (It might be
    // consumed eventually, but the bounce list reflects whoever it touched.)
    expect(proj.bounce!.hitEnemyIds.length).toBeGreaterThanOrEqual(2)
  })
})

describe('resolveProjectileEnemyCollisions — missile splash (detonate without waste)', () => {
  it('applies AoE damage on contact but does NOT emit a waste effect', () => {
    const directHit = createEnemy(EnemyKind.drone, { x: 100, y: 0 })
    const inSplash = createEnemy(EnemyKind.drone, { x: 130, y: 0 })
    const outside = createEnemy(EnemyKind.drone, { x: 500, y: 0 })
    const missile = buildHelperProjectile({ x: 0, y: 0 }, directHit.pos, 12, {
      speed: 200,
      lifetime: 4,
      radius: 5,
      homing: true,
      detonate: { aoeRadius: 50, blastDamage: 8 },
    })
    missile.prevPos = { x: 0, y: 0 }
    missile.pos = { x: directHit.pos.x, y: directHit.pos.y }

    const result = resolveProjectileEnemyCollisions([missile], [directHit, inSplash, outside])
    // Missile consumed on impact.
    expect(result.projectiles).toHaveLength(0)
    // Splash hit both nearby enemies.
    expect(result.enemies.find((e) => e.id === directHit.id)?.hp).toBeLessThan(directHit.hp)
    expect(result.enemies.find((e) => e.id === inSplash.id)?.hp).toBeLessThan(inSplash.hp)
    // Outside enemy untouched.
    expect(result.enemies.find((e) => e.id === outside.id)?.hp).toBe(outside.hp)
    // No lingering DOT zone.
    expect(result.newEffects).toHaveLength(0)
  })
})

describe('updateProjectiles — missile homing', () => {
  it('re-aims velocity toward the nearest enemy each tick', () => {
    const enemy = createEnemy(EnemyKind.drone, { x: 0, y: 200 })
    // Missile starts moving in +x but enemy is in +y — homing should pull vel
    // toward +y over a single tick.
    const missile = buildHelperProjectile({ x: 0, y: 0 }, { x: 100, y: 0 }, 5, {
      speed: 200,
      lifetime: 2,
      homing: true,
    })
    const [advanced] = updateProjectiles([missile], [enemy], 0.05)
    expect(advanced.vel.y).toBeGreaterThan(0)
    // Y component should dominate by now since the enemy is straight up.
    expect(advanced.vel.y).toBeGreaterThan(advanced.vel.x)
  })
})

// A bomber's death blast hits allies in range, not just the ship. The shield
// shelters an ally on the same terms as the ship: the dome eats the blast only
// when the ally is inside it and the bomber is outside.
describe('resolveDeathEffects — bomber blast damages allies', () => {
  // Ship parked far away so it never absorbs the blast — isolates ally damage.
  const farShip = () => ({ ...createShip(ShipKind.fighter, WORLD_SIZE), pos: { x: 9000, y: 9000 } })

  function shield(centerOn: { x: number; y: number }, radius: number): ShieldEffect {
    return {
      id: 'test-shield',
      kind: EffectKind.shield,
      pos: { x: centerOn.x, y: centerOn.y },
      elapsed: 0,
      duration: 6,
      radius,
      grandfatheredEnemyIds: [],
    }
  }

  it('an ally inside the blast radius takes the explosion damage', () => {
    const ally = createAlly({ x: 500, y: 500 }, 100)
    const bomber = { ...createEnemy(EnemyKind.bomber, { x: ally.pos.x, y: ally.pos.y }) }

    const result = resolveDeathEffects([bomber], farShip(), [ally], [])

    expect(result.allies[0].hp).toBe(100 - ENEMY_STATS.bomber.explosionDamage)
  })

  it('an ally outside the blast radius is untouched', () => {
    const ally = createAlly({ x: 500, y: 500 }, 100)
    const bomber = {
      ...createEnemy(EnemyKind.bomber, {
        x: ally.pos.x + ENEMY_STATS.bomber.explosionRadius + 50,
        y: ally.pos.y,
      }),
    }

    const result = resolveDeathEffects([bomber], farShip(), [ally], [])

    expect(result.allies[0].hp).toBe(100)
  })

  it('a shield shelters the ally when the bomber detonates outside the dome', () => {
    const ally = createAlly({ x: 500, y: 500 }, 100)
    const bomber = { ...createEnemy(EnemyKind.bomber, { x: ally.pos.x + 40, y: ally.pos.y }) }
    // Dome over the ally, small enough to leave the bomber outside it.
    const dome = shield(ally.pos, 20)

    const result = resolveDeathEffects([bomber], farShip(), [ally], [dome])

    expect(result.allies[0].hp).toBe(100)
  })
})

// Toroidal world: blast / overlap / knockback checks must take the SHORT way
// across a seam. Each test puts an attacker and target on opposite edges — a few
// units apart through the wrap, ~2590 the long way — so it fails if the check
// uses raw euclidean math instead of toroidalDelta / checkCollision.
describe('combat — collisions across the world seam', () => {
  it('a missile blast damages an enemy whose nearest image is across the seam', () => {
    // Missile detonates on the trigger at the seam; the victim is 10 units away
    // through the x wrap. A raw euclidean blast distance (~2590) would miss it.
    const trigger = { ...createEnemy(EnemyKind.drone, { x: 5, y: 1300 }), hp: 1000 }
    const victim = { ...createEnemy(EnemyKind.drone, { x: WORLD_SIZE.x - 5, y: 1300 }), hp: 1000 }
    const missile = buildHelperProjectile({ x: 0, y: 1300 }, { x: 5, y: 1300 }, 0, {
      speed: 100,
      lifetime: 2,
      radius: 8,
      detonate: { aoeRadius: 100, blastDamage: 25 },
    })
    missile.prevPos = { x: 5, y: 1300 }
    missile.pos = { x: 5, y: 1300 }

    // Victim sits inside the 100u blast across the seam, far the long way.
    expect(distance(missile.pos, victim.pos)).toBeLessThan(100)

    const result = resolveProjectileEnemyCollisions([missile], [trigger, victim])
    expect(result.enemies.find((e) => e.id === victim.id)?.hp).toBeLessThan(1000)
  })

  it('an enemy projectile hits an ally across the seam', () => {
    const ally = createAlly({ x: 3, y: 800 }, 100)
    const bullet = createProjectile(
      { x: WORLD_SIZE.x - 3, y: 800 },
      { x: WORLD_SIZE.x - 13, y: 800 },
      ProjectileOwner.enemy,
      10
    )
    expect(distance(bullet.pos, ally.pos)).toBeLessThan(bullet.radius + ally.radius)

    const result = resolveEnemyProjectileAllyCollisions([bullet], [ally])
    expect(result.allies[0].hp).toBeLessThan(100)
    expect(result.projectiles).toHaveLength(0)
  })

  it('an enemy melees an ally across the seam and is knocked back the short way', () => {
    const ally = createAlly({ x: 5, y: 500 }, 100)
    const drone = { ...createEnemy(EnemyKind.drone, { x: WORLD_SIZE.x - 5, y: 500 }) }
    expect(distance(drone.pos, ally.pos)).toBeLessThan(drone.radius + ally.radius)

    const result = resolveEnemyAllyMeleeCollisions([drone], [ally])
    // Collision registered through the seam → ally took contact damage.
    expect(result.allies[0].hp).toBeLessThan(100)
    // Knocked back along the short (wrapping) axis toward −x, not the long way.
    expect(result.enemies[0].pos.x).toBeLessThan(ally.pos.x)
  })
})
