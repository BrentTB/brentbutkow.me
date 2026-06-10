import { EnemyKind, ShifterStage } from '../types'
import type { ShifterRuntime, Vec2 } from '../types'
import { rng } from '../math/random'
import { clamp } from '../math/utils'
import type { BossDefinition, BossUpdateResult, DropSpec, SpawnSpec } from './boss-definition'
import { metalBurst } from './loot'

// Exported — the renderer scales the telegraph X's alpha by telegraphDuration.
export const PHASE_SHIFTER = {
  telegraphDuration: 2.5,
  // Phase 2 (HP ≤ 50%) teleports on a tighter cycle with a bigger ring.
  idleDurationP1: 4.5,
  idleDurationP2: 2.5,
  // Landing offset from the ship — close enough to threaten, never dead-center.
  arrivalMin: 40,
  arrivalMax: 120,
  ringCountP1: 8,
  ringCountP2: 12,
  ringRadius: 80,
  // Keeps telegraph targets (and the swarm ring) inside the playfield.
  worldMargin: 60,
} as const

function rollTeleportTarget(shipPos: Vec2, worldSize: Vec2): Vec2 {
  const angle = rng.range(0, Math.PI * 2)
  const dist = rng.range(PHASE_SHIFTER.arrivalMin, PHASE_SHIFTER.arrivalMax)
  return {
    x: clamp(
      shipPos.x + Math.cos(angle) * dist,
      PHASE_SHIFTER.worldMargin,
      worldSize.x - PHASE_SHIFTER.worldMargin
    ),
    y: clamp(
      shipPos.y + Math.sin(angle) * dist,
      PHASE_SHIFTER.worldMargin,
      worldSize.y - PHASE_SHIFTER.worldMargin
    ),
  }
}

// Evenly-spaced swarm ring around the arrival point.
function ringSpecs(center: Vec2, count: number): SpawnSpec[] {
  const specs: SpawnSpec[] = []
  for (let i = 0; i < count; i++) {
    const angle = (i * 2 * Math.PI) / count
    specs.push({
      kind: EnemyKind.swarm,
      pos: {
        x: center.x + Math.cos(angle) * PHASE_SHIFTER.ringRadius,
        y: center.y + Math.sin(angle) * PHASE_SHIFTER.ringRadius,
      },
    })
  }
  return specs
}

export const PHASE_SHIFTER_BOSS: BossDefinition = {
  kind: EnemyKind.phaseShifter,
  hpBarLabel: 'PHASE SHIFTER',

  initialState: () => ({
    phase: 1,
    droneSpawnTimer: 0,
    linkedIds: [],
    hasSpawned: false,
    shifter: {
      stage: ShifterStage.idle,
      stageTimer: PHASE_SHIFTER.idleDurationP1,
      targetPos: null,
    },
  }),

  // Untouchable for the whole shift — telegraph start through arrival.
  canTakeDamage: (boss) => boss.boss?.shifter?.stage !== ShifterStage.telegraph,

  onUpdate: (boss, dt, ctx): BossUpdateResult => {
    // boss-ai only invokes onUpdate on confirmed boss enemies, so boss.boss is set.
    const runtime = boss.boss!
    const shifter = runtime.shifter!
    const phase = boss.hp <= boss.maxHp * 0.5 ? 2 : 1
    const idleDuration = phase === 2 ? PHASE_SHIFTER.idleDurationP2 : PHASE_SHIFTER.idleDurationP1
    const stageTimer = shifter.stageTimer - dt

    let next: ShifterRuntime = { ...shifter, stageTimer }
    let self: BossUpdateResult['self']
    let spawns: SpawnSpec[] = []

    if (shifter.stage === ShifterStage.idle && stageTimer <= 0) {
      // Pick where to reappear and start phasing out — the X goes up now.
      next = {
        stage: ShifterStage.telegraph,
        stageTimer: PHASE_SHIFTER.telegraphDuration,
        targetPos: rollTeleportTarget(ctx.shipPos, ctx.worldSize),
      }
    } else if (shifter.stage === ShifterStage.telegraph && stageTimer <= 0) {
      // Arrive: jump to the marked spot and materialise the swarm ring.
      const target = shifter.targetPos ?? boss.pos
      self = { pos: { ...target }, vel: { x: 0, y: 0 } }
      spawns = ringSpecs(
        target,
        phase === 2 ? PHASE_SHIFTER.ringCountP2 : PHASE_SHIFTER.ringCountP1
      )
      next = { stage: ShifterStage.idle, stageTimer: idleDuration, targetPos: null }
    }

    return { updatedRuntime: { ...runtime, phase, shifter: next }, spawns, self }
  },

  onDeath: (boss): DropSpec[] => metalBurst(boss.pos, 1, 4),
}
