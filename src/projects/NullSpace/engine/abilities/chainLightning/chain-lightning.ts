import { CHAIN_LIGHTNING } from '../ability-data'
import { canEnemyTakeDamage } from '../../bosses'
import { applyDamageToEnemy } from '../../entities/enemy-damage'
import { uid, spawnExplosionParticles } from '../../entities/entity-creator'
import { toroidalDistance } from '../../math/toroid'
import { AbilityKind, EffectKind } from '../../types'
import type { ChainArcEffect, Enemy, Particle, Vec2 } from '../../types'
import type { Camera } from '../../../renderer/camera'
import { worldToScreen } from '../../../renderer/camera'
import { makeAbilityUpgrade, applyTierSum, type AbilityDefinition } from '../ability-definition'
import type {
  EffectDefinition,
  EffectTickContext,
  EffectTickResult,
} from '../../systems/effect-definition'
import { passThroughTick } from '../../systems/effect-definition'
import { IconName } from '../../../icon-names'

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

// Nearest enemy to `from` within `range` satisfying `ok`, or null.
function nearestWhere(
  from: Vec2,
  enemies: Enemy[],
  range: number,
  ok: (e: Enemy) => boolean
): Enemy | null {
  let best: Enemy | null = null
  let bestDist = range
  for (const e of enemies) {
    if (!ok(e)) continue
    const d = toroidalDistance(from, e.pos)
    if (d <= bestDist) {
      bestDist = d
      best = e
    }
  }
  return best
}

// The next enemy a tendril jumps to: prefer the nearest enemy NO fork has struck yet
// (so tendrils spread to cover everyone first), and only when none are in range fall
// back to the nearest this fork hasn't hit — re-hitting others' targets rather than
// stopping. `struck` = hit by any fork; `forkHit` = hit by this one.
function nextTarget(
  from: Vec2,
  enemies: Enemy[],
  struck: Set<string>,
  forkHit: Set<string>,
  range: number
): Enemy | null {
  return (
    nearestWhere(from, enemies, range, (e) => !struck.has(e.id) && !forkHit.has(e.id)) ??
    nearestWhere(from, enemies, range, (e) => !forkHit.has(e.id))
  )
}

// The `n` nearest distinct enemies to `from` within `range`, closest first — one
// seed per fork. Fewer enemies than forks ⇒ fewer seeds (extra forks stay idle), so
// a lone target only ever feeds a single chain.
function nearestSeeds(from: Vec2, enemies: Enemy[], n: number, range: number): Enemy[] {
  return enemies
    .map((e) => ({ e, d: toroidalDistance(from, e.pos) }))
    .filter((x) => x.d <= range)
    .sort((a, b) => a.d - b.d)
    .slice(0, n)
    .map((x) => x.e)
}

type ChainHit = { id: string; damage: number }

// Resolves the whole bolt. Each fork is a chain seeded on a distinct nearest enemy
// (within `jumpRange` of the tap, so a tap with nothing close fizzles), then hopping
// `depth` times, damage falling by `falloff` per hop. Every hop prefers an enemy no
// fork has hit yet (tendrils spread to cover the whole group first) and only re-hits
// once nothing fresh is in range — so a big spread fans out, a small cluster doubles
// up into a storm, and a lone target (one seed) stays a single hit. Pure.
export function resolveChain(
  origin: Vec2,
  enemies: Enemy[],
  arc: Pick<ChainArcEffect, 'damage' | 'jumpRange' | 'depth' | 'forks' | 'falloff'>
): { hits: ChainHit[]; segments: { from: Vec2; to: Vec2 }[] } {
  const damageable = enemies.filter((e) => canEnemyTakeDamage(e, enemies))
  const hits: ChainHit[] = []
  const segments: { from: Vec2; to: Vec2 }[] = []
  const struck = new Set<string>() // hit by ANY fork — drives the coverage preference

  for (const seed of nearestSeeds(origin, damageable, arc.forks, arc.jumpRange)) {
    const forkHit = new Set<string>([seed.id])
    struck.add(seed.id)
    hits.push({ id: seed.id, damage: arc.damage })
    segments.push({ from: origin, to: seed.pos })
    let current = seed
    for (let hop = 1; hop <= arc.depth; hop++) {
      const tgt = nextTarget(current.pos, damageable, struck, forkHit, arc.jumpRange)
      if (!tgt) break
      forkHit.add(tgt.id)
      struck.add(tgt.id)
      hits.push({ id: tgt.id, damage: arc.damage * Math.pow(arc.falloff, hop) })
      segments.push({ from: current.pos, to: tgt.pos })
      current = tgt
    }
  }
  return { hits, segments }
}

export function createChainArcEffect(
  pos: Vec2,
  damage: number,
  jumpRange: number,
  depth: number,
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
    depth,
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
  // Forks can land several zaps on one enemy — sum them so it takes the combined
  // damage and is still counted once for kills/score.
  const damageById = new Map<string, number>()
  for (const h of hits) damageById.set(h.id, (damageById.get(h.id) ?? 0) + h.damage)

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
  // Hold full brightness for the first 40% of its life, then fade — so the bolt's
  // path lingers long enough to read where it bounced before it disappears.
  const t = arc.duration > 0 ? arc.elapsed / arc.duration : 1
  const fade = t < 0.4 ? 1 : Math.max(0, 1 - (t - 0.4) / 0.6)
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
    count: CHAIN_LIGHTNING.depth,
    forks: CHAIN_LIGHTNING.forks,
  }),
  effectFactory: (ability, pos) => [
    createChainArcEffect(
      pos,
      ability.damage,
      ability.aoeRadius,
      ability.count ?? CHAIN_LIGHTNING.depth,
      ability.forks ?? CHAIN_LIGHTNING.forks,
      CHAIN_LIGHTNING.falloff,
      CHAIN_LIGHTNING.arcDuration
    ),
  ],
  applyUpgrades: (_ability, upgrades) => ({
    unlocked: upgrades[CHAIN_LIGHTNING_UPGRADE_IDS.unlockChainLightning].currentTier > 0,
    damage: applyTierSum(CHAIN_LIGHTNING.damage, upgrades, damageUpgrade),
    aoeRadius: applyTierSum(CHAIN_LIGHTNING.jumpRange, upgrades, rangeUpgrade),
    count: applyTierSum(CHAIN_LIGHTNING.depth, upgrades, jumpsUpgrade),
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
