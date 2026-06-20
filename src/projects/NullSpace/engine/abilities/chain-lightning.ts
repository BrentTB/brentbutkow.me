import { CHAIN_LIGHTNING } from './ability-data'
import { canEnemyTakeDamage } from '../bosses/index'
import { applyDamageToEnemy } from '../entities/enemy-damage'
import { uid, spawnExplosionParticles } from '../entities/entity-creator'
import { toroidalDistance } from '../math/toroid'
import { AbilityKind, EffectKind } from '../types'
import type { ChainArcEffect, Enemy, Particle, Vec2 } from '../types'
import type { Camera } from '../../renderer/camera'
import { worldToScreen } from '../../renderer/camera'
import { makeAbilityUpgrade, applyTierSum, type AbilityDefinition } from './ability-definition'
import type {
  EffectDefinition,
  EffectTickContext,
  EffectTickResult,
} from '../systems/effect-definition'
import { passThroughTick } from '../systems/effect-definition'
import { IconName } from '../../icon-names'

export const CHAIN_LIGHTNING_UPGRADE_IDS = {
  unlockChainLightning: 'unlockChainLightning',
  chainLightningDamage: 'chainLightningDamage',
  chainLightningJumps: 'chainLightningJumps',
  chainLightningRange: 'chainLightningRange',
} as const

const upgrade = makeAbilityUpgrade(AbilityKind.chainLightning)

const unlockUpgrade = upgrade({
  id: CHAIN_LIGHTNING_UPGRADE_IDS.unlockChainLightning,
  label: 'Unlock Chain Lightning',
  description: 'Loose a bolt that leaps between nearby enemies, weakening with each jump',
  tiers: [{ cost: 45, value: 1 }],
})

const damageUpgrade = upgrade({
  id: CHAIN_LIGHTNING_UPGRADE_IDS.chainLightningDamage,
  label: 'Damage',
  description: 'Increase the bolt damage',
  tiers: [
    { cost: 15, value: 8 },
    { cost: 60, value: 12 },
    { cost: 200, value: 18 },
    { cost: 400, value: 25 },
  ],
})

const jumpsUpgrade = upgrade({
  id: CHAIN_LIGHTNING_UPGRADE_IDS.chainLightningJumps,
  label: 'Jumps',
  description: 'The bolt leaps to more enemies',
  tiers: [
    { cost: 40, value: 1 },
    { cost: 140, value: 1 },
    { cost: 320, value: 1 },
  ],
})

const rangeUpgrade = upgrade({
  id: CHAIN_LIGHTNING_UPGRADE_IDS.chainLightningRange,
  label: 'Range',
  description: 'The bolt jumps across larger gaps',
  tiers: [
    { cost: 20, value: 25 },
    { cost: 80, value: 35 },
  ],
})

// Cyan spark on each struck enemy + the bolt's bright core.
const ARC_SPARK = '#8be9ff'

// Nearest damageable enemy to `from` not already struck, within `range`.
function nearestUnhit(from: Vec2, enemies: Enemy[], hit: Set<string>, range: number): Enemy | null {
  let best: Enemy | null = null
  let bestDist = range
  for (const e of enemies) {
    if (hit.has(e.id)) continue
    const d = toroidalDistance(from, e.pos)
    if (d <= bestDist) {
      bestDist = d
      best = e
    }
  }
  return best
}

type ChainHit = { id: string; damage: number }

// Resolves the whole bolt from the origin: nearest enemy within `jumpRange` of
// the tap first (a tap with nothing close enough fizzles — it never reaches out to
// a far-away enemy), then up to `forks` nearest unhit enemies within `jumpRange`
// per hit, branching generation by generation until `maxJumps` enemies are struck
// or no target remains. Damage falls by `falloff` each generation. Pure — returns
// the hit list + the drawn segments.
export function resolveChain(
  origin: Vec2,
  enemies: Enemy[],
  arc: Pick<ChainArcEffect, 'damage' | 'jumpRange' | 'maxJumps' | 'forks' | 'falloff'>
): { hits: ChainHit[]; segments: { from: Vec2; to: Vec2 }[] } {
  const damageable = enemies.filter((e) => canEnemyTakeDamage(e, enemies))
  const hit = new Set<string>()
  const hits: ChainHit[] = []
  const segments: { from: Vec2; to: Vec2 }[] = []

  const first = nearestUnhit(origin, damageable, hit, arc.jumpRange)
  if (!first) return { hits, segments }
  hit.add(first.id)
  hits.push({ id: first.id, damage: arc.damage })
  segments.push({ from: origin, to: first.pos })

  let frontier: Enemy[] = [first]
  let generation = 1
  while (hits.length < arc.maxJumps && frontier.length > 0) {
    const next: Enemy[] = []
    const genDamage = arc.damage * Math.pow(arc.falloff, generation)
    for (const src of frontier) {
      for (let f = 0; f < arc.forks; f++) {
        if (hits.length >= arc.maxJumps) break
        const tgt = nearestUnhit(src.pos, damageable, hit, arc.jumpRange)
        if (!tgt) continue
        hit.add(tgt.id)
        hits.push({ id: tgt.id, damage: genDamage })
        segments.push({ from: src.pos, to: tgt.pos })
        next.push(tgt)
      }
    }
    if (next.length === 0) break
    frontier = next
    generation++
  }
  return { hits, segments }
}

export function createChainArcEffect(
  pos: Vec2,
  damage: number,
  jumpRange: number,
  maxJumps: number,
  forks: number,
  falloff: number,
  duration: number
): ChainArcEffect {
  return {
    id: uid(),
    kind: EffectKind.chainArc,
    pos: { ...pos },
    elapsed: 0,
    duration,
    damage,
    jumpRange,
    maxJumps,
    forks,
    falloff,
    resolved: false,
    segments: [],
  }
}

// First tick resolves + applies the whole bolt; later ticks just age while the
// segments fade. Kills flow out through killedEnemies like any other effect.
function tickChainArc(arc: ChainArcEffect, ctx: EffectTickContext): EffectTickResult {
  if (arc.resolved) {
    return passThroughTick(arc.elapsed >= arc.duration ? null : arc, ctx)
  }

  const { hits, segments } = resolveChain(arc.pos, ctx.enemies, arc)
  const damageById = new Map(hits.map((h) => [h.id, h.damage]))

  const survivors: Enemy[] = []
  const killedEnemies: Enemy[] = []
  // Always crackle at the tapped spot: a tap that finds nothing in range still
  // shows it fired, and when the bolt links this reads as its origin flash.
  const particles: Particle[] = spawnExplosionParticles(arc.pos, 10, ARC_SPARK)
  let scoreGained = 0
  for (const enemy of ctx.enemies) {
    const dmg = damageById.get(enemy.id)
    if (dmg === undefined) {
      survivors.push(enemy)
      continue
    }
    const damaged = applyDamageToEnemy(enemy, dmg)
    particles.push(...spawnExplosionParticles(enemy.pos, 4, ARC_SPARK))
    if (damaged.hp <= 0) {
      scoreGained += enemy.scoreValue
      killedEnemies.push(enemy)
    } else {
      survivors.push(damaged)
    }
  }

  return {
    effect: { ...arc, resolved: true, segments },
    enemies: survivors,
    projectiles: ctx.projectiles,
    particles,
    scoreGained,
    killedEnemies,
  }
}

function renderChainArc(ctx: CanvasRenderingContext2D, arc: ChainArcEffect, camera: Camera): void {
  const fade = Math.max(0, 1 - arc.elapsed / arc.duration)
  if (fade <= 0 || arc.segments.length === 0) return
  ctx.save()
  ctx.globalAlpha = fade
  ctx.lineCap = 'round'
  ctx.lineJoin = 'round'
  for (const seg of arc.segments) {
    const a = worldToScreen(seg.from, camera)
    const b = worldToScreen(seg.to, camera)
    // Soft glow underlay, then a bright thin core — reads as a hot bolt.
    ctx.strokeStyle = 'rgba(110, 200, 255, 0.5)'
    ctx.lineWidth = 6
    ctx.beginPath()
    ctx.moveTo(a.x, a.y)
    ctx.lineTo(b.x, b.y)
    ctx.stroke()
    ctx.strokeStyle = '#e8fbff'
    ctx.lineWidth = 2
    ctx.beginPath()
    ctx.moveTo(a.x, a.y)
    ctx.lineTo(b.x, b.y)
    ctx.stroke()
  }
  ctx.restore()
}

export const chainArcEffect: EffectDefinition = {
  tick: (effect, ctx) => tickChainArc(effect as ChainArcEffect, ctx),
  renderFront: (ctx, effect, camera) => renderChainArc(ctx, effect as ChainArcEffect, camera),
}

export const chainLightning: AbilityDefinition = {
  kind: AbilityKind.chainLightning,
  meta: { icon: IconName.chainLightning, label: 'Chain Lightning' },
  activation: 'click',
  base: () => ({
    kind: AbilityKind.chainLightning,
    cooldown: CHAIN_LIGHTNING.cooldown,
    powerCost: CHAIN_LIGHTNING.powerCost,
    damage: CHAIN_LIGHTNING.damage,
    aoeRadius: CHAIN_LIGHTNING.jumpRange,
    count: CHAIN_LIGHTNING.maxJumps,
  }),
  effectFactory: (ability, pos) => [
    createChainArcEffect(
      pos,
      ability.damage,
      ability.aoeRadius,
      ability.count ?? CHAIN_LIGHTNING.maxJumps,
      CHAIN_LIGHTNING.forks,
      CHAIN_LIGHTNING.falloff,
      CHAIN_LIGHTNING.arcDuration
    ),
  ],
  applyUpgrades: (_ability, upgrades) => ({
    unlocked: upgrades[CHAIN_LIGHTNING_UPGRADE_IDS.unlockChainLightning].currentTier > 0,
    damage: applyTierSum(CHAIN_LIGHTNING.damage, upgrades, damageUpgrade),
    aoeRadius: applyTierSum(CHAIN_LIGHTNING.jumpRange, upgrades, rangeUpgrade),
    count: applyTierSum(CHAIN_LIGHTNING.maxJumps, upgrades, jumpsUpgrade),
  }),
  unlockUpgrade,
  modifierUpgrades: [damageUpgrade, jumpsUpgrade, rangeUpgrade],
  ultimate: {
    kind: AbilityKind.ionStorm,
    label: 'Ion Storm',
    description: 'One strike, and the whole sky forks.',
    cost: { stardust: 300, spaceMetal: 12 },
  },
}
