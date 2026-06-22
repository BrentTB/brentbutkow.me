import { HYPNOSIS, PIED_PIPER } from '../ability-data'
import { enemiesWithinWhere, isCharmable } from '../../entities/enemy-query'
import { AbilityKind } from '../../types'
import {
  makeAbilityUpgrade,
  applyTierSum,
  composeUltimateUpgrades,
  type AbilityDefinition,
} from '../ability-definition'
import { IconName } from '../../../icon-names'
import { hypnosis } from './hypnosis'
import { charmTargets, countCharmed } from './charm'

export const PIED_PIPER_UPGRADE_IDS = {
  piedPiperCrowd: 'piedPiperCrowd',
} as const

const upgrade = makeAbilityUpgrade(AbilityKind.piedPiper)

const crowdUpgrade = upgrade({
  id: PIED_PIPER_UPGRADE_IDS.piedPiperCrowd,
  label: 'Crowd',
  description: 'Sweep a wider circle into your thrall',
  tiers: [
    { cost: 80, value: 50 },
    { cost: 220, value: 70 },
  ],
})

export const piedPiper: AbilityDefinition = {
  kind: AbilityKind.piedPiper,
  ultimateOf: AbilityKind.hypnosis,
  meta: { icon: IconName.piedPiper, label: 'Pied Piper' },
  activation: 'click',
  base: () => ({
    kind: AbilityKind.piedPiper,
    cooldown: HYPNOSIS.cooldown,
    powerCost: HYPNOSIS.powerCost * PIED_PIPER.costMultiplier,
    damage: 0,
    aoeRadius: PIED_PIPER.radius,
    duration: PIED_PIPER.duration,
  }),
  // AoE: flip every charmable enemy in the circle, up to the cap, nearest first.
  charmFactory: (targetPos, ability, enemies, allies) => {
    const slots = PIED_PIPER.maxCharmed - countCharmed(allies)
    const targets = enemiesWithinWhere(targetPos, enemies, ability.aoeRadius, isCharmable(enemies))
    return charmTargets(targets, ability.duration ?? PIED_PIPER.duration, slots)
  },
  // Inherits Hypnosis's Duration/Efficiency tiers; re-baselines to the ultimate's
  // shorter charm + higher cost, and owns its own Crowd (radius) tier.
  applyUpgrades: composeUltimateUpgrades(hypnosis, (basePatch, upgrades) => ({
    powerCost: (basePatch.powerCost ?? HYPNOSIS.powerCost) * PIED_PIPER.costMultiplier,
    duration: (basePatch.duration ?? HYPNOSIS.duration) + (PIED_PIPER.duration - HYPNOSIS.duration),
    aoeRadius: applyTierSum(PIED_PIPER.radius, upgrades, crowdUpgrade),
  })),
  modifierUpgrades: [crowdUpgrade],
}
