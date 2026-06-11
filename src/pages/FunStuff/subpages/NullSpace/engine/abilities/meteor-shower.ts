import { METEOR_SHOWER, METEOR_STRIKE } from './ability-data'
import { createMeteorEffect } from './meteor-strike'
import { AbilityKind, UpgradeCategory, UpgradeId } from '../types'
import type { UpgradeDefinition } from '../types'
import { applyTierSum, type AbilityDefinition } from './ability-definition'
import { meteor } from './meteor'
import { IconName } from '../../icon-names'

const countUpgrade: UpgradeDefinition = {
  id: UpgradeId.meteorShowerCount,
  category: UpgradeCategory.weapons,
  weapon: AbilityKind.meteorShower,
  label: 'Meteor Count',
  description: 'Add another meteor to the ring',
  tiers: [
    { cost: 80, value: 1 },
    { cost: 220, value: 1 },
    { cost: 500, value: 1 },
  ],
}

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
    const ring = Array.from({ length: ringCount }, (_, i) => {
      const angle = RING_START_ANGLE + (i * Math.PI * 2) / ringCount
      return createMeteorEffect(
        {
          x: pos.x + Math.cos(angle) * METEOR_SHOWER.ringRadius,
          y: pos.y + Math.sin(angle) * METEOR_SHOWER.ringRadius,
        },
        ability.damage,
        ability.aoeRadius,
        ringDelay
      )
    })
    return [center, ...ring]
  },
  applyUpgrades: (ability, upgrades) => {
    const base = meteor.applyUpgrades?.(ability, upgrades) ?? {}
    return {
      damage: base.damage ?? METEOR_STRIKE.damage,
      aoeRadius: base.aoeRadius ?? METEOR_STRIKE.aoeRadius,
      powerCost: (base.powerCost ?? METEOR_STRIKE.powerCost) * METEOR_SHOWER.costMultiplier,
      count: applyTierSum(METEOR_SHOWER.baseRingCount, upgrades, countUpgrade),
    }
  },
  modifierUpgrades: [countUpgrade],
}
