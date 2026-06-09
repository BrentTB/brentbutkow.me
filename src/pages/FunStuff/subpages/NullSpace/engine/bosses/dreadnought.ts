import { EnemyKind } from '../types'
import type { Enemy } from '../types'
import { rng } from '../math/random'
import type { BossDefinition, DropSpec, SpawnSpec } from './boss-definition'

// Phase 1 (HP > 50%): drone pair every 10s. Phase 2 (HP ≤ 50%): every 5s.
const DRONE_INTERVAL_P1 = 10
const DRONE_INTERVAL_P2 = 5
// Distance from boss center to the shield generator ring.
const SHIELD_RING_DIST = 90
const PHASE1_GENERATORS = 3
const PHASE2_GENERATORS = 5

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

export const DREADNOUGHT_BOSS: BossDefinition = {
  kind: EnemyKind.dreadnought,
  hpBarLabel: 'DREADNOUGHT',
  shieldRingDistance: SHIELD_RING_DIST,

  initialState: () => ({
    phase: 1,
    droneSpawnTimer: DRONE_INTERVAL_P1,
    linkedIds: [],
    hasSpawned: false,
  }),

  onSpawn: (boss) => ringSpecs(boss, PHASE1_GENERATORS),

  canTakeDamage: (boss, enemies) => {
    if (!boss.boss) return true
    return !boss.boss.linkedIds.some((id) => enemies.some((e) => e.id === id && e.hp > 0))
  },

  onUpdate: (boss, dt) => {
    if (!boss.boss) {
      return {
        updatedRuntime: { phase: 1, droneSpawnTimer: 0, linkedIds: [], hasSpawned: true },
        spawns: [],
      }
    }
    const runtime = boss.boss
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
