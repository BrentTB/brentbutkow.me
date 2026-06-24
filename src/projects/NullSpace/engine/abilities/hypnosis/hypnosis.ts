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
  description: 'Charmed enemies are heartier, so they fight for you longer before fading',
  tiers: [
    { cost: 25, value: 20 },
    { cost: 90, value: 35 },
    { cost: 300, value: 45 },
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
    maxHp: 0,
    maxCharmed: HYPNOSIS.maxCharmed,
  }),
  // Snap to the nearest charmable enemy within reach of the cursor and flip it.
  charmFactory: (targetPos, ability, enemies, allies) => {
    const slots = (ability.maxCharmed ?? HYPNOSIS.maxCharmed) - countCharmed(allies)
    const target = nearestEnemyWhere(targetPos, enemies, ability.aoeRadius, isCharmable(enemies))
    return charmTargets(target ? [target] : [], ability.maxHp ?? 0, slots)
  },
  applyUpgrades: (_ability, upgrades) => ({
    unlocked: upgrades[HYPNOSIS_UPGRADE_IDS.unlockHypnosis].currentTier > 0,
    maxHp: applyTierSum(0, upgrades, durationUpgrade),
    powerCost: applyCostReduction(HYPNOSIS.powerCost, upgrades, costUpgrade),
  }),
  unlockUpgrade,
  modifierUpgrades: [durationUpgrade, costUpgrade],
  ultimate: {
    kind: AbilityKind.piedPiper,
    label: 'Pied Piper',
    description: 'Play one note, and a whole crowd turns.',
    cost: { stardust: 340, spaceMetal: 13 },
  },
}
