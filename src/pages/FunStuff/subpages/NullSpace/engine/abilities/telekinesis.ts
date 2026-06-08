import { TELEKINESIS } from './ability-data'
import { AbilityKind, UpgradeCategory, UpgradeId } from '../types'
import type { UpgradeDefinition } from '../types'
import { applyTierSum, type AbilityDefinition } from './ability-definition'
import { IconName } from '../../icon-names'
import type { HoldAbilityConfig } from './hold-runtime'

const unlockUpgrade: UpgradeDefinition = {
  id: UpgradeId.unlockTelekinesis,
  category: UpgradeCategory.weapons,
  weapon: AbilityKind.telekinesis,
  label: 'Unlock Telekinesis',
  description: 'Hold to push enemies away with a force field',
  tiers: [{ cost: 35, value: 1 }],
}

const radiusUpgrade: UpgradeDefinition = {
  id: UpgradeId.telekinesisRadius,
  category: UpgradeCategory.weapons,
  weapon: AbilityKind.telekinesis,
  label: 'Radius',
  description: 'Increase telekinesis field radius',
  tiers: [
    { cost: 15, value: 30 },
    { cost: 60, value: 50 },
  ],
}

const costUpgrade: UpgradeDefinition = {
  id: UpgradeId.telekinesisCostReduction,
  category: UpgradeCategory.weapons,
  weapon: AbilityKind.telekinesis,
  label: 'Efficiency',
  description: 'Reduce telekinesis power drain per second',
  tiers: [
    { cost: 12, value: 3 },
    { cost: 48, value: 4 },
  ],
}

const forceUpgrade: UpgradeDefinition = {
  id: UpgradeId.telekinesisForce,
  category: UpgradeCategory.weapons,
  weapon: AbilityKind.telekinesis,
  label: 'Force',
  description: 'Increase telekinesis push strength',
  tiers: [
    { cost: 15, value: 75 },
    { cost: 60, value: 125 },
    { cost: 200, value: 200 },
  ],
}

// Plateau falloff: full force inside ~25% of the radius, smooth cosine drop
// to zero at the edge. Fine-positioning the cursor isn't required to apply
// full force.
const TELEKINESIS_PLATEAU = 0.25

const telekinesisHold: HoldAbilityConfig = {
  armSeconds: TELEKINESIS.armSeconds,
  // No drainInterval → continuous drain + onFrame every frame.
  onFrame: (bag, ability, holdPos, dt) => {
    const radius = ability.aoeRadius
    const peakForce = ability.force ?? TELEKINESIS.force
    const forceAt = (dist: number) => {
      if (dist >= radius) return 0
      const x = dist / radius
      if (x <= TELEKINESIS_PLATEAU) return peakForce
      const t = (x - TELEKINESIS_PLATEAU) / (1 - TELEKINESIS_PLATEAU)
      return peakForce * 0.5 * (Math.cos(Math.PI * t) + 1)
    }
    const sign = TELEKINESIS.mode === 'pull' ? 1 : -1
    const enemies = bag.enemies.map((enemy) => {
      const dx = holdPos.x - enemy.pos.x
      const dy = holdPos.y - enemy.pos.y
      const dist = Math.sqrt(dx * dx + dy * dy)
      if (dist < 0.01) return enemy
      const f = forceAt(dist)
      if (f === 0) return enemy
      const step = f * dt * sign
      return {
        ...enemy,
        pos: {
          x: enemy.pos.x + (dx / dist) * step,
          y: enemy.pos.y + (dy / dist) * step,
        },
      }
    })
    return { ...bag, enemies }
  },
}

export const telekinesis: AbilityDefinition = {
  kind: AbilityKind.telekinesis,
  meta: { icon: IconName.telekinesis, label: 'Telekinesis' },
  activation: 'hold',
  base: () => ({
    kind: AbilityKind.telekinesis,
    cooldown: 0,
    powerCost: TELEKINESIS.powerPerSec,
    damage: 0,
    aoeRadius: TELEKINESIS.radius,
    force: TELEKINESIS.force,
  }),
  applyUpgrades: (_ability, upgrades) => ({
    unlocked: upgrades[UpgradeId.unlockTelekinesis].currentTier > 0,
    aoeRadius: applyTierSum(TELEKINESIS.radius, upgrades, radiusUpgrade),
    powerCost: Math.max(1, applyTierSum(TELEKINESIS.powerPerSec, upgrades, costUpgrade, -1)),
    force: applyTierSum(TELEKINESIS.force, upgrades, forceUpgrade),
  }),
  unlockUpgrade,
  modifierUpgrades: [radiusUpgrade, costUpgrade, forceUpgrade],
  hold: telekinesisHold,
}
