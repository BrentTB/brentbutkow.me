import { HYPNOSIS, PIED_PIPER } from '../ability-data'
import { enemiesWithinWhere, isCharmable } from '../../entities/enemy-query'
import { AbilityKind } from '../../types'
import {
  makeAbilityUpgrade,
  applyTierSum,
  composeUltimateUpgrades,
  type AbilityDefinition,
  AbilityActivation,
} from '../ability-definition'
import { IconName } from '../../../icon-names'
import { hypnosis } from './hypnosis'
import { charmTargets, countCharmed } from './charm'

export const PIED_PIPER_UPGRADE_IDS = {
  piedPiperMaxCharmed: 'piedPiperMaxCharmed',
} as const

const upgrade = makeAbilityUpgrade(AbilityKind.piedPiper)

const maxCharmed = upgrade({
  id: PIED_PIPER_UPGRADE_IDS.piedPiperMaxCharmed,
  label: 'Max Charmed',
  description: 'Increase the maximum number of enemies you can charm',
  tiers: [
    { cost: 80, value: 2 },
    { cost: 220, value: 2 },
    { cost: 600, value: 2 },
  ],
})

export const piedPiper: AbilityDefinition = {
  kind: AbilityKind.piedPiper,
  ultimateOf: AbilityKind.hypnosis,
  meta: { icon: IconName.piedPiper, label: 'Pied Piper' },
  activation: AbilityActivation.click,
  base: () => ({
    kind: AbilityKind.piedPiper,
    cooldown: HYPNOSIS.cooldown,
    powerCost: HYPNOSIS.powerCost * PIED_PIPER.costMultiplier,
    damage: 0,
    aoeRadius: PIED_PIPER.radius,
    maxHp: 0,
    maxCharmed: PIED_PIPER.maxCharmed,
  }),
  // AoE: flip every charmable enemy in the circle, up to the cap, nearest first.
  charmFactory: (targetPos, ability, enemies, allies) => {
    const slots = (ability.maxCharmed ?? PIED_PIPER.maxCharmed) - countCharmed(allies)
    const targets = enemiesWithinWhere(targetPos, enemies, ability.aoeRadius, isCharmable(enemies))
    return charmTargets(targets, ability.maxHp ?? 0, slots)
  },
  // Inherits Hypnosis's Duration (survival HP) + Efficiency tiers; re-baselines to the
  // ultimate's higher cost and owns its own Max Charmed (cap) tier.
  applyUpgrades: composeUltimateUpgrades(hypnosis, (basePatch, upgrades) => ({
    powerCost: (basePatch.powerCost ?? HYPNOSIS.powerCost) * PIED_PIPER.costMultiplier,
    maxCharmed: applyTierSum(PIED_PIPER.maxCharmed, upgrades, maxCharmed),
  })),
  modifierUpgrades: [maxCharmed],
}
