import { SOLAR_FLARE } from './ability-data'
import { canEnemyTakeDamage } from '../bosses/index'
import { distance } from '../math/collision'
import { createParticle, spawnExplosionParticles } from '../entities/entity-creator'
import { rng } from '../math/random'
import { AbilityKind, UpgradeCategory } from '../types'
import type { Enemy, UpgradeDefinition } from '../types'
import { worldToScreen } from '../../renderer/camera'
import { applyCostReduction, applyTierSum, type AbilityDefinition } from './ability-definition'
import { IconName } from '../../icon-names'
import type { HoldAbilityConfig } from './hold-runtime'

export const SOLAR_FLARE_UPGRADE_IDS = {
  unlockSolarFlare: 'unlockSolarFlare',
  solarFlareDamage: 'solarFlareDamage',
  solarFlareEfficiency: 'solarFlareEfficiency',
  solarFlareRadius: 'solarFlareRadius',
} as const

const unlockUpgrade: UpgradeDefinition = {
  id: SOLAR_FLARE_UPGRADE_IDS.unlockSolarFlare,
  category: UpgradeCategory.weapons,
  weapon: AbilityKind.solarFlare,
  label: 'Unlock Solar Flare',
  description: 'Hold to emit a continuous damage beam toward your cursor',
  tiers: [{ cost: 40, value: 1 }],
}

const damageUpgrade: UpgradeDefinition = {
  id: SOLAR_FLARE_UPGRADE_IDS.solarFlareDamage,
  category: UpgradeCategory.weapons,
  weapon: AbilityKind.solarFlare,
  label: 'Damage',
  description: 'Increase solar flare damage per tick',
  tiers: [
    { cost: 15, value: 4 },
    { cost: 60, value: 6 },
    { cost: 200, value: 10 },
    { cost: 400, value: 15 },
    { cost: 800, value: 20 },
  ],
}

const efficiencyUpgrade: UpgradeDefinition = {
  id: SOLAR_FLARE_UPGRADE_IDS.solarFlareEfficiency,
  category: UpgradeCategory.weapons,
  weapon: AbilityKind.solarFlare,
  label: 'Efficiency',
  description: 'Reduce solar flare power drain per second',
  tiers: [
    { cost: 20, value: 2 },
    { cost: 80, value: 2 },
  ],
}

const radiusUpgrade: UpgradeDefinition = {
  id: SOLAR_FLARE_UPGRADE_IDS.solarFlareRadius,
  category: UpgradeCategory.weapons,
  weapon: AbilityKind.solarFlare,
  label: 'Range',
  description: 'Increase solar flare beam width',
  tiers: [
    { cost: 15, value: 15 },
    { cost: 60, value: 25 },
    { cost: 200, value: 35 },
  ],
}

const HOT_COLORS = ['#ffffff', '#fff2b0', '#ffe066', '#ffc24a']
const OUTER_COLORS = ['#ff8833', '#ff6622', '#ffaa44']

const solarFlareHold: HoldAbilityConfig = {
  armSeconds: SOLAR_FLARE.armSeconds,
  drainInterval: SOLAR_FLARE.drainInterval,
  // Particle rain every frame: dense bright-white/yellow core at the center,
  // thinner orange spray spreading to the full radius. Hot-fire look.
  onFrame: (bag, ability, holdPos) => {
    const fullRadius = ability.aoeRadius
    const particles = [...bag.particles]
    // Hot core: many particles, small radius, fast-fade short-life
    for (let i = 0; i < 10; i++) {
      const ang = rng.next() * Math.PI * 2
      const r = Math.sqrt(rng.next()) * (fullRadius * 0.35)
      particles.push(
        createParticle(
          { x: holdPos.x + Math.cos(ang) * r, y: holdPos.y + Math.sin(ang) * r },
          { x: 0, y: 0 },
          HOT_COLORS[Math.floor(rng.next() * HOT_COLORS.length)],
          0.18 + rng.next() * 0.18,
          3 + rng.next() * 3
        )
      )
    }
    // Outer spray: fewer particles, full radius
    for (let i = 0; i < 4; i++) {
      const ang = rng.next() * Math.PI * 2
      const r = Math.sqrt(rng.next()) * fullRadius
      particles.push(
        createParticle(
          { x: holdPos.x + Math.cos(ang) * r, y: holdPos.y + Math.sin(ang) * r },
          { x: 0, y: 0 },
          OUTER_COLORS[Math.floor(rng.next() * OUTER_COLORS.length)],
          0.3 + rng.next() * 0.3,
          2 + rng.next() * 2
        )
      )
    }
    return { ...bag, particles }
  },
  // Damage tick: every drainInterval, damage all enemies in radius. Score and
  // currency for kills are tallied by the game loop from killedEnemies, same as
  // every other kill source.
  onTick: (bag, ability, holdPos) => {
    const radius = ability.aoeRadius
    const updatedEnemies: Enemy[] = []
    let particles = bag.particles
    const newKills: Enemy[] = []
    for (const enemy of bag.enemies) {
      // Invincible enemies (shielded boss) take no damage from the flare.
      if (
        distance(holdPos, enemy.pos) < radius + enemy.radius &&
        canEnemyTakeDamage(enemy, bag.enemies)
      ) {
        const damaged = { ...enemy, hp: enemy.hp - ability.damage }
        if (damaged.hp <= 0) {
          newKills.push(enemy)
          particles = [...particles, ...spawnExplosionParticles(enemy.pos, 12, '#ffaa33')]
        } else {
          updatedEnemies.push(damaged)
          particles = [...particles, ...spawnExplosionParticles(enemy.pos, 4, '#ffdd66')]
        }
      } else {
        updatedEnemies.push(enemy)
      }
    }
    return {
      ...bag,
      enemies: updatedEnemies,
      particles,
      killedEnemies: [...bag.killedEnemies, ...newKills],
    }
  },
  // Soft heat haze under the particle spawn area. Particles do the bulk of the
  // visual; this just hints at the affected zone.
  renderBack: (ctx, ability, target, _state, camera) => {
    const center = worldToScreen(target, camera)
    const radius = ability.aoeRadius * camera.zoom

    ctx.save()
    const gradient = ctx.createRadialGradient(center.x, center.y, 0, center.x, center.y, radius)
    gradient.addColorStop(0, 'rgba(255, 220, 120, 0.18)')
    gradient.addColorStop(0.6, 'rgba(255, 150, 60, 0.08)')
    gradient.addColorStop(1, 'rgba(255, 100, 30, 0)')
    ctx.fillStyle = gradient
    ctx.beginPath()
    ctx.arc(center.x, center.y, radius, 0, Math.PI * 2)
    ctx.fill()
    ctx.restore()
  },
}

export const solarFlare: AbilityDefinition = {
  kind: AbilityKind.solarFlare,
  meta: { icon: IconName.solarFlare, label: 'Solar Flare' },
  activation: 'hold',
  base: () => ({
    kind: AbilityKind.solarFlare,
    cooldown: 0,
    powerCost: SOLAR_FLARE.powerPerSec,
    damage: SOLAR_FLARE.damagePerTick,
    aoeRadius: SOLAR_FLARE.beamWidth,
  }),
  applyUpgrades: (_ability, upgrades) => ({
    unlocked: upgrades[SOLAR_FLARE_UPGRADE_IDS.unlockSolarFlare].currentTier > 0,
    damage: applyTierSum(SOLAR_FLARE.damagePerTick, upgrades, damageUpgrade),
    powerCost: applyCostReduction(SOLAR_FLARE.powerPerSec, upgrades, efficiencyUpgrade),
    aoeRadius: applyTierSum(SOLAR_FLARE.beamWidth, upgrades, radiusUpgrade),
  }),
  unlockUpgrade,
  modifierUpgrades: [damageUpgrade, efficiencyUpgrade, radiusUpgrade],
  hold: solarFlareHold,
}
