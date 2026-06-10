import { EnemyKind } from '../types'
import type { Enemy, Vec2 } from '../types'
import { rng } from '../math/random'
import { hasAliveLinked } from './boss-definition'
import type { BossDefinition, DropSpec, SpawnSpec } from './boss-definition'

// Phase 1 (HP > 50%): drone pair every 10s. Phase 2 (HP ≤ 50%): every 5s.
const DRONE_INTERVAL_P1 = 10
const DRONE_INTERVAL_P2 = 5
// Distance from boss center to the shield generator ring.
const SHIELD_RING_DIST = 90
const PHASE1_GENERATORS = 3
const PHASE2_GENERATORS = 5
// Sibling generators within this range push each other apart; GEN_REPEL_PUSH is
// the max tangential nudge (px) before re-projection onto the ring. Together
// they spread the ring evenly and stop the boss's motion dragging them into a
// single clump behind it.
const GEN_REPEL_RANGE = 200
const GEN_REPEL_PUSH = 18

// Evenly-spaced shield generator spawn specs around the boss.
function ringSpecs(boss: Enemy, count: number): SpawnSpec[] {
  const specs: SpawnSpec[] = []
  for (let i = 0; i < count; i++) {
    const angle = Math.PI / 2 + (i * 2 * Math.PI) / count
    specs.push({
      kind: EnemyKind.shieldGenerator,
      pos: {
        x: boss.pos.x + Math.cos(angle) * SHIELD_RING_DIST,
        y: boss.pos.y + Math.sin(angle) * SHIELD_RING_DIST,
      },
    })
  }
  return specs
}

// Pins each generator to the ring radius (fixed standoff) while repelling its
// siblings so the ring stays evenly spread instead of collapsing onto one
// point as the boss moves.
function positionGeneratorRing(boss: Enemy, gens: Enemy[]): Map<string, { pos: Vec2; vel: Vec2 }> {
  const positions = new Map<string, { pos: Vec2; vel: Vec2 }>()
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
    const cx = boss.pos.x + nx * SHIELD_RING_DIST + rx * GEN_REPEL_PUSH
    const cy = boss.pos.y + ny * SHIELD_RING_DIST + ry * GEN_REPEL_PUSH
    const cdx = cx - boss.pos.x
    const cdy = cy - boss.pos.y
    const cd = Math.sqrt(cdx * cdx + cdy * cdy) || 1
    positions.set(g.id, {
      pos: {
        x: boss.pos.x + (cdx / cd) * SHIELD_RING_DIST,
        y: boss.pos.y + (cdy / cd) * SHIELD_RING_DIST,
      },
      vel: { x: 0, y: 0 },
    })
  }
  return positions
}

export const DREADNOUGHT_BOSS: BossDefinition = {
  kind: EnemyKind.dreadnought,
  hpBarLabel: 'DREADNOUGHT',

  initialState: () => ({
    phase: 1,
    droneSpawnTimer: DRONE_INTERVAL_P1,
    linkedIds: [],
    hasSpawned: false,
  }),

  onSpawn: (boss) => ringSpecs(boss, PHASE1_GENERATORS),

  canTakeDamage: (boss, enemies) => !hasAliveLinked(boss, enemies),

  positionLinked: positionGeneratorRing,

  onUpdate: (boss, dt) => {
    // boss-ai only invokes onUpdate on confirmed boss enemies, so boss.boss is set.
    const runtime = boss.boss!
    const newPhase = boss.hp <= boss.maxHp * 0.5 ? 2 : 1
    const interval = newPhase === 2 ? DRONE_INTERVAL_P2 : DRONE_INTERVAL_P1
    let droneSpawnTimer = runtime.droneSpawnTimer - dt
    const spawns: SpawnSpec[] = []

    if (droneSpawnTimer <= 0) {
      const angle = rng.range(0, Math.PI * 2)
      const dist = boss.radius + 50
      spawns.push(
        {
          kind: EnemyKind.drone,
          pos: { x: boss.pos.x + Math.cos(angle) * dist, y: boss.pos.y + Math.sin(angle) * dist },
        },
        {
          kind: EnemyKind.drone,
          pos: {
            x: boss.pos.x + Math.cos(angle + Math.PI) * dist,
            y: boss.pos.y + Math.sin(angle + Math.PI) * dist,
          },
        }
      )
      droneSpawnTimer = interval
    }

    // Phase 1 → 2 transition: re-arm the shield with a larger generator ring.
    // Reaching ≤50% HP requires the phase-1 shield fully down (every generator
    // dead — canTakeDamage gates all damage otherwise), so replacing linkedIds
    // here can never orphan a still-living generator.
    const linkedSpawns =
      runtime.phase === 1 && newPhase === 2 ? ringSpecs(boss, PHASE2_GENERATORS) : undefined

    return {
      updatedRuntime: { ...runtime, phase: newPhase, droneSpawnTimer },
      spawns,
      linkedSpawns,
    }
  },

  onDeath: (boss): DropSpec[] => {
    // 1–4 space metal burst outward from the boss position.
    const count = 1 + rng.intRange(0, 3)
    const drops: DropSpec[] = []
    for (let i = 0; i < count; i++) {
      const angle = rng.range(0, Math.PI * 2)
      const dist = rng.range(20, 60)
      drops.push({
        pos: { x: boss.pos.x + Math.cos(angle) * dist, y: boss.pos.y + Math.sin(angle) * dist },
        vel: { x: Math.cos(angle) * 40, y: Math.sin(angle) * 40 },
      })
    }
    return drops
  },
}
