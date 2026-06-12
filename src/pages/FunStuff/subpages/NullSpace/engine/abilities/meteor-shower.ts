import { METEOR_SHOWER, METEOR_STRIKE } from './ability-data'
import { createMeteorEffect } from './meteor-strike'
import { ringPositions } from '../math/vec'
import { AbilityKind } from '../types'
import {
  makeAbilityUpgrade,
  applyTierSum,
  composeUltimateUpgrades,
  type AbilityDefinition,
} from './ability-definition'
import { meteor } from './meteor'
import { IconName } from '../../icon-names'

export const METEOR_SHOWER_UPGRADE_IDS = {
  meteorShowerCount: 'meteorShowerCount',
} as const

const upgrade = makeAbilityUpgrade(AbilityKind.meteorShower)

const countUpgrade = upgrade({
  id: METEOR_SHOWER_UPGRADE_IDS.meteorShowerCount,
  label: 'Meteor Count',
  description: 'Add another meteor to the ring',
  tiers: [
    { cost: 80, value: 1 },
    { cost: 220, value: 1 },
    { cost: 500, value: 1 },
  ],
})

// First ring meteor sits on a diagonal so the base 4 reproduce NE/SE/SW/NW.
const RING_START_ANGLE = Math.PI / 4

// Meteor ultimate. A center meteor lands first, then a ring of evenly-spaced
// meteors lands together a beat later. Damage/radius track Meteor's upgrades;
// the Meteor Count upgrade adds ring meteors (the angle between them recomputes).
export const meteorShower: AbilityDefinition = {
  kind: AbilityKind.meteorShower,
  ultimateOf: AbilityKind.meteor,
  meta: { icon: IconName.meteor, label: 'Meteor Shower' },
  activation: 'click',
  base: () => ({
    kind: AbilityKind.meteorShower,
    cooldown: METEOR_STRIKE.cooldown,
    powerCost: METEOR_STRIKE.powerCost * METEOR_SHOWER.costMultiplier,
    damage: METEOR_STRIKE.damage,
    aoeRadius: METEOR_STRIKE.aoeRadius,
    count: METEOR_SHOWER.baseRingCount,
  }),
  effectFactory: (ability, pos) => {
    const ringCount = ability.count ?? METEOR_SHOWER.baseRingCount
    const center = createMeteorEffect(pos, ability.damage, ability.aoeRadius, METEOR_STRIKE.delay)
    const ringDelay = METEOR_STRIKE.delay + METEOR_SHOWER.ringDelay
    const ring = ringPositions(pos, METEOR_SHOWER.ringRadius, ringCount, RING_START_ANGLE).map(
      (ringPos) => createMeteorEffect(ringPos, ability.damage, ability.aoeRadius, ringDelay)
    )
    return [center, ...ring]
  },
  applyUpgrades: composeUltimateUpgrades(meteor, (basePatch, upgrades) => ({
    powerCost: (basePatch.powerCost ?? METEOR_STRIKE.powerCost) * METEOR_SHOWER.costMultiplier,
    count: applyTierSum(METEOR_SHOWER.baseRingCount, upgrades, countUpgrade),
  })),
  modifierUpgrades: [countUpgrade],
}
