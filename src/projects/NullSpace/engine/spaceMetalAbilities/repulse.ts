import { EffectKind } from '../types'
import type { ActiveEffect, RepulseFieldEffect, Vec2 } from '../types'
import type { SpaceMetalAbility } from './space-metal-ability-definition'
import { SpaceMetalAbilityKind } from './space-metal-ability-definition'
import { IconName } from '../../icon-names'
import { uid } from '../entities/entity-creator'
import { absorbEnemyProjectiles } from '../abilities/dome-absorption'
import { passThroughTick } from '../systems/effect-definition'
import type {
  EffectDefinition,
  EffectTickContext,
  EffectTickResult,
} from '../systems/effect-definition'
import type { Camera } from '../../renderer/camera'
import { renderDome } from '../abilities/dome-render'
import type { DomeStyle } from '../abilities/dome-render'

// Repulse: a dome that follows the ship, grows a lot, hurls every enemy outward
// and soaks up enemy fire — a panic button. The knockback reuses the Force Field
// path (applyShieldConstraints), so enemies are launched with outward velocity
// and coast away rather than being nudged a frame at a time. No damage, no
// invincibility flag; the launch + absorption are the defence (a stray special
// attack may slip through, by design). `maxRadius` is large so a wide safe ring
// is left behind.
export const REPULSE = {
  cost: 2,
  duration: 2.5,
  startRadius: 60,
  maxRadius: 350,
  growDuration: 2.5,
  knockback: 800,
  color: '#7af0ff',
} as const

export function createRepulseEffect(pos: Vec2): RepulseFieldEffect {
  return {
    id: uid(),
    kind: EffectKind.repulseField,
    pos: { ...pos },
    elapsed: 0,
    duration: REPULSE.duration,
    radius: REPULSE.startRadius,
    startRadius: REPULSE.startRadius,
    maxRadius: REPULSE.maxRadius,
    growDuration: REPULSE.growDuration,
    knockback: REPULSE.knockback,
    // Pure defensive — the launch is the whole point, no contact burn.
    bumpDamage: 0,
    // Never grandfather: every enemy the field reaches gets launched.
    grandfatheredEnemyIds: null,
  }
}

function currentRadius(field: RepulseFieldEffect): number {
  if (field.growDuration <= 0) return field.maxRadius
  const t = Math.min(1, field.elapsed / field.growDuration)
  return field.startRadius + (field.maxRadius - field.startRadius) * t
}

function tickRepulse(field: RepulseFieldEffect, ctx: EffectTickContext): EffectTickResult {
  if (field.elapsed >= field.duration) {
    return passThroughTick(null, ctx)
  }
  // Centre on the ship; recentreRepulseFields corrects this to the ship's final
  // position after movement so the field doesn't lag a frame behind.
  const center = ctx.ship.pos
  const radius = currentRadius(field)
  // Enemy knockback is applied by applyShieldConstraints (shared with the Force
  // Field), so the tick only handles growth and soaking up incoming fire.
  const { projectiles, particles } = absorbEnemyProjectiles(
    center,
    radius,
    ctx.projectiles,
    REPULSE.color
  )
  return {
    effect: { ...field, pos: { ...center }, radius },
    enemies: ctx.enemies,
    projectiles,
    particles,
    scoreGained: 0,
    killedEnemies: [],
  }
}

// Re-centres active repulse fields on the ship's current position. Called after
// ship movement each frame so the field (knockback + render) tracks the ship
// without a one-frame lag. Returns the original array untouched when none active.
export function recentreRepulseFields(effects: ActiveEffect[], shipPos: Vec2): ActiveEffect[] {
  let found = false
  const next = effects.map((e) => {
    if (e.kind !== EffectKind.repulseField) return e
    found = true
    return { ...e, pos: { ...shipPos } }
  })
  return found ? next : effects
}

// Bright cyan shockwave — distinct from the blue Shield and violet Force Field.
// Pops in at full strength (no fade-in) so the panic-button blast reads instantly.
const REPULSE_DOME_STYLE: DomeStyle = {
  fadeOut: { cap: 0.6, frac: 0.25 },
  pulseFreq: 8,
  fillStops: [
    [0, 'rgba(120, 240, 255, 0.02)'],
    [0.7, 'rgba(120, 240, 255, 0.06)'],
    [1, 'rgba(150, 240, 255, 0.22)'],
  ],
  rim: { color: '185, 250, 255', alpha: 0.8, width: 2.5 },
}

function renderRepulse(
  ctx: CanvasRenderingContext2D,
  field: RepulseFieldEffect,
  camera: Camera
): void {
  renderDome(ctx, field, camera, REPULSE_DOME_STYLE)
}

export const repulseFieldEffect: EffectDefinition = {
  tick: (effect, ctx) => tickRepulse(effect as RepulseFieldEffect, ctx),
  renderBack: (ctx, effect, camera) => renderRepulse(ctx, effect as RepulseFieldEffect, camera),
}

export const repulse: SpaceMetalAbility = {
  kind: SpaceMetalAbilityKind.repulse,
  meta: { icon: IconName.repulse, label: 'Repulse' },
  cost: REPULSE.cost,
  hotkey: 'H',
  canActivate: (s) => s.spaceMetal >= REPULSE.cost,
  canUse: (ui) => ui.spaceMetal >= REPULSE.cost,
  activate: (s) => ({
    ...s,
    spaceMetal: s.spaceMetal - REPULSE.cost,
    activeEffects: [...s.activeEffects, createRepulseEffect(s.ship.pos)],
  }),
}
