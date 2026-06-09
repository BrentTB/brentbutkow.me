import { createEnemy } from '../entities/entity-creator'
import { getBossDefinition } from './index'
import type { Enemy, Vec2 } from '../types'

// Sibling generators within this range push each other apart; GEN_REPEL_PUSH is
// the max tangential nudge (px) before re-projection onto the ring. Together
// they spread the ring evenly and stop the boss's motion dragging them into a
// single clump behind it.
const GEN_REPEL_RANGE = 200
const GEN_REPEL_PUSH = 18

// Computes each linked shield generator's position: pinned to the boss's ring
// radius (fixed standoff) while repelling its siblings so the ring stays evenly
// spread instead of collapsing onto one point as the boss moves.
function computeShieldRingPositions(enemies: Enemy[]): Map<string, Vec2> {
  const positions = new Map<string, Vec2>()
  for (const boss of enemies) {
    if (!boss.boss) continue
    const def = getBossDefinition(boss.kind)
    const ringDist = def?.shieldRingDistance ?? 0
    if (ringDist <= 0) continue

    const gens = boss.boss.linkedIds
      .map((id) => enemies.find((e) => e.id === id && e.hp > 0))
      .filter((g): g is Enemy => g !== undefined)

    for (const g of gens) {
      // Radial pin direction — the generator's current angle around the boss.
      const dx = g.pos.x - boss.pos.x
      const dy = g.pos.y - boss.pos.y
      const d = Math.sqrt(dx * dx + dy * dy)
      const nx = d > 0.0001 ? dx / d : 1
      const ny = d > 0.0001 ? dy / d : 0

      // Tangential spread — sum repulsion from the other generators.
      let rx = 0
      let ry = 0
      for (const o of gens) {
        if (o.id === g.id) continue
        const ex = g.pos.x - o.pos.x
        const ey = g.pos.y - o.pos.y
        const ed = Math.sqrt(ex * ex + ey * ey)
        if (ed > 0 && ed < GEN_REPEL_RANGE) {
          const f = (GEN_REPEL_RANGE - ed) / GEN_REPEL_RANGE
          rx += (ex / ed) * f
          ry += (ey / ed) * f
        }
      }

      // Nudge the ring point by the repulsion, then re-project to the ring so
      // only the tangential component takes effect (distance stays fixed).
      const cx = boss.pos.x + nx * ringDist + rx * GEN_REPEL_PUSH
      const cy = boss.pos.y + ny * ringDist + ry * GEN_REPEL_PUSH
      const cdx = cx - boss.pos.x
      const cdy = cy - boss.pos.y
      const cd = Math.sqrt(cdx * cdx + cdy * cdy) || 1
      positions.set(g.id, {
        x: boss.pos.x + (cdx / cd) * ringDist,
        y: boss.pos.y + (cdy / cd) * ringDist,
      })
    }
  }
  return positions
}

// Runs once per game tick for all boss enemies. Handles first-spawn (onSpawn),
// ongoing updates (drone spawning, phase advances, shield regeneration), and
// holds linked shield generators in an evenly-spread ring around the boss.
// Returns the updated enemies list plus any newly spawned entities.
export function updateBossAI(
  enemies: Enemy[],
  dt: number
): { enemies: Enemy[]; newEnemies: Enemy[] } {
  let newEnemies: Enemy[] = []

  const ringPositions = computeShieldRingPositions(enemies)

  const updatedEnemies = enemies.map((enemy) => {
    // Linked generator: take its pinned + repelled ring position.
    const pinned = ringPositions.get(enemy.id)
    if (pinned) return { ...enemy, pos: pinned }

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

    // Ongoing update: phase advance, drone spawning, shield regeneration.
    if (def.onUpdate) {
      const result = def.onUpdate(updated, dt)
      const drones = result.spawns.map((s) => createEnemy(s.kind, s.pos))
      newEnemies = [...newEnemies, ...drones]
      let runtime = result.updatedRuntime
      // Regenerated shield ring: create the new generators and re-point linkedIds.
      if (result.linkedSpawns && result.linkedSpawns.length > 0) {
        const regenerated = result.linkedSpawns.map((s) => createEnemy(s.kind, s.pos))
        newEnemies = [...newEnemies, ...regenerated]
        runtime = { ...runtime, linkedIds: regenerated.map((e) => e.id) }
      }
      updated = { ...updated, boss: runtime }
    }

    return updated
  })

  return { enemies: updatedEnemies, newEnemies }
}
