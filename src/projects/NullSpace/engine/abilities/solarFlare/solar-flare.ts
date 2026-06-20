import { SOLAR_FLARE } from '../ability-data'
import { createParticle } from '../../entities/entity-creator'
import { rng } from '../../math/random'
import { AbilityKind } from '../../types'
import { damageEnemiesInBeam } from './beam-damage'
import { worldToScreen } from '../../../renderer/camera'
import {
  makeAbilityUpgrade,
  applyCostReduction,
  applyTierSum,
  type AbilityDefinition,
} from '../ability-definition'
import { IconName } from '../../../icon-names'
import type { HoldAbilityConfig } from '../hold-runtime'

export const SOLAR_FLARE_UPGRADE_IDS = {
  unlockSolarFlare: 'unlockSolarFlare',
  solarFlareDamage: 'solarFlareDamage',
  solarFlareEfficiency: 'solarFlareEfficiency',
  solarFlareRadius: 'solarFlareRadius',
} as const

const upgrade = makeAbilityUpgrade(AbilityKind.solarFlare)

const unlockUpgrade = upgrade({
  id: SOLAR_FLARE_UPGRADE_IDS.unlockSolarFlare,
  label: 'Unlock Solar Flare',
  description: 'Hold to emit a continuous damage beam toward your cursor',
  tiers: [{ cost: 40, value: 1 }],
})

const damageUpgrade = upgrade({
  id: SOLAR_FLARE_UPGRADE_IDS.solarFlareDamage,
  label: 'Damage',
  description: 'Increase solar flare damage per tick',
  tiers: [
    { cost: 15, value: 4 },
    { cost: 60, value: 6 },
    { cost: 200, value: 10 },
    { cost: 400, value: 15 },
    { cost: 800, value: 20 },
  ],
})

const efficiencyUpgrade = upgrade({
  id: SOLAR_FLARE_UPGRADE_IDS.solarFlareEfficiency,
  label: 'Efficiency',
  description: 'Reduce solar flare power drain per second',
  tiers: [
    { cost: 20, value: 2 },
    { cost: 80, value: 2 },
  ],
})

const radiusUpgrade = upgrade({
  id: SOLAR_FLARE_UPGRADE_IDS.solarFlareRadius,
  label: 'Range',
  description: 'Increase solar flare beam width',
  tiers: [
    { cost: 15, value: 15 },
    { cost: 60, value: 25 },
    { cost: 200, value: 35 },
  ],
})

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
    const result = damageEnemiesInBeam(
      bag.enemies,
      bag.particles,
      holdPos,
      ability.aoeRadius,
      ability.damage,
      {
        killBurst: { count: 12, color: '#ffaa33' },
        surviveBurst: { count: 4, color: '#ffdd66' },
      }
    )
    return {
      ...bag,
      enemies: result.enemies,
      particles: result.particles,
      killedEnemies: [...bag.killedEnemies, ...result.killedEnemies],
    }
  },
  // Soft heat haze under the particle spawn area. Particles do the bulk of the
  // visual; this just hints at the affected zone. Radius is in world units —
  // the render transform applies the camera zoom — so it matches the beam's
  // particle spray and damage radius.
  renderBack: (ctx, ability, target, _state, camera) => {
    const center = worldToScreen(target, camera)

    ctx.save()
    const gradient = ctx.createRadialGradient(
      center.x,
      center.y,
      0,
      center.x,
      center.y,
      ability.aoeRadius
    )
    gradient.addColorStop(0, 'rgba(255, 220, 120, 0.18)')
    gradient.addColorStop(0.6, 'rgba(255, 150, 60, 0.08)')
    gradient.addColorStop(1, 'rgba(255, 100, 30, 0)')
    ctx.fillStyle = gradient
    ctx.beginPath()
    ctx.arc(center.x, center.y, ability.aoeRadius, 0, Math.PI * 2)
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
  ultimate: {
    kind: AbilityKind.solarPlague,
    label: 'Solar Plague',
    description: 'One ember, and the swarm burns as one.',
    cost: { stardust: 420, spaceMetal: 16 },
  },
}
