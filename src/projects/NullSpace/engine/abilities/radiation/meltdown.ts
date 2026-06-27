import { RADIATION, MELTDOWN } from '../ability-data'
import { AbilityKind } from '../../types'
import {
  makeAbilityUpgrade,
  applyTierSum,
  composeUltimateUpgrades,
  type AbilityDefinition,
  AbilityActivation,
} from '../ability-definition'
import { radiation, createRadiationFieldEffect } from './radiation'
import { IconName } from '../../../icon-names'

export const MELTDOWN_UPGRADE_IDS = {
  meltdownSpread: 'meltdownSpread',
} as const

const upgrade = makeAbilityUpgrade(AbilityKind.meltdown)

const contaminationUpgrade = upgrade({
  id: MELTDOWN_UPGRADE_IDS.meltdownSpread,
  label: 'Contamination',
  description: 'A max-stacked enemy spreads radiation to others further away',
  // Values add onto the base spread gap via applyTierSum.
  tiers: [
    { cost: 80, value: 20 },
    { cost: 220, value: 30 },
    { cost: 480, value: 40 },
  ],
})

export const meltdown: AbilityDefinition = {
  kind: AbilityKind.meltdown,
  ultimateOf: AbilityKind.radiation,
  meta: { icon: IconName.radiation, label: 'Meltdown' },
  activation: AbilityActivation.click,
  base: () => ({
    kind: AbilityKind.meltdown,
    cooldown: RADIATION.cooldown,
    powerCost: RADIATION.powerCost * MELTDOWN.costMultiplier,
    damage: RADIATION.dpsPerStack + MELTDOWN.dpsPerStackBonus,
    aoeRadius: RADIATION.radius * MELTDOWN.radiusScale,
    duration: RADIATION.duration * MELTDOWN.durationScale,
    spreadRange: MELTDOWN.spreadRange,
  }),
  effectFactory: (ability, pos) => [
    createRadiationFieldEffect(
      pos,
      ability.aoeRadius,
      ability.damage,
      ability.duration ?? RADIATION.duration * MELTDOWN.durationScale,
      MELTDOWN.maxStacks,
      ability.spreadRange ?? MELTDOWN.spreadRange
    ),
  ],
  // Inherits Radiation's damage/duration/radius tiers, then layers Meltdown's
  // scale + bonus on top; Contamination tunes the contagion reach.
  applyUpgrades: composeUltimateUpgrades(radiation, (basePatch, upgrades) => ({
    damage: (basePatch.damage ?? RADIATION.dpsPerStack) + MELTDOWN.dpsPerStackBonus,
    aoeRadius: (basePatch.aoeRadius ?? RADIATION.radius) * MELTDOWN.radiusScale,
    duration: (basePatch.duration ?? RADIATION.duration) * MELTDOWN.durationScale,
    powerCost: (basePatch.powerCost ?? RADIATION.powerCost) * MELTDOWN.costMultiplier,
    spreadRange: applyTierSum(MELTDOWN.spreadRange, upgrades, contaminationUpgrade),
  })),
  modifierUpgrades: [contaminationUpgrade],
}
