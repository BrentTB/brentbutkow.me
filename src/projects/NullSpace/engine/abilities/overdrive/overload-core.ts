import { OVERDRIVE, OVERLOAD_CORE } from '../ability-data'
import { AbilityKind } from '../../types'
import {
  makeAbilityUpgrade,
  applyTierSum,
  composeUltimateUpgrades,
  type AbilityDefinition,
} from '../ability-definition'
import { overdrive, createOverdriveFieldEffect } from './overdrive'
import { IconName } from '../../../icon-names'

export const OVERLOAD_CORE_UPGRADE_IDS = {
  overloadCoreAmp: 'overloadCoreAmp',
} as const

const upgrade = makeAbilityUpgrade(AbilityKind.overloadCore)

const resonanceUpgrade = upgrade({
  id: OVERLOAD_CORE_UPGRADE_IDS.overloadCoreAmp,
  label: 'Resonance',
  description: 'Enemies in the core take even more damage',
  tiers: [
    { cost: 120, value: 0.3 },
    { cost: 340, value: 0.5 },
  ],
})

export const overloadCore: AbilityDefinition = {
  kind: AbilityKind.overloadCore,
  ultimateOf: AbilityKind.overdrive,
  meta: { icon: IconName.overdrive, label: 'Overload Core' },
  activation: 'click',
  base: () => ({
    kind: AbilityKind.overloadCore,
    cooldown: OVERDRIVE.cooldown,
    powerCost: OVERDRIVE.powerCost * OVERLOAD_CORE.costMultiplier,
    damage: OVERLOAD_CORE.ampMult,
    aoeRadius: OVERDRIVE.radius * OVERLOAD_CORE.radiusScale,
    duration: OVERDRIVE.duration,
  }),
  effectFactory: (ability, pos) => [
    createOverdriveFieldEffect(
      pos,
      ability.aoeRadius,
      ability.duration ?? OVERDRIVE.duration,
      ability.damage,
      OVERLOAD_CORE.slowMult,
      OVERLOAD_CORE.enemyDamageMult,
      OVERLOAD_CORE.selfHaste
    ),
  ],
  // Inherits Overdrive's Amplify/Duration tiers, layered onto Overload Core's higher
  // base amp + bigger radius; Resonance pushes the amplification further.
  applyUpgrades: composeUltimateUpgrades(overdrive, (basePatch, upgrades) => ({
    powerCost: (basePatch.powerCost ?? OVERDRIVE.powerCost) * OVERLOAD_CORE.costMultiplier,
    aoeRadius: (basePatch.aoeRadius ?? OVERDRIVE.radius) * OVERLOAD_CORE.radiusScale,
    damage:
      (basePatch.damage ?? OVERDRIVE.ampMult) +
      (OVERLOAD_CORE.ampMult - OVERDRIVE.ampMult) +
      applyTierSum(0, upgrades, resonanceUpgrade),
  })),
  modifierUpgrades: [resonanceUpgrade],
}
