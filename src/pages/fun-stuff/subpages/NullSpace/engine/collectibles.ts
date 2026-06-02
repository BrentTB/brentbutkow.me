import { POWER_ORB, SPACE_METAL } from '../data'
import { distance } from './collision'
import { uid } from './entities'
import { homeTowardTarget } from './homing'
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
      homing: false,
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
        homing: false,
      })
    }
  }

  return collectibles
}

export function updateCollectibles(
  collectibles: Collectible[],
  ship: Ship,
  dt: number
): { collectibles: Collectible[]; powerGained: number; spaceMetalGained: number } {
  const surviving: Collectible[] = []
  let powerGained = 0
  let spaceMetalGained = 0

  for (const c of collectibles) {
    const elapsed = c.elapsed + dt

    // Non-homing collectibles expire on lifetime; homing ones have already
    // been claimed by the player and should always make it home.
    if (!c.homing && elapsed >= c.lifetime) continue

    let updated: Collectible = { ...c, elapsed }

    // Power orbs auto-transition from float → homing once they've drifted long
    // enough. Space metals only become homing via tryCollectSpaceMetal.
    if (
      updated.kind === CollectibleKind.powerOrb &&
      !updated.homing &&
      elapsed >= POWER_ORB.floatDuration
    ) {
      updated = { ...updated, homing: true }
    }

    if (updated.homing) {
      const motion = homeTowardTarget(updated.pos, ship.pos, POWER_ORB.magnetStrength, dt)
      updated = { ...updated, pos: motion.pos, vel: motion.vel }

      if (distance(updated.pos, ship.pos) < ship.radius + POWER_ORB.radius + 4) {
        if (updated.kind === CollectibleKind.powerOrb) powerGained += updated.value
        else spaceMetalGained += updated.value
        continue
      }
    } else {
      // Float phase — gentle drag-driven drift.
      const vx = updated.vel.x * POWER_ORB.drag
      const vy = updated.vel.y * POWER_ORB.drag
      updated = {
        ...updated,
        vel: { x: vx, y: vy },
        pos: { x: updated.pos.x + vx * dt, y: updated.pos.y + vy * dt },
      }
    }

    surviving.push(updated)
  }

  return { collectibles: surviving, powerGained, spaceMetalGained }
}

/**
 * Marks any space metal hit by a click as homing — the update loop then flies
 * it to the ship and credits the counter on arrival (no instant teleport-collect).
 * Returns clicks that did NOT hit any metal so they can be passed on to the
 * ability system.
 */
export function tryCollectSpaceMetal(
  collectibles: Collectible[],
  clicks: Vec2[]
): { collectibles: Collectible[]; remainingClicks: Vec2[] } {
  let current = collectibles
  const remainingClicks: Vec2[] = []

  for (const click of clicks) {
    let consumed = false

    for (let i = 0; i < current.length; i++) {
      const c = current[i]
      if (c.kind !== CollectibleKind.spaceMetal) continue
      if (c.homing) continue // already heading home from a prior click
      if (distance(click, c.pos) < SPACE_METAL.collectionRadius) {
        current = [...current.slice(0, i), { ...c, homing: true }, ...current.slice(i + 1)]
        consumed = true
        break
      }
    }

    if (!consumed) remainingClicks.push(click)
  }

  return { collectibles: current, remainingClicks }
}
