import { GRAVITY_LURE, COLLAPSAR } from '../ability-data'
import { AbilityKind } from '../../types'
import {
  makeAbilityUpgrade,
  applyTierSum,
  composeUltimateUpgrades,
  type AbilityDefinition,
} from '../ability-definition'
import { gravityLure, createGravityLureEffect } from './gravity-lure'
import { IconName } from '../../../icon-names'

export const COLLAPSAR_UPGRADE_IDS = {
  collapsarDamage: 'collapsarDamage',
} as const

const upgrade = makeAbilityUpgrade(AbilityKind.collapsar)

const implosionUpgrade = upgrade({
  id: COLLAPSAR_UPGRADE_IDS.collapsarDamage,
  label: 'Implosion',
  description: 'The collapse hits harder when the beacon dies',
  tiers: [
    { cost: 80, value: 40 },
    { cost: 240, value: 70 },
  ],
})

export const collapsar: AbilityDefinition = {
  kind: AbilityKind.collapsar,
  ultimateOf: AbilityKind.gravityLure,
  meta: { icon: IconName.gravityLure, label: 'Collapsar' },
  activation: 'click',
  base: () => ({
    kind: AbilityKind.collapsar,
    cooldown: GRAVITY_LURE.cooldown,
    powerCost: GRAVITY_LURE.powerCost * COLLAPSAR.costMultiplier,
    damage: COLLAPSAR.detonateDamage,
    aoeRadius: GRAVITY_LURE.lureRadius * COLLAPSAR.lureRadiusScale,
    maxHp: COLLAPSAR.hp,
  }),
  effectFactory: (ability, pos) => [
    createGravityLureEffect(pos, ability.aoeRadius, ability.maxHp ?? COLLAPSAR.hp, {
      damage: ability.damage,
      radius: COLLAPSAR.detonateRadius,
    }),
  ],
  // Inherits Gravity Lure's pull + Durability tiers on a larger, tougher base;
  // Implosion tunes the detonation it adds on death.
  applyUpgrades: composeUltimateUpgrades(gravityLure, (basePatch, upgrades) => ({
    powerCost: (basePatch.powerCost ?? GRAVITY_LURE.powerCost) * COLLAPSAR.costMultiplier,
    aoeRadius: (basePatch.aoeRadius ?? GRAVITY_LURE.lureRadius) * COLLAPSAR.lureRadiusScale,
    maxHp: (basePatch.maxHp ?? GRAVITY_LURE.hp) + (COLLAPSAR.hp - GRAVITY_LURE.hp),
    damage: applyTierSum(COLLAPSAR.detonateDamage, upgrades, implosionUpgrade),
  })),
  modifierUpgrades: [implosionUpgrade],
}
