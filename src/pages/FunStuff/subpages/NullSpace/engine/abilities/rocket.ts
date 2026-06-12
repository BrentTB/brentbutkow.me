import { ROCKET } from './ability-data'
import { damageEnemiesInRadiusFlat } from '../math/aoe'
import { createParticle, spawnExplosionParticles, uid } from '../entities/entity-creator'
import { AbilityKind, EffectKind, UpgradeCategory } from '../types'
import type { Particle, RocketEffect, UpgradeDefinition, Vec2 } from '../types'
import type { Camera } from '../../renderer/camera'
import { worldToScreen } from '../../renderer/camera'
import type { SpriteCache } from '../../renderer/sprite-cache'
import { getSpriteSize } from '../../renderer/sprite-cache'
import { SpriteKey } from '../../renderer/sprites'
import { applyCostReduction, applyTierSum, type AbilityDefinition } from './ability-definition'
import type {
  EffectDefinition,
  EffectTickContext,
  EffectTickResult,
} from '../systems/effect-definition'
import { IconName } from '../../icon-names'

export const ROCKET_UPGRADE_IDS = {
  unlockRocket: 'unlockRocket',
  rocketDamage: 'rocketDamage',
  rocketRadius: 'rocketRadius',
  rocketCostReduction: 'rocketCostReduction',
} as const

const unlockUpgrade: UpgradeDefinition = {
  id: ROCKET_UPGRADE_IDS.unlockRocket,
  category: UpgradeCategory.weapons,
  weapon: AbilityKind.rocket,
  label: 'Unlock Rocket',
  description: 'Unlock the homing Rocket strike',
  tiers: [{ cost: 25, value: 1 }],
}

const damageUpgrade: UpgradeDefinition = {
  id: ROCKET_UPGRADE_IDS.rocketDamage,
  category: UpgradeCategory.weapons,
  weapon: AbilityKind.rocket,
  label: 'Damage',
  description: 'Increase rocket explosion damage',
  tiers: [
    { cost: 10, value: 10 },
    { cost: 40, value: 15 },
    { cost: 140, value: 25 },
    { cost: 280, value: 30 },
    { cost: 560, value: 40 },
  ],
}

const radiusUpgrade: UpgradeDefinition = {
  id: ROCKET_UPGRADE_IDS.rocketRadius,
  category: UpgradeCategory.weapons,
  weapon: AbilityKind.rocket,
  label: 'Blast Radius',
  description: 'Increase rocket explosion radius',
  tiers: [
    { cost: 12, value: 15 },
    { cost: 48, value: 25 },
    { cost: 192, value: 35 },
  ],
}

const costUpgrade: UpgradeDefinition = {
  id: ROCKET_UPGRADE_IDS.rocketCostReduction,
  category: UpgradeCategory.weapons,
  weapon: AbilityKind.rocket,
  label: 'Efficiency',
  description: 'Reduce rocket power cost',
  tiers: [
    { cost: 12, value: 4 },
    { cost: 48, value: 5 },
  ],
}

export function createRocketEffect(
  shipPos: Vec2,
  targetPos: Vec2,
  damage: number,
  aoeRadius: number,
  speed: number
): RocketEffect {
  const dx = targetPos.x - shipPos.x
  const dy = targetPos.y - shipPos.y
  const dist = Math.sqrt(dx * dx + dy * dy)
  const flightTime = dist / speed
  const nx = dist > 0 ? dx / dist : 0
  const ny = dist > 0 ? dy / dist : 0
  return {
    id: uid(),
    kind: EffectKind.rocket,
    pos: { ...shipPos },
    elapsed: 0,
    duration: flightTime,
    vel: { x: nx * speed, y: ny * speed },
    targetPos: { ...targetPos },
    damage,
    aoeRadius,
    trailTimer: 0,
  }
}

// Radius around the rocket sprite that counts as "contact" with an enemy
// during flight. Decoupled from aoeRadius so the explosion is bigger than
// the rocket-as-projectile collision check.
const ROCKET_HIT_RADIUS = 10

function tickRocket(missile: RocketEffect, ctx: EffectTickContext): EffectTickResult {
  // Fly forward first, then test for contact / arrival from the NEW position.
  const newPos = {
    x: missile.pos.x + missile.vel.x * ctx.dt,
    y: missile.pos.y + missile.vel.y * ctx.dt,
  }

  let hitContact = false
  for (const enemy of ctx.enemies) {
    const dx = newPos.x - enemy.pos.x
    const dy = newPos.y - enemy.pos.y
    const r = ROCKET_HIT_RADIUS + enemy.radius
    if (dx * dx + dy * dy <= r * r) {
      hitContact = true
      break
    }
  }

  // Arrival detection: elapsed time has reached the planned flight time.
  const reachedTarget = missile.elapsed >= missile.duration

  if (hitContact || reachedTarget) {
    // Detonate at the rocket's actual current position so the visual rocket
    // and the AoE always line up.
    const detonatePos = hitContact ? newPos : missile.targetPos
    const { enemies, scoreGained, killedEnemies } = damageEnemiesInRadiusFlat(
      ctx.enemies,
      detonatePos,
      missile.aoeRadius,
      missile.damage
    )
    return {
      effect: null,
      enemies,
      projectiles: ctx.projectiles,
      particles: spawnExplosionParticles(detonatePos, 18, '#ff7733'),
      scoreGained,
      killedEnemies,
    }
  }

  // Emit a trail particle at a steady interval.
  const trailParticles: Particle[] = []
  const trailTimer = missile.trailTimer - ctx.dt
  if (trailTimer <= 0) {
    trailParticles.push(
      createParticle(
        { x: newPos.x, y: newPos.y },
        { x: -missile.vel.x * 0.15, y: -missile.vel.y * 0.15 },
        '#ffaa55',
        0.4,
        3
      )
    )
  }

  return {
    effect: {
      ...missile,
      pos: newPos,
      trailTimer: trailTimer <= 0 ? ROCKET.trailParticleInterval : trailTimer,
    },
    enemies: ctx.enemies,
    projectiles: ctx.projectiles,
    particles: trailParticles,
    scoreGained: 0,
    killedEnemies: [],
  }
}

function renderRocket(
  ctx: CanvasRenderingContext2D,
  missile: RocketEffect,
  camera: Camera,
  sprites: SpriteCache
): void {
  const screen = worldToScreen(missile.pos, camera)
  const size = getSpriteSize(SpriteKey.rocket)
  // Rocket sprite is drawn with the nose pointing UP at rotation 0; rotate so
  // the nose tracks the velocity direction.
  const angle = Math.atan2(missile.vel.y, missile.vel.x) + Math.PI / 2

  ctx.save()
  ctx.translate(screen.x, screen.y)
  ctx.rotate(angle)
  ctx.drawImage(sprites.rocket, -size.w / 2, -size.h / 2)
  ctx.restore()
}

export const rocketEffect: EffectDefinition = {
  tick: (effect, ctx) => tickRocket(effect as RocketEffect, ctx),
  renderFront: (ctx, effect, camera, sprites) =>
    renderRocket(ctx, effect as RocketEffect, camera, sprites),
}

export const rocket: AbilityDefinition = {
  kind: AbilityKind.rocket,
  meta: { icon: IconName.rocket, label: 'Rocket' },
  activation: 'click',
  base: () => ({
    kind: AbilityKind.rocket,
    cooldown: ROCKET.cooldown,
    powerCost: ROCKET.powerCost,
    damage: ROCKET.damage,
    aoeRadius: ROCKET.aoeRadius,
  }),
  effectFactory: (ability, pos, ship) => [
    createRocketEffect(ship.pos, pos, ability.damage, ability.aoeRadius, ROCKET.speed),
  ],
  applyUpgrades: (_ability, upgrades) => ({
    unlocked: upgrades[ROCKET_UPGRADE_IDS.unlockRocket].currentTier > 0,
    damage: applyTierSum(ROCKET.damage, upgrades, damageUpgrade),
    aoeRadius: applyTierSum(ROCKET.aoeRadius, upgrades, radiusUpgrade),
    powerCost: applyCostReduction(ROCKET.powerCost, upgrades, costUpgrade),
  }),
  unlockUpgrade,
  modifierUpgrades: [damageUpgrade, radiusUpgrade, costUpgrade],
}
