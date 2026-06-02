import { POWER_ORB, SPACE_METAL } from '../data'
import { distance } from './collision'
import { uid } from './entities'
import { rng } from './random'
import { CollectibleKind } from './types'
import type { Collectible, Enemy, Ship, Vec2 } from './types'

export function spawnCollectiblesFromKills(killedEnemies: Enemy[]): Collectible[] {
  const collectibles: Collectible[] = []

  for (const enemy of killedEnemies) {
    collectibles.push({
      id: uid(),
      kind: CollectibleKind.powerOrb,
      pos: { ...enemy.pos },
      vel: { x: rng.range(-30, 30), y: rng.range(-30, 30) },
      value: enemy.powerReward,
      elapsed: 0,
      lifetime: POWER_ORB.lifetime,
    })

    const chance = SPACE_METAL.dropChance[enemy.kind] ?? 0
    if (rng.next() < chance) {
      collectibles.push({
        id: uid(),
        kind: CollectibleKind.spaceMetal,
        pos: { x: enemy.pos.x + rng.range(-10, 10), y: enemy.pos.y + rng.range(-10, 10) },
        vel: { x: 0, y: 0 },
        value: 1,
        elapsed: 0,
        lifetime: SPACE_METAL.lifetime,
      })
    }
  }

  return collectibles
}

export function updateCollectibles(
  collectibles: Collectible[],
  ship: Ship,
  dt: number
): { collectibles: Collectible[]; powerGained: number } {
  const surviving: Collectible[] = []
  let powerGained = 0

  for (const c of collectibles) {
    const elapsed = c.elapsed + dt

    if (elapsed >= c.lifetime) continue

    if (c.kind === CollectibleKind.powerOrb) {
      const result = updatePowerOrb(c, elapsed, ship, dt)
      if (result.collected) {
        powerGained += c.value
      } else {
        surviving.push(result.orb)
      }
    } else {
      surviving.push({ ...c, elapsed })
    }
  }

  return { collectibles: surviving, powerGained }
}

function updatePowerOrb(
  orb: Collectible,
  elapsed: number,
  ship: Ship,
  dt: number
): { orb: Collectible; collected: boolean } {
  let vx = orb.vel.x
  let vy = orb.vel.y

  if (elapsed < POWER_ORB.floatDuration) {
    vx *= POWER_ORB.drag
    vy *= POWER_ORB.drag
  } else {
    // Direct velocity toward ship — fast enough to catch the patrolling ship
    const dx = ship.pos.x - orb.pos.x
    const dy = ship.pos.y - orb.pos.y
    const dist = Math.sqrt(dx * dx + dy * dy)
    if (dist > 0.1) {
      vx = (dx / dist) * POWER_ORB.magnetStrength
      vy = (dy / dist) * POWER_ORB.magnetStrength
    }
  }

  const newPos = { x: orb.pos.x + vx * dt, y: orb.pos.y + vy * dt }
  const dist = distance(newPos, ship.pos)

  if (dist < ship.radius + POWER_ORB.radius + 4) {
    return { orb: orb, collected: true }
  }

  return {
    orb: { ...orb, pos: newPos, vel: { x: vx, y: vy }, elapsed },
    collected: false,
  }
}

export function tryCollectSpaceMetal(
  collectibles: Collectible[],
  clicks: Vec2[]
): { collectibles: Collectible[]; spaceMetalGained: number; remainingClicks: Vec2[] } {
  let spaceMetalGained = 0
  let currentCollectibles = collectibles
  const remainingClicks: Vec2[] = []

  for (const click of clicks) {
    let consumed = false

    for (let i = 0; i < currentCollectibles.length; i++) {
      const c = currentCollectibles[i]
      if (c.kind !== CollectibleKind.spaceMetal) continue

      if (distance(click, c.pos) < SPACE_METAL.collectionRadius) {
        spaceMetalGained += c.value
        currentCollectibles = [
          ...currentCollectibles.slice(0, i),
          ...currentCollectibles.slice(i + 1),
        ]
        consumed = true
        break
      }
    }

    if (!consumed) remainingClicks.push(click)
  }

  return { collectibles: currentCollectibles, spaceMetalGained, remainingClicks }
}
