import { HELPER } from '../ability-data'
import { createAlly } from '../../entities/entity-creator'
import { AbilityKind } from '../../types'
import {
  makeAbilityUpgrade,
  applyCostReduction,
  applyTierSum,
  type AbilityDefinition,
} from '../ability-definition'
import { IconName } from '../../../icon-names'

export const HELPER_UPGRADE_IDS = {
  unlockHelper: 'unlockHelper',
  helperMaxHp: 'helperMaxHp',
  helperDamage: 'helperDamage',
  helperCostReduction: 'helperCostReduction',
} as const

const upgrade = makeAbilityUpgrade(AbilityKind.helper)

const unlockUpgrade = upgrade({
  id: HELPER_UPGRADE_IDS.unlockHelper,
  label: 'Unlock Helper',
  description: 'Summon a ranged ally to fight alongside your ship',
  tiers: [{ cost: 30, value: 1 }],
})

const maxHpUpgrade = upgrade({
  id: HELPER_UPGRADE_IDS.helperMaxHp,
  label: 'Max Health',
  description: 'Increase ally maximum health',
  tiers: [
    { cost: 20, value: 10 },
    { cost: 70, value: 20 },
    { cost: 200, value: 30 },
  ],
})

const damageUpgrade = upgrade({
  id: HELPER_UPGRADE_IDS.helperDamage,
  label: 'Damage',
  description: 'Increase ally attack damage',
  tiers: [
    { cost: 25, value: 1 },
    { cost: 80, value: 2 },
    { cost: 200, value: 3 },
    { cost: 400, value: 4 },
    { cost: 800, value: 5 },
  ],
})

const costUpgrade = upgrade({
  id: HELPER_UPGRADE_IDS.helperCostReduction,
  label: 'Efficiency',
  description: 'Reduce helper power cost',
  tiers: [
    { cost: 15, value: 8 },
    { cost: 60, value: 10 },
  ],
})

export const helper: AbilityDefinition = {
  kind: AbilityKind.helper,
  meta: { icon: IconName.helper, label: 'Helper' },
  activation: 'click',
  base: () => ({
    kind: AbilityKind.helper,
    cooldown: HELPER.cooldown,
    powerCost: HELPER.powerCost,
    damage: HELPER.damage,
    aoeRadius: 0,
    maxHp: HELPER.hp,
  }),
  allyFactory: (pos, ability) => createAlly(pos, ability.maxHp ?? HELPER.hp, ability.damage),
  applyUpgrades: (_ability, upgrades) => ({
    unlocked: upgrades[HELPER_UPGRADE_IDS.unlockHelper].currentTier > 0,
    maxHp: applyTierSum(HELPER.hp, upgrades, maxHpUpgrade),
    damage: applyTierSum(HELPER.damage, upgrades, damageUpgrade),
    powerCost: applyCostReduction(HELPER.powerCost, upgrades, costUpgrade),
  }),
  unlockUpgrade,
  modifierUpgrades: [maxHpUpgrade, damageUpgrade, costUpgrade],
  ultimate: {
    kind: AbilityKind.helperFactory,
    label: 'Helper Factory',
    description: 'One forge, and from it, an endless tide.',
    cost: { stardust: 300, spaceMetal: 12 },
  },
}
