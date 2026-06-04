import { TELEKINESIS } from './abilityData'
import { AbilityKind, UpgradeCategory, UpgradeId } from '../types'
import type { UpgradeDefinition } from '../types'
import { applyTierSum, type AbilityDefinition } from './ability-definition'
import type { HoldAbilityConfig } from './hold-runtime'

const unlockUpgrade: UpgradeDefinition = {
  id: UpgradeId.unlockTelekinesis,
  category: UpgradeCategory.weapons,
  weapon: AbilityKind.telekinesis,
  label: 'Unlock Telekinesis',
  description: 'Hold to push enemies and your ship with a force field',
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
    { cost: 30, value: 50 },
  ],
}

const strengthUpgrade: UpgradeDefinition = {
  id: UpgradeId.telekinesisStrength,
  category: UpgradeCategory.weapons,
  weapon: AbilityKind.telekinesis,
  label: 'Force',
  description: 'Increase telekinesis push strength',
  tiers: [
    { cost: 20, value: 0.4 },
    { cost: 40, value: 0.6 },
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
    const forceAt = (dist: number) => {
      if (dist >= radius) return 0
      const x = dist / radius
      if (x <= TELEKINESIS_PLATEAU) return TELEKINESIS.force
      const t = (x - TELEKINESIS_PLATEAU) / (1 - TELEKINESIS_PLATEAU)
      return TELEKINESIS.force * 0.5 * (Math.cos(Math.PI * t) + 1)
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
  meta: { icon: '✋', label: 'Telekinesis' },
  activation: 'hold',
  base: () => ({
    kind: AbilityKind.telekinesis,
    cooldown: 0,
    powerCost: TELEKINESIS.powerPerSec,
    damage: 0,
    aoeRadius: TELEKINESIS.radius,
  }),
  applyUpgrades: (_ability, upgrades) => ({
    unlocked: upgrades[UpgradeId.unlockTelekinesis].currentTier > 0,
    aoeRadius: applyTierSum(TELEKINESIS.radius, upgrades, radiusUpgrade),
  }),
  unlockUpgrade,
  modifierUpgrades: [radiusUpgrade, strengthUpgrade],
  hold: telekinesisHold,
}
