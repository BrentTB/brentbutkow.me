import { SOLAR_FLARE } from './ability-data'
import { distance } from '../math/collision'
import { createParticle, spawnExplosionParticles } from '../entities/entity-creator'
import { rng } from '../math/random'
import { AbilityKind, UpgradeCategory, UpgradeId } from '../types'
import type { Enemy, UpgradeDefinition } from '../types'
import { applyTierSum, type AbilityDefinition } from './ability-definition'
import { IconName } from '../../icon-names'
import type { HoldAbilityConfig } from './hold-runtime'

const unlockUpgrade: UpgradeDefinition = {
  id: UpgradeId.unlockSolarFlare,
  category: UpgradeCategory.weapons,
  weapon: AbilityKind.solarFlare,
  label: 'Unlock Solar Flare',
  description: 'Hold to emit a continuous damage beam toward your cursor',
  tiers: [{ cost: 40, value: 1 }],
}

const damageUpgrade: UpgradeDefinition = {
  id: UpgradeId.solarFlareDamage,
  category: UpgradeCategory.weapons,
  weapon: AbilityKind.solarFlare,
  label: 'Damage',
  description: 'Increase solar flare damage per tick',
  tiers: [
    { cost: 15, value: 4 },
    { cost: 30, value: 6 },
    { cost: 50, value: 10 },
  ],
}

const efficiencyUpgrade: UpgradeDefinition = {
  id: UpgradeId.solarFlareEfficiency,
  category: UpgradeCategory.weapons,
  weapon: AbilityKind.solarFlare,
  label: 'Efficiency',
  description: 'Reduce solar flare power drain per second',
  tiers: [
    { cost: 20, value: 2 },
    { cost: 40, value: 2 },
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
      if (distance(holdPos, enemy.pos) < radius + enemy.radius) {
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
    unlocked: upgrades[UpgradeId.unlockSolarFlare].currentTier > 0,
    damage: applyTierSum(SOLAR_FLARE.damagePerTick, upgrades, damageUpgrade),
    powerCost: Math.max(1, applyTierSum(SOLAR_FLARE.powerPerSec, upgrades, efficiencyUpgrade, -1)),
  }),
  unlockUpgrade,
  modifierUpgrades: [damageUpgrade, efficiencyUpgrade],
  hold: solarFlareHold,
}
