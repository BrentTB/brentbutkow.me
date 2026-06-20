import { SHIELD } from '../ability-data'
import { spawnExplosionParticles, uid } from '../../entities/entity-creator'
import { applyDamageToEnemy } from '../../entities/enemy-damage'
import { canEnemyTakeDamage } from '../../bosses'
import { AbilityKind, EffectKind } from '../../types'
import type {
  ActiveEffect,
  Asteroid,
  Enemy,
  ForceFieldEffect,
  Particle,
  RepulseFieldEffect,
  ShieldEffect,
  Vec2,
} from '../../types'
import { tickDomeAbsorption } from './dome-absorption'
import type { Camera } from '../../../renderer/camera'
import { renderDome } from './dome-render'
import type { DomeShape, DomeStyle } from './dome-render'
import { toroidalDelta, wrapPosition } from '../../math/toroid'
import {
  makeAbilityUpgrade,
  applyCostReduction,
  applyTierSum,
  type AbilityDefinition,
} from '../ability-definition'
import type {
  EffectDefinition,
  EffectTickContext,
  EffectTickResult,
} from '../../systems/effect-definition'
import { passThroughTick } from '../../systems/effect-definition'
import { IconName } from '../../../icon-names'

export const SHIELD_UPGRADE_IDS = {
  unlockShield: 'unlockShield',
  shieldDuration: 'shieldDuration',
  shieldRadius: 'shieldRadius',
  shieldCostReduction: 'shieldCostReduction',
} as const

const upgrade = makeAbilityUpgrade(AbilityKind.shield)

const unlockUpgrade = upgrade({
  id: SHIELD_UPGRADE_IDS.unlockShield,
  label: 'Unlock Shield',
  description: 'Unlock the Shield barrier',
  tiers: [{ cost: 30, value: 1 }],
})

const durationUpgrade = upgrade({
  id: SHIELD_UPGRADE_IDS.shieldDuration,
  label: 'Duration',
  description: 'Increase shield duration',
  tiers: [
    { cost: 12, value: 1.5 },
    { cost: 48, value: 2.5 },
    { cost: 192, value: 3.5 },
  ],
})

const radiusUpgrade = upgrade({
  id: SHIELD_UPGRADE_IDS.shieldRadius,
  label: 'Size',
  description: 'Increase shield radius',
  tiers: [
    { cost: 10, value: 15 },
    { cost: 40, value: 25 },
    { cost: 140, value: 40 },
  ],
})

const costUpgrade = upgrade({
  id: SHIELD_UPGRADE_IDS.shieldCostReduction,
  label: 'Efficiency',
  description: 'Reduce shield power cost',
  tiers: [
    { cost: 12, value: 5 },
    { cost: 48, value: 5 },
  ],
})

export function createShieldEffect(pos: Vec2, radius: number, duration: number): ShieldEffect {
  return {
    id: uid(),
    kind: EffectKind.shield,
    pos: { ...pos },
    elapsed: 0,
    duration,
    radius,
    grandfatheredEnemyIds: null,
  }
}

function tickShield(zone: ShieldEffect, ctx: EffectTickContext): EffectTickResult {
  if (zone.elapsed >= zone.duration) {
    return passThroughTick(null, ctx)
  }
  return tickDomeAbsorption(zone, ctx, zone.radius, '#88ccff')
}

export type ShieldConstraintResult = {
  enemies: Enemy[]
  asteroids: Asteroid[]
  killedEnemies: Enemy[]
  scoreGained: number
  particles: Particle[]
}

/**
 * Push non-grandfathered enemies that are inside any active shield or force
 * field out to the edge. Called AFTER enemy movement so an enemy that just
 * walked into one this frame gets bounced back to the boundary.
 *
 * A base shield reflects the inward velocity and deals no damage. A Force Field
 * (the shield ultimate) shoves the enemy out hard at its `knockback` speed and
 * burns it for `bumpDamage`/sec of contact, returning any kills so the loop can
 * award score/currency. Shielded bosses are immune to the contact damage.
 *
 * Shape: similar to homing — pure geometry, no allocations on the hot path
 * when no shields are active.
 */
export function applyShieldConstraints(
  effects: ActiveEffect[],
  enemies: Enemy[],
  dt: number,
  asteroids: Asteroid[] = []
): ShieldConstraintResult {
  let active: (ShieldEffect | ForceFieldEffect | RepulseFieldEffect)[] | null = null
  for (const e of effects) {
    if (
      e.kind === EffectKind.shield ||
      e.kind === EffectKind.forceField ||
      e.kind === EffectKind.repulseField
    ) {
      if (!active) active = []
      active.push(e)
    }
  }
  if (!active) return { enemies, asteroids, killedEnemies: [], scoreGained: 0, particles: [] }

  const surviving: Enemy[] = []
  const killedEnemies: Enemy[] = []
  const particles: Particle[] = []
  let scoreGained = 0

  for (const enemy of enemies) {
    let pos = enemy.pos
    let vel = enemy.vel
    let contactDamage = 0
    let bumped = false
    for (const zone of active) {
      if (zone.grandfatheredEnemyIds?.includes(enemy.id)) continue
      // Shortest vector from the dome centre to the enemy — wraps the seam, so a
      // dome near a world edge still catches enemies on the far side.
      const { x: dx, y: dy } = toroidalDelta(zone.pos, pos)
      const distSq = dx * dx + dy * dy
      if (distSq < zone.radius * zone.radius) {
        const dist = Math.sqrt(distSq)
        // Outward unit normal from the dome center to the enemy.
        const nx = dist > 0.01 ? dx / dist : 1
        const ny = dist > 0.01 ? dy / dist : 0
        // Snap to the edge so we never have an enemy genuinely inside the dome.
        pos = wrapPosition({ x: zone.pos.x + nx * zone.radius, y: zone.pos.y + ny * zone.radius })
        if (zone.kind === EffectKind.forceField || zone.kind === EffectKind.repulseField) {
          // Force field / Repulse: hurl the enemy straight out, far harder than a
          // bounce, and burn it while it touches the field (Repulse's bumpDamage is 0).
          vel = { x: nx * zone.knockback, y: ny * zone.knockback }
          contactDamage += zone.bumpDamage * dt
        } else {
          // Base shield: reflect the inward velocity component, keep the
          // tangential. Enemies already leaving (vDotN >= 0) aren't bounced.
          const vDotN = vel.x * nx + vel.y * ny
          if (vDotN < 0) {
            vel = { x: vel.x - 2 * vDotN * nx, y: vel.y - 2 * vDotN * ny }
          }
        }
        bumped = true
      }
    }
    if (!bumped) {
      surviving.push(enemy)
      continue
    }
    if (contactDamage > 0 && canEnemyTakeDamage(enemy, enemies)) {
      const damaged = applyDamageToEnemy(enemy, contactDamage)
      if (damaged.hp <= 0) {
        killedEnemies.push(enemy)
        scoreGained += enemy.scoreValue
        particles.push(...spawnExplosionParticles(enemy.pos, 8, '#c8a8ff'))
        continue
      }
      surviving.push({ ...damaged, pos, vel })
      continue
    }
    surviving.push({ ...enemy, pos, vel })
  }

  // Domes deflect asteroids too — snap them to the edge and bounce them out (a
  // force field / repulse hurls; a base shield reflects). Marks them interacted so
  // a rock you deflect into something is still loot-eligible.
  const bouncedAsteroids = asteroids.map((a) => {
    let pos = a.pos
    let vel = a.vel
    let bumped = false
    for (const zone of active) {
      const { x: dx, y: dy } = toroidalDelta(zone.pos, pos)
      const distSq = dx * dx + dy * dy
      if (distSq >= zone.radius * zone.radius) continue
      const dist = Math.sqrt(distSq)
      const nx = dist > 0.01 ? dx / dist : 1
      const ny = dist > 0.01 ? dy / dist : 0
      pos = wrapPosition({ x: zone.pos.x + nx * zone.radius, y: zone.pos.y + ny * zone.radius })
      if (zone.kind === EffectKind.forceField || zone.kind === EffectKind.repulseField) {
        vel = { x: nx * zone.knockback, y: ny * zone.knockback }
      } else {
        const vDotN = vel.x * nx + vel.y * ny
        if (vDotN < 0) vel = { x: vel.x - 2 * vDotN * nx, y: vel.y - 2 * vDotN * ny }
      }
      bumped = true
    }
    return bumped ? { ...a, pos, vel, playerInteracted: true } : a
  })

  return { enemies: surviving, asteroids: bouncedAsteroids, killedEnemies, scoreGained, particles }
}

// Translucent cool-blue dome.
const SHIELD_DOME_STYLE: DomeStyle = {
  fadeIn: { cap: 0.4, frac: 0.15 },
  fadeOut: { cap: 0.8, frac: 0.3 },
  pulseFreq: 5,
  fillStops: [
    [0, 'rgba(120, 200, 255, 0.05)'],
    [0.6, 'rgba(120, 200, 255, 0.1)'],
    [1, 'rgba(60, 180, 255, 0.25)'],
  ],
  rim: { color: '120, 220, 255', alpha: 0.6, width: 2 },
}

// A band of light sweeping around the shield rim — Shield's signature flourish.
function shieldShimmer(ctx: CanvasRenderingContext2D, dome: DomeShape, pulse: number): void {
  const sweep = dome.elapsed * 2
  ctx.strokeStyle = `rgba(205, 245, 255, ${0.5 * pulse})`
  ctx.lineWidth = 3
  ctx.beginPath()
  ctx.arc(0, 0, dome.radius, sweep, sweep + Math.PI * 0.5)
  ctx.stroke()
}

function renderShield(ctx: CanvasRenderingContext2D, dome: ShieldEffect, camera: Camera): void {
  renderDome(ctx, dome, camera, SHIELD_DOME_STYLE, shieldShimmer)
}

export const shieldEffect: EffectDefinition = {
  tick: (effect, ctx) => tickShield(effect as ShieldEffect, ctx),
  renderBack: (ctx, effect, camera) => renderShield(ctx, effect as ShieldEffect, camera),
}

export const shield: AbilityDefinition = {
  kind: AbilityKind.shield,
  meta: { icon: IconName.shield, label: 'Shield' },
  activation: 'click',
  base: () => ({
    kind: AbilityKind.shield,
    cooldown: SHIELD.cooldown,
    powerCost: SHIELD.powerCost,
    // Shield is a movement barrier, not a damage dealer.
    damage: 0,
    aoeRadius: SHIELD.radius,
    duration: SHIELD.duration,
  }),
  effectFactory: (ability, pos) => [
    createShieldEffect(pos, ability.aoeRadius, ability.duration ?? SHIELD.duration),
  ],
  applyUpgrades: (_ability, upgrades) => ({
    unlocked: upgrades[SHIELD_UPGRADE_IDS.unlockShield].currentTier > 0,
    aoeRadius: applyTierSum(SHIELD.radius, upgrades, radiusUpgrade),
    duration: applyTierSum(SHIELD.duration, upgrades, durationUpgrade),
    powerCost: applyCostReduction(SHIELD.powerCost, upgrades, costUpgrade),
  }),
  unlockUpgrade,
  modifierUpgrades: [durationUpgrade, radiusUpgrade, costUpgrade],
  ultimate: {
    kind: AbilityKind.forceField,
    label: 'Force Field',
    description: 'Space bends, then snaps - and nothing stays close for long.',
    cost: { stardust: 350, spaceMetal: 14 },
  },
}
