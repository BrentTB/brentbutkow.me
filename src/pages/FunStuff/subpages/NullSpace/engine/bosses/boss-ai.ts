import { createEnemy } from '../entities/entity-creator'
import { getBossDefinition } from './index'
import type { Enemy, Vec2 } from '../types'

// Asks each boss's positionLinked hook where its alive linked entities belong
// this tick (generator rings, worm chains). `linked` preserves linkedIds order —
// chain-style bosses depend on it.
function computeLinkedPositions(enemies: Enemy[]): Map<string, { pos: Vec2; vel: Vec2 }> {
  const positions = new Map<string, { pos: Vec2; vel: Vec2 }>()
  for (const boss of enemies) {
    if (!boss.boss) continue
    const def = getBossDefinition(boss.kind)
    if (!def?.positionLinked) continue

    const linked = boss.boss.linkedIds
      .map((id) => enemies.find((e) => e.id === id && e.hp > 0))
      .filter((g): g is Enemy => g !== undefined)
    if (linked.length === 0) continue

    for (const [id, placement] of def.positionLinked(boss, linked)) {
      positions.set(id, placement)
    }
  }
  return positions
}

// Runs once per game tick for all boss enemies. Handles first-spawn (onSpawn),
// ongoing updates (drone spawning, phase advances, shield regeneration, boss
// self-motion), and pins linked entities where their boss's positionLinked
// hook places them. Returns the updated enemies list plus newly spawned entities.
export function updateBossAI(
  enemies: Enemy[],
  dt: number,
  ctx: { shipPos: Vec2; worldSize: Vec2 }
): { enemies: Enemy[]; newEnemies: Enemy[] } {
  let newEnemies: Enemy[] = []

  const linkedPositions = computeLinkedPositions(enemies)

  const updatedEnemies = enemies.map((enemy) => {
    // Linked entity: take the position + facing its boss computed for it.
    const pinned = linkedPositions.get(enemy.id)
    if (pinned) return { ...enemy, pos: pinned.pos, vel: pinned.vel }

    if (!enemy.boss) return enemy
    const def = getBossDefinition(enemy.kind)
    if (!def) return enemy

    let updated = enemy

    // First tick after creation: fire onSpawn, populate linkedIds.
    if (def.onSpawn && !enemy.boss.hasSpawned) {
      const spawned = def.onSpawn(enemy).map((s) => createEnemy(s.kind, s.pos))
      newEnemies = [...newEnemies, ...spawned]
      updated = {
        ...updated,
        boss: { ...updated.boss!, linkedIds: spawned.map((e) => e.id), hasSpawned: true },
      }
    }

    // Ongoing update: phase advance, spawning, shield regeneration, self-motion.
    if (def.onUpdate) {
      const result = def.onUpdate(updated, dt, {
        shipPos: ctx.shipPos,
        worldSize: ctx.worldSize,
        enemies,
      })
      const drones = result.spawns.map((s) => createEnemy(s.kind, s.pos))
      newEnemies = [...newEnemies, ...drones]
      let runtime = result.updatedRuntime
      // Regenerated shield ring: create the new generators and re-point linkedIds.
      if (result.linkedSpawns && result.linkedSpawns.length > 0) {
        const regenerated = result.linkedSpawns.map((s) => createEnemy(s.kind, s.pos))
        newEnemies = [...newEnemies, ...regenerated]
        runtime = { ...runtime, linkedIds: regenerated.map((e) => e.id) }
      }
      updated = { ...updated, ...result.self, boss: runtime }
    }

    return updated
  })

  return { enemies: updatedEnemies, newEnemies }
}
