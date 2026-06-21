import { EnemyKind, MovementBehavior } from '../types'
import type { Enemy, Vec2 } from '../types'
import type { Camera } from '../../renderer/camera'
import { worldToScreen } from '../../renderer/camera'
import { rng } from '../math/random'
import { ringPositions, unitToward } from '../math/vec'
import { toroidalDelta } from '../math/toroid'
import { bossPhase, getBossRuntime, hasAliveLinked } from './boss-definition'
import type {
  BossDefinition,
  BossProjectileSpec,
  BossRuntimeBase,
  BossUpdateResult,
  DropSpec,
  SpawnSpec,
} from './boss-definition'
import { metalBurst } from './loot'

export const LaserStage = { idle: 'idle', charging: 'charging' } as const
export type LaserStage = (typeof LaserStage)[keyof typeof LaserStage]

// Dreadnought runtime: drone-spawn cadence + the charged-laser cycle (live only once
// the shield is down) on top of the shared fields.
export type DreadnoughtRuntime = BossRuntimeBase & {
  kind: typeof EnemyKind.dreadnought
  droneSpawnTimer: number
  laserStage: LaserStage
  laserTimer: number
  // Where the charging laser is aimed (the ship); null when idle. Drives the telegraph.
  laserAim: Vec2 | null
}

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

// Charged heavy laser — the boss's teeth, fired only while the shield is down (every
// generator dead). A brightening beam line telegraphs it for chargeDuration, then a
// fast, hard-hitting bolt fires where the ship was: you slingshot off the line, not
// tank it. Phase 2 fires it on a tighter cooldown.
export const DREADNOUGHT_LASER = {
  chargeDuration: 1.2,
  cooldownP1: 2.8,
  cooldownP2: 1.6,
  damage: 35,
  // Faster than a slingshot fling — you dodge by breaking its line, not racing it.
  speed: 900,
  // Capped homing (rad/s): the bolt curves toward the ship as it flies, so natural
  // drift can't shake it — but a slingshot out-turns it. 0 would be a straight shot.
  homingTurnRate: 2,
  // Self-destructs after this long, so a missed bolt fizzles instead of looping back
  // around behind the ship in a big homing circle.
  lifetime: 2,
  // Telegraph beam length (world units) — how far the warning line is drawn.
  range: 900,
} as const

// Evenly-spaced shield generator spawn specs around the boss.
function ringSpecs(boss: Enemy, count: number): SpawnSpec[] {
  return ringPositions(boss.pos, SHIELD_RING_DIST, count, Math.PI / 2).map((pos) => ({
    kind: EnemyKind.shieldGenerator,
    pos,
  }))
}

// Pins each generator to the ring radius (fixed standoff) while repelling its
// siblings so the ring stays evenly spread instead of collapsing onto one
// point as the boss moves.
function positionGeneratorRing(boss: Enemy, gens: Enemy[]): Map<string, { pos: Vec2; vel: Vec2 }> {
  const positions = new Map<string, { pos: Vec2; vel: Vec2 }>()
  for (const g of gens) {
    // Radial pin direction — the generator's current angle around the boss.
    const { x: nx, y: ny } = unitToward(boss.pos, g.pos)

    // Tangential spread — sum repulsion from the other generators.
    let rx = 0
    let ry = 0
    for (const o of gens) {
      if (o.id === g.id) continue
      const { x: ex, y: ey } = toroidalDelta(o.pos, g.pos)
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

// Telegraph for the charged laser: a beam line from the boss along its aim that
// brightens and thickens as the charge completes, so the player knows where — and
// when — to slingshot clear. Drawn only while charging.
function renderLaserCharge(ctx: CanvasRenderingContext2D, boss: Enemy, camera: Camera): void {
  const runtime = getBossRuntime(boss, EnemyKind.dreadnought)
  if (runtime?.laserStage !== LaserStage.charging || !runtime.laserAim) return
  const progress = 1 - Math.max(0, runtime.laserTimer) / DREADNOUGHT_LASER.chargeDuration
  const dir = unitToward(boss.pos, runtime.laserAim)
  const a = worldToScreen(boss.pos, camera)
  const b = worldToScreen(
    {
      x: boss.pos.x + dir.x * DREADNOUGHT_LASER.range,
      y: boss.pos.y + dir.y * DREADNOUGHT_LASER.range,
    },
    camera
  )
  ctx.save()
  ctx.globalAlpha = 0.25 + progress * 0.55
  ctx.strokeStyle = '#ff5a3c'
  ctx.lineWidth = 1 + progress * 5
  ctx.lineCap = 'round'
  ctx.beginPath()
  ctx.moveTo(a.x, a.y)
  ctx.lineTo(b.x, b.y)
  ctx.stroke()
  ctx.restore()
}

export const DREADNOUGHT_BOSS: BossDefinition = {
  kind: EnemyKind.dreadnought,
  hpBarLabel: 'DREADNOUGHT',
  warning:
    'One contact on the long-range scope, and it has not stopped growing. It has held the same heading since we first saw it: straight for us, and not slowing.',
  // Pursues the ship, then holds at attackRange and lets the generators fight.
  movement: MovementBehavior.approach,

  initialState: (): DreadnoughtRuntime => ({
    kind: EnemyKind.dreadnought,
    phase: 1,
    droneSpawnTimer: DRONE_INTERVAL_P1,
    linkedIds: [],
    hasSpawned: false,
    laserStage: LaserStage.idle,
    laserTimer: DREADNOUGHT_LASER.cooldownP1,
    laserAim: null,
  }),

  onSpawn: (boss) => ringSpecs(boss, PHASE1_GENERATORS),

  canTakeDamage: (boss, enemies) => !hasAliveLinked(boss, enemies),

  positionLinked: positionGeneratorRing,
  renderBack: renderLaserCharge,

  onUpdate: (boss, dt, ctx): BossUpdateResult => {
    // boss-ai only invokes onUpdate on this boss's own enemies.
    const runtime = getBossRuntime(boss, EnemyKind.dreadnought)!
    const newPhase = bossPhase(boss)
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

    // Charged laser — only with the shield down (every generator dead). It charges
    // (telegraph), then fires a fast bolt where the ship is. Re-shielding at the
    // phase-2 transition cancels any charge. Phase 2 fires it on a tighter cooldown.
    const laserCooldown =
      newPhase === 2 ? DREADNOUGHT_LASER.cooldownP2 : DREADNOUGHT_LASER.cooldownP1
    let laserStage = runtime.laserStage
    let laserTimer = runtime.laserTimer - dt
    let laserAim = runtime.laserAim
    const projectiles: BossProjectileSpec[] = []
    if (hasAliveLinked(boss, ctx.enemies)) {
      // Shielded: hold fire and reset, so it must charge fresh once exposed again.
      laserStage = LaserStage.idle
      laserTimer = laserCooldown
      laserAim = null
    } else if (laserStage === LaserStage.charging) {
      laserAim = { ...ctx.shipPos } // track the ship so the telegraph shows the live line
      if (laserTimer <= 0) {
        projectiles.push({
          from: { ...boss.pos },
          toward: laserAim,
          damage: DREADNOUGHT_LASER.damage,
          speed: DREADNOUGHT_LASER.speed,
          beam: true,
          homingTurnRate: DREADNOUGHT_LASER.homingTurnRate,
          lifetime: DREADNOUGHT_LASER.lifetime,
        })
        laserStage = LaserStage.idle
        laserTimer = laserCooldown
        laserAim = null
      }
    } else if (laserTimer <= 0) {
      laserStage = LaserStage.charging
      laserTimer = DREADNOUGHT_LASER.chargeDuration
      laserAim = { ...ctx.shipPos }
    }

    // Phase 1 → 2 transition: re-arm the shield with a larger generator ring.
    // Reaching ≤50% HP requires the phase-1 shield fully down (every generator
    // dead — canTakeDamage gates all damage otherwise), so replacing linkedIds
    // here can never orphan a still-living generator.
    const linkedSpawns =
      runtime.phase === 1 && newPhase === 2 ? ringSpecs(boss, PHASE2_GENERATORS) : undefined

    return {
      updatedRuntime: {
        ...runtime,
        phase: newPhase,
        droneSpawnTimer,
        laserStage,
        laserTimer,
        laserAim,
      },
      spawns,
      linkedSpawns,
      projectiles,
    }
  },

  onDeath: (boss): DropSpec[] => metalBurst(boss.pos, 1, 4),
}
