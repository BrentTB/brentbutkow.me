import { HYPNOSIS } from '../ability-data'
import { nearestEnemyWhere, isCharmable } from '../../entities/enemy-query'
import { AbilityKind } from '../../types'
import {
  makeAbilityUpgrade,
  applyTierSum,
  applyCostReduction,
  type AbilityDefinition,
} from '../ability-definition'
import { IconName } from '../../../icon-names'
import { charmTargets, countCharmed } from './charm'

export const HYPNOSIS_UPGRADE_IDS = {
  unlockHypnosis: 'unlockHypnosis',
  hypnosisDuration: 'hypnosisDuration',
  hypnosisReach: 'hypnosisReach',
  hypnosisCostReduction: 'hypnosisCostReduction',
} as const

const upgrade = makeAbilityUpgrade(AbilityKind.hypnosis)

const unlockUpgrade = upgrade({
  id: HYPNOSIS_UPGRADE_IDS.unlockHypnosis,
  label: 'Unlock Hypnosis',
  description: "Seize the nearest enemy's mind — it fights for you for a few seconds, then expires",
  tiers: [{ cost: 55, value: 1 }],
})

const durationUpgrade = upgrade({
  id: HYPNOSIS_UPGRADE_IDS.hypnosisDuration,
  label: 'Duration',
  description: 'Charmed enemies fight for you longer',
  tiers: [
    { cost: 25, value: 2 },
    { cost: 90, value: 3 },
  ],
})

const reachUpgrade = upgrade({
  id: HYPNOSIS_UPGRADE_IDS.hypnosisReach,
  label: 'Reach',
  description: 'Snap to enemies further from the cursor',
  tiers: [
    { cost: 18, value: 40 },
    { cost: 70, value: 60 },
  ],
})

const costUpgrade = upgrade({
  id: HYPNOSIS_UPGRADE_IDS.hypnosisCostReduction,
  label: 'Efficiency',
  description: 'Reduce hypnosis power cost',
  tiers: [
    { cost: 14, value: 5 },
    { cost: 55, value: 7 },
  ],
})

export const hypnosis: AbilityDefinition = {
  kind: AbilityKind.hypnosis,
  meta: { icon: IconName.hypnosis, label: 'Hypnosis' },
  activation: 'click',
  base: () => ({
    kind: AbilityKind.hypnosis,
    cooldown: HYPNOSIS.cooldown,
    powerCost: HYPNOSIS.powerCost,
    damage: 0,
    aoeRadius: HYPNOSIS.selectRange,
    duration: HYPNOSIS.duration,
  }),
  // Snap to the nearest charmable enemy within reach of the cursor and flip it.
  charmFactory: (targetPos, ability, enemies, allies) => {
    const slots = HYPNOSIS.maxCharmed - countCharmed(allies)
    const target = nearestEnemyWhere(targetPos, enemies, ability.aoeRadius, isCharmable(enemies))
    return charmTargets(target ? [target] : [], ability.duration ?? HYPNOSIS.duration, slots)
  },
  applyUpgrades: (_ability, upgrades) => ({
    unlocked: upgrades[HYPNOSIS_UPGRADE_IDS.unlockHypnosis].currentTier > 0,
    duration: applyTierSum(HYPNOSIS.duration, upgrades, durationUpgrade),
    aoeRadius: applyTierSum(HYPNOSIS.selectRange, upgrades, reachUpgrade),
    powerCost: applyCostReduction(HYPNOSIS.powerCost, upgrades, costUpgrade),
  }),
  unlockUpgrade,
  modifierUpgrades: [durationUpgrade, reachUpgrade, costUpgrade],
  ultimate: {
    kind: AbilityKind.piedPiper,
    label: 'Pied Piper',
    description: 'Play one note, and a whole crowd turns.',
    cost: { stardust: 340, spaceMetal: 13 },
  },
}
