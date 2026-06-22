import { EnemyKind, MovementBehavior } from '../types'
import type { Enemy, Vec2 } from '../types'
import { rng } from '../math/random'
import { wrapPosition } from '../math/toroid'
import { ringPositions } from '../math/vec'
import type { Camera } from '../../renderer/camera'
import { isWithinView, worldToScreen } from '../../renderer/camera'
import { bossPhase, bossTier, getBossRuntime, growByTier } from './boss-definition'
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
  // Deeper runs drop bigger rings: +ringCountPerTier per boss tier past the first,
  // capped per phase.
  ringCountPerTier: 2,
  maxRingCountP1: 16,
  maxRingCountP2: 20,
  // Deeper runs also harden the ring: a tier-growing fraction of slots spawn drones
  // (tougher, still fast) instead of swarm, capped. Only fast kinds ever spawn —
  // ring units explode on the next teleport, so a slow unit would be unfair.
  droneFractionPerTier: 0.15,
  maxDroneFraction: 0.5,
  ringRadius: 80,
  // Swarm rings self-destruct exactly as the next ring spawns (their lifetime is the
  // full teleport cycle), so they can't pile up; the pop's small blast punishes
  // camping on the dispersing swarm.
  swarmBlastRadius: 60,
  swarmBlastDamage: 8,
} as const

function rollTeleportTarget(shipPos: Vec2): Vec2 {
  const angle = rng.range(0, Math.PI * 2)
  const dist = rng.range(PHASE_SHIFTER.arrivalMin, PHASE_SHIFTER.arrivalMax)
  return wrapPosition({
    x: shipPos.x + Math.cos(angle) * dist,
    y: shipPos.y + Math.sin(angle) * dist,
  })
}

// Ring size for the boss's phase, grown by depth and capped.
function ringCount(tier: number, phase: number): number {
  const base = phase === 2 ? PHASE_SHIFTER.ringCountP2 : PHASE_SHIFTER.ringCountP1
  const max = phase === 2 ? PHASE_SHIFTER.maxRingCountP2 : PHASE_SHIFTER.maxRingCountP1
  return growByTier(base, PHASE_SHIFTER.ringCountPerTier, tier, max)
}

// Evenly-spaced ring around the arrival point. `lifetime` is the full teleport
// cycle (this idle + the telegraph), so the ring pops the instant the next one
// spawns. Deeper tiers replace an evenly-spread fraction of slots with drones —
// tougher than swarm but, like swarm, fast enough that the pop stays fair.
function ringSpecs(center: Vec2, count: number, lifetime: number, tier: number): SpawnSpec[] {
  const fraction = growByTier(
    0,
    PHASE_SHIFTER.droneFractionPerTier,
    tier,
    PHASE_SHIFTER.maxDroneFraction
  )
  const drones = Math.floor(count * fraction)
  return ringPositions(center, PHASE_SHIFTER.ringRadius, count).map((pos, i) => ({
    // Spread the drone quota evenly: a slot is a drone when the running quota ticks
    // over at it (Math.floor(i*drones/count) increments).
    kind:
      Math.floor((i * drones) / count) !== Math.floor(((i + 1) * drones) / count)
        ? EnemyKind.drone
        : EnemyKind.swarm,
    pos,
    expiresIn: lifetime,
    expireBlast: { radius: PHASE_SHIFTER.swarmBlastRadius, damage: PHASE_SHIFTER.swarmBlastDamage },
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
  warning:
    'The contact keeps slipping off the scope between sweeps: there, then gone, then nearer than before. We have stopped calling it a fault.',
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
    spawnWave: 0,
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
        targetPos: rollTeleportTarget(ctx.shipPos),
      }
    } else if (shifter.stage === ShifterStage.telegraph && stageTimer <= 0) {
      // Arrive: jump to the marked spot and materialise the swarm ring.
      const target = shifter.targetPos ?? boss.pos
      self = { pos: { ...target }, vel: { x: 0, y: 0 } }
      // Lifetime = this idle + the telegraph that follows, so the ring burns out the
      // instant the next teleport lands its replacement.
      const lifetime = idleDuration + PHASE_SHIFTER.telegraphDuration
      const tier = bossTier(shifter.spawnWave)
      spawns = ringSpecs(target, ringCount(tier, phase), lifetime, tier)
      next = { stage: ShifterStage.idle, stageTimer: idleDuration, targetPos: null }
    }

    return { updatedRuntime: { ...shifter, phase, ...next }, spawns, self }
  },

  onDeath: (boss): DropSpec[] => metalBurst(boss.pos, 1, 4),
}
