import { SUN, SUPERNOVA } from '../ability-data'
import { damageEnemiesInRadius } from '../../math/aoe'
import { uid } from '../../entities/entity-creator'
import { AbilityKind, EffectKind } from '../../types'
import type { SupernovaEffect, Vec2 } from '../../types'
import type { Camera } from '../../../renderer/camera'
import { worldToScreen } from '../../../renderer/camera'
import {
  makeAbilityUpgrade,
  applyTierSum,
  composeUltimateUpgrades,
  type AbilityDefinition,
  AbilityActivation,
} from '../ability-definition'
import { sun } from './sun'
import type {
  EffectDefinition,
  EffectTickContext,
  EffectTickResult,
} from '../../systems/effect-definition'
import { passThroughTick } from '../../systems/effect-definition'
import { IconName } from '../../../icon-names'

export const SUPERNOVA_UPGRADE_IDS = {
  supernovaBurst: 'supernovaBurst',
} as const

const upgrade = makeAbilityUpgrade(AbilityKind.supernova)

const criticalMassUpgrade = upgrade({
  id: SUPERNOVA_UPGRADE_IDS.supernovaBurst,
  label: 'Critical Mass',
  description: 'Widen the supernova explosion',
  tiers: [
    { cost: 90, value: 0.5 },
    { cost: 240, value: 0.5 },
    { cost: 520, value: 0.75 },
  ],
})

export function createSupernovaEffect(
  pos: Vec2,
  baseRadius: number,
  baseDamagePerSec: number,
  duration: number,
  burstScale: number
): SupernovaEffect {
  // Collapse + burst are fixed; the hold (full size) absorbs the rest of the
  // duration. Clamp for short durations so the phases never exceed it.
  const burstDuration = Math.min(SUPERNOVA.burstDuration, duration)
  const collapseDuration = Math.min(
    SUPERNOVA.collapseDuration,
    Math.max(0, duration - burstDuration)
  )
  return {
    id: uid(),
    kind: EffectKind.supernova,
    pos: { ...pos },
    elapsed: 0,
    duration,
    baseRadius,
    baseDamagePerSec,
    collapseDuration,
    burstDuration,
    burstRadius: baseRadius * burstScale,
    burstDamagePerSec: baseDamagePerSec * SUPERNOVA.burstDamageMultiplier,
  }
}

// Current size + damage of a supernova at `elapsed`. Shared by the damage tick
// and the renderer so the burning circle and the visual always match. Three
// phases: HOLD (full radius, base damage, warm) until the final collapse+burst
// window; COLLAPSE (shrink baseRadius → collapseMinScale linearly, base damage,
// `blueT` ramps 0→1 warm→blue); BURST (rapidly expand to burstRadius for 6×).
export function getSupernovaState(s: SupernovaEffect): {
  radius: number
  damagePerSec: number
  blueT: number
  phase: 'hold' | 'collapse' | 'burst'
} {
  const collapseEnd = s.duration - s.burstDuration
  const holdEnd = Math.max(0, collapseEnd - s.collapseDuration)
  if (s.elapsed < holdEnd) {
    return { radius: s.baseRadius, damagePerSec: s.baseDamagePerSec, blueT: 0, phase: 'hold' }
  }
  if (s.elapsed < collapseEnd) {
    const t = s.collapseDuration > 0 ? (s.elapsed - holdEnd) / s.collapseDuration : 1
    const radius = s.baseRadius * (1 - (1 - SUPERNOVA.collapseMinScale) * t)
    return { radius, damagePerSec: s.baseDamagePerSec, blueT: t, phase: 'collapse' }
  }
  const bt = s.burstDuration > 0 ? Math.min(1, (s.elapsed - collapseEnd) / s.burstDuration) : 1
  const start = s.baseRadius * SUPERNOVA.collapseMinScale
  const radius = start + (s.burstRadius - start) * bt
  return { radius, damagePerSec: s.burstDamagePerSec, blueT: 1, phase: 'burst' }
}

function tickSupernova(s: SupernovaEffect, ctx: EffectTickContext): EffectTickResult {
  if (s.elapsed >= s.duration) {
    return passThroughTick(null, ctx)
  }

  const { radius, damagePerSec } = getSupernovaState(s)
  const { enemies, scoreGained, killedEnemies } = damageEnemiesInRadius(
    ctx.enemies,
    s.pos,
    radius,
    damagePerSec,
    ctx.dt
  )

  return {
    effect: s,
    enemies,
    projectiles: ctx.projectiles,
    particles: [],
    scoreGained,
    killedEnemies,
  }
}

type RGB = [number, number, number]
const WARM_CORE: RGB = [255, 250, 230]
const WARM_MID: RGB = [255, 180, 90]
const WARM_EDGE: RGB = [255, 100, 40]
const COOL_CORE: RGB = [235, 245, 255]
const COOL_MID: RGB = [120, 180, 255]
const COOL_EDGE: RGB = [50, 90, 255]

function mix(a: RGB, b: RGB, t: number): RGB {
  return [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, a[2] + (b[2] - a[2]) * t]
}

function rgba(c: RGB, alpha: number): string {
  return `rgba(${Math.round(c[0])}, ${Math.round(c[1])}, ${Math.round(c[2])}, ${alpha})`
}

function renderSupernova(ctx: CanvasRenderingContext2D, s: SupernovaEffect, camera: Camera): void {
  const screen = worldToScreen(s.pos, camera)
  const { radius, blueT, phase } = getSupernovaState(s)

  const fadeIn = Math.min(0.4, s.duration * 0.1)
  let alpha = s.elapsed < fadeIn ? s.elapsed / fadeIn : 1
  const fadeOut = 0.25
  if (s.elapsed > s.duration - fadeOut) alpha = Math.max(0, (s.duration - s.elapsed) / fadeOut)

  const coreC = mix(WARM_CORE, COOL_CORE, blueT)
  const midC = mix(WARM_MID, COOL_MID, blueT)
  const edgeC = mix(WARM_EDGE, COOL_EDGE, blueT)
  // During the burst, flash toward white and brighten the corona.
  const collapseEnd = s.duration - s.burstDuration
  const flash = phase === 'burst' ? Math.min(1, (s.elapsed - collapseEnd) / s.burstDuration) : 0
  const coreFlash = mix(coreC, [255, 255, 255], flash * 0.7)

  // Wobble while holding (gentle, sun-like) or bursting (fast); the collapse
  // stays wobble-free so the shrink reads as one consistent motion.
  const pulse =
    phase === 'collapse'
      ? 1
      : phase === 'burst'
        ? 1 + Math.sin(s.elapsed * 30) * 0.08
        : 1 + Math.sin(s.elapsed * 4) * 0.04
  const r = radius * pulse

  ctx.save()
  ctx.globalAlpha = alpha
  ctx.translate(screen.x, screen.y)

  // Corona — outer glow
  const corona = ctx.createRadialGradient(0, 0, 0, 0, 0, r * 1.5)
  corona.addColorStop(0, rgba(midC, 0.35 + flash * 0.3))
  corona.addColorStop(0.5, rgba(edgeC, 0.18))
  corona.addColorStop(1, rgba(edgeC, 0))
  ctx.fillStyle = corona
  ctx.beginPath()
  ctx.arc(0, 0, r * 1.5, 0, Math.PI * 2)
  ctx.fill()

  // Core — bright center
  const core = ctx.createRadialGradient(0, 0, 0, 0, 0, r)
  core.addColorStop(0, rgba(coreFlash, 1))
  core.addColorStop(0.4, rgba(midC, 0.9))
  core.addColorStop(0.8, rgba(edgeC, 0.5))
  core.addColorStop(1, rgba(edgeC, 0))
  ctx.fillStyle = core
  ctx.beginPath()
  ctx.arc(0, 0, r, 0, Math.PI * 2)
  ctx.fill()

  ctx.restore()
}

export const supernovaEffect: EffectDefinition = {
  tick: (effect, ctx) => tickSupernova(effect as SupernovaEffect, ctx),
  renderBack: (ctx, effect, camera) => renderSupernova(ctx, effect as SupernovaEffect, camera),
}

export const supernova: AbilityDefinition = {
  kind: AbilityKind.supernova,
  ultimateOf: AbilityKind.sun,
  meta: { icon: IconName.sun, label: 'Supernova' },
  activation: AbilityActivation.click,
  base: () => ({
    kind: AbilityKind.supernova,
    cooldown: SUN.cooldown,
    powerCost: SUN.powerCost * SUPERNOVA.costMultiplier,
    damage: SUN.damagePerSec,
    aoeRadius: SUN.radius,
    duration: SUN.duration,
    burstScale: SUPERNOVA.burstRadiusScale,
  }),
  effectFactory: (ability, pos) => [
    createSupernovaEffect(
      pos,
      ability.aoeRadius,
      ability.damage,
      ability.duration ?? SUN.duration,
      ability.burstScale ?? SUPERNOVA.burstRadiusScale
    ),
  ],
  applyUpgrades: composeUltimateUpgrades(sun, (_basePatch, upgrades) => ({
    powerCost: SUN.powerCost * SUPERNOVA.costMultiplier,
    burstScale: applyTierSum(SUPERNOVA.burstRadiusScale, upgrades, criticalMassUpgrade),
  })),
  modifierUpgrades: [criticalMassUpgrade],
}
