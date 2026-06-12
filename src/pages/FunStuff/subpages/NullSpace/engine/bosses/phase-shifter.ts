import { EnemyKind, MovementBehavior } from '../types'
import type { Enemy, Vec2 } from '../types'
import { rng } from '../math/random'
import { clampToWorld } from '../math/utils'
import { ringPositions } from '../math/vec'
import type { Camera } from '../../renderer/camera'
import { isWithinView, worldToScreen } from '../../renderer/camera'
import { bossPhase, getBossRuntime } from './boss-definition'
import type {
  BossDefinition,
  BossRuntimeBase,
  BossUpdateResult,
  DropSpec,
  SpawnSpec,
} from './boss-definition'
import { metalBurst } from './loot'

export const ShifterStage = { idle: 'idle', telegraph: 'telegraph' } as const
export type ShifterStage = (typeof ShifterStage)[keyof typeof ShifterStage]

// Phase Shifter runtime: the teleport cycle. targetPos is set only while
// telegraphing.
export type PhaseShifterRuntime = BossRuntimeBase & {
  kind: typeof EnemyKind.phaseShifter
  stage: ShifterStage
  stageTimer: number
  targetPos: Vec2 | null
}

// The per-tick slice of the runtime the teleport cycle rewrites.
type ShifterCycle = Pick<PhaseShifterRuntime, 'stage' | 'stageTimer' | 'targetPos'>

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
  return clampToWorld(
    { x: shipPos.x + Math.cos(angle) * dist, y: shipPos.y + Math.sin(angle) * dist },
    worldSize,
    PHASE_SHIFTER.worldMargin
  )
}

// Evenly-spaced swarm ring around the arrival point.
function ringSpecs(center: Vec2, count: number): SpawnSpec[] {
  return ringPositions(center, PHASE_SHIFTER.ringRadius, count).map((pos) => ({
    kind: EnemyKind.swarm,
    pos,
  }))
}

// True while the boss is mid-shift — it renders as a ghost (no shield bubble)
// and the telegraph X marks its destination.
function isMidShift(boss: Enemy): boolean {
  return getBossRuntime(boss, EnemyKind.phaseShifter)?.stage === ShifterStage.telegraph
}

// Big red X + dashed swarm-ring circle at the teleport destination, sharpening
// as the jump nears (same ramp as the meteor warning).
function renderTelegraph(ctx: CanvasRenderingContext2D, boss: Enemy, camera: Camera): void {
  const shifter = getBossRuntime(boss, EnemyKind.phaseShifter)
  if (shifter?.stage !== ShifterStage.telegraph || !shifter.targetPos) return
  const screen = worldToScreen(shifter.targetPos, camera)
  if (!isWithinView(screen, camera, PHASE_SHIFTER.ringRadius + 20)) return
  const progress = 1 - shifter.stageTimer / PHASE_SHIFTER.telegraphDuration

  ctx.save()
  ctx.globalAlpha = 0.3 + progress * 0.5
  ctx.strokeStyle = '#ff5050'

  const arm = 40
  ctx.lineWidth = 3
  ctx.beginPath()
  ctx.moveTo(screen.x - arm, screen.y - arm)
  ctx.lineTo(screen.x + arm, screen.y + arm)
  ctx.moveTo(screen.x - arm, screen.y + arm)
  ctx.lineTo(screen.x + arm, screen.y - arm)
  ctx.stroke()

  // Where the swarm ring will materialise.
  ctx.lineWidth = 1.5
  ctx.setLineDash([6, 6])
  ctx.beginPath()
  ctx.arc(screen.x, screen.y, PHASE_SHIFTER.ringRadius, 0, Math.PI * 2)
  ctx.stroke()

  ctx.restore()
}

export const PHASE_SHIFTER_BOSS: BossDefinition = {
  kind: EnemyKind.phaseShifter,
  hpBarLabel: 'PHASE SHIFTER',
  // Parked between teleports; the teleport cycle moves it.
  movement: MovementBehavior.stationary,

  // Mid-shift the boss is phasing out of reality — a faint ghost, no bubble.
  spriteAlpha: (boss) => (isMidShift(boss) ? 0.35 : 1),
  hideShieldBubble: isMidShift,
  renderBack: renderTelegraph,

  initialState: (): PhaseShifterRuntime => ({
    kind: EnemyKind.phaseShifter,
    phase: 1,
    linkedIds: [],
    hasSpawned: false,
    stage: ShifterStage.idle,
    stageTimer: PHASE_SHIFTER.idleDurationP1,
    targetPos: null,
  }),

  // Untouchable for the whole shift — telegraph start through arrival.
  canTakeDamage: (boss) => !isMidShift(boss),

  onUpdate: (boss, dt, ctx): BossUpdateResult => {
    // boss-ai only invokes onUpdate on this boss's own enemies.
    const shifter = getBossRuntime(boss, EnemyKind.phaseShifter)!
    const phase = bossPhase(boss)
    const idleDuration = phase === 2 ? PHASE_SHIFTER.idleDurationP2 : PHASE_SHIFTER.idleDurationP1
    const stageTimer = shifter.stageTimer - dt

    let next: ShifterCycle = { stage: shifter.stage, stageTimer, targetPos: shifter.targetPos }
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

    return { updatedRuntime: { ...shifter, phase, ...next }, spawns, self }
  },

  onDeath: (boss): DropSpec[] => metalBurst(boss.pos, 1, 4),
}
