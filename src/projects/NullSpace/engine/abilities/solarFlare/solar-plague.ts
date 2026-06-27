import { SOLAR_FLARE, SOLAR_PLAGUE } from '../ability-data'
import { createParticle } from '../../entities/entity-creator'
import { rng } from '../../math/random'
import { AbilityKind } from '../../types'
import { damageEnemiesInBeam } from './beam-damage'
import { worldToScreen } from '../../../renderer/camera'
import {
  makeAbilityUpgrade,
  applyTierSum,
  composeUltimateUpgrades,
  type AbilityDefinition,
  AbilityActivation,
} from '../ability-definition'
import { solarFlare } from './solar-flare'
import { IconName } from '../../../icon-names'
import type { HoldAbilityConfig } from '../hold-runtime'

export const SOLAR_PLAGUE_UPGRADE_IDS = {
  solarPlagueSpread: 'solarPlagueSpread',
} as const

const upgrade = makeAbilityUpgrade(AbilityKind.solarPlague)

const wildfireUpgrade = upgrade({
  id: SOLAR_PLAGUE_UPGRADE_IDS.solarPlagueSpread,
  label: 'Wildfire',
  description: 'Fire leaps between enemies from further away',
  // Values add onto the base spread gap via applyTierSum.
  tiers: [
    { cost: 70, value: 15 },
    { cost: 200, value: 20 },
    { cost: 460, value: 25 },
  ],
})

// Sickly-green core with an ember spray — reads apart from Solar Flare's hot white.
const PLAGUE_CORE = ['#d6ff8a', '#a6f24a', '#7cd62a']
const PLAGUE_EMBER = ['#ff8833', '#ff6622', '#ccdd44']

const solarPlagueHold: HoldAbilityConfig = {
  armSeconds: SOLAR_FLARE.armSeconds,
  drainInterval: SOLAR_FLARE.drainInterval,
  onFrame: (bag, ability, holdPos) => {
    const fullRadius = ability.aoeRadius
    const particles = [...bag.particles]
    for (let i = 0; i < 8; i++) {
      const ang = rng.next() * Math.PI * 2
      const r = Math.sqrt(rng.next()) * (fullRadius * 0.4)
      particles.push(
        createParticle(
          { x: holdPos.x + Math.cos(ang) * r, y: holdPos.y + Math.sin(ang) * r },
          { x: 0, y: -rng.range(5, 20) },
          PLAGUE_CORE[Math.floor(rng.next() * PLAGUE_CORE.length)],
          0.2 + rng.next() * 0.2,
          3 + rng.next() * 3
        )
      )
    }
    for (let i = 0; i < 4; i++) {
      const ang = rng.next() * Math.PI * 2
      const r = Math.sqrt(rng.next()) * fullRadius
      particles.push(
        createParticle(
          { x: holdPos.x + Math.cos(ang) * r, y: holdPos.y + Math.sin(ang) * r },
          { x: 0, y: 0 },
          PLAGUE_EMBER[Math.floor(rng.next() * PLAGUE_EMBER.length)],
          0.3 + rng.next() * 0.3,
          2 + rng.next() * 2
        )
      )
    }
    return { ...bag, particles }
  },
  // Beam deals Solar Flare's direct damage per tick AND ignites: the fire burns
  // at `dpsMultiplier` of the beam's per-second rate on top, so holding stacks
  // both (≈150% of Flare). The fire then lingers and spreads after you move off.
  onTick: (bag, ability, holdPos) => {
    // Fire rate is a fraction of the beam's per-second rate (damage-per-tick ÷
    // drainInterval), not of the per-tick number — so it stacks meaningfully.
    const dps = (ability.damage / SOLAR_FLARE.drainInterval) * SOLAR_PLAGUE.dpsMultiplier
    const spreadRange = ability.spreadRange ?? SOLAR_PLAGUE.baseSpreadRange
    const result = damageEnemiesInBeam(
      bag.enemies,
      bag.particles,
      holdPos,
      ability.aoeRadius,
      ability.damage,
      {
        killBurst: { count: 12, color: '#a6f24a' },
        // Survivors catch fire — the burning status drives the DOT + spread.
        onSurvive: (enemy) => ({
          ...enemy,
          burning: {
            remaining: SOLAR_PLAGUE.burnDuration,
            duration: SOLAR_PLAGUE.burnDuration,
            dps,
            spreadRange,
          },
        }),
      }
    )
    return {
      ...bag,
      enemies: result.enemies,
      particles: result.particles,
      killedEnemies: [...bag.killedEnemies, ...result.killedEnemies],
    }
  },
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
    gradient.addColorStop(0, 'rgba(180, 240, 120, 0.18)')
    gradient.addColorStop(0.6, 'rgba(140, 200, 70, 0.08)')
    gradient.addColorStop(1, 'rgba(120, 180, 50, 0)')
    ctx.fillStyle = gradient
    ctx.beginPath()
    ctx.arc(center.x, center.y, ability.aoeRadius, 0, Math.PI * 2)
    ctx.fill()
    ctx.restore()
  },
}

export const solarPlague: AbilityDefinition = {
  kind: AbilityKind.solarPlague,
  ultimateOf: AbilityKind.solarFlare,
  meta: { icon: IconName.solarFlare, label: 'Solar Plague' },
  activation: AbilityActivation.hold,
  base: () => ({
    kind: AbilityKind.solarPlague,
    cooldown: 0,
    powerCost: SOLAR_FLARE.powerPerSec * SOLAR_PLAGUE.costMultiplier,
    damage: SOLAR_FLARE.damagePerTick,
    aoeRadius: SOLAR_FLARE.beamWidth,
    spreadRange: SOLAR_PLAGUE.baseSpreadRange,
  }),
  applyUpgrades: composeUltimateUpgrades(solarFlare, (basePatch, upgrades) => ({
    powerCost: (basePatch.powerCost ?? SOLAR_FLARE.powerPerSec) * SOLAR_PLAGUE.costMultiplier,
    spreadRange: applyTierSum(SOLAR_PLAGUE.baseSpreadRange, upgrades, wildfireUpgrade),
  })),
  modifierUpgrades: [wildfireUpgrade],
  hold: solarPlagueHold,
}
