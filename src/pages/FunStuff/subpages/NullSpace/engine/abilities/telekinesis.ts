import { TELEKINESIS } from './ability-data'
import { AbilityKind } from '../types'
import { worldToScreen } from '../../renderer/camera'
import {
  makeAbilityUpgrade,
  applyCostReduction,
  applyTierSum,
  type AbilityDefinition,
} from './ability-definition'
import { IconName } from '../../icon-names'
import type { HoldAbilityConfig } from './hold-runtime'

export const TELEKINESIS_UPGRADE_IDS = {
  unlockTelekinesis: 'unlockTelekinesis',
  telekinesisRadius: 'telekinesisRadius',
  telekinesisCostReduction: 'telekinesisCostReduction',
  telekinesisForce: 'telekinesisForce',
} as const

const upgrade = makeAbilityUpgrade(AbilityKind.telekinesis)

const unlockUpgrade = upgrade({
  id: TELEKINESIS_UPGRADE_IDS.unlockTelekinesis,
  label: 'Unlock Telekinesis',
  description: 'Hold to push enemies away with a force field',
  tiers: [{ cost: 35, value: 1 }],
})

const radiusUpgrade = upgrade({
  id: TELEKINESIS_UPGRADE_IDS.telekinesisRadius,
  label: 'Radius',
  description: 'Increase telekinesis field radius',
  tiers: [
    { cost: 15, value: 30 },
    { cost: 60, value: 50 },
  ],
})

const costUpgrade = upgrade({
  id: TELEKINESIS_UPGRADE_IDS.telekinesisCostReduction,
  label: 'Efficiency',
  description: 'Reduce telekinesis power drain per second',
  tiers: [
    { cost: 12, value: 3 },
    { cost: 48, value: 4 },
  ],
})

const forceUpgrade = upgrade({
  id: TELEKINESIS_UPGRADE_IDS.telekinesisForce,
  label: 'Force',
  description: 'Increase telekinesis push strength',
  tiers: [
    { cost: 15, value: 75 },
    { cost: 60, value: 125 },
    { cost: 200, value: 200 },
  ],
})

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
  // Dashed ripple ring at the field edge + force lines to affected enemies.
  // Radius is in world units — the render transform applies the camera zoom, so
  // the ring matches the engine's world-space push radius exactly.
  renderFront: (ctx, ability, target, state, camera) => {
    const center = worldToScreen(target, camera)
    const radius = ability.aoeRadius

    ctx.save()

    // Ripple circle
    ctx.strokeStyle = 'rgba(80, 220, 255, 0.5)'
    ctx.lineWidth = 2
    ctx.setLineDash([6, 4])
    ctx.beginPath()
    ctx.arc(center.x, center.y, radius, 0, Math.PI * 2)
    ctx.stroke()
    ctx.setLineDash([])

    // Force lines to affected enemies
    for (const enemy of state.enemies) {
      const eScreen = worldToScreen(enemy.pos, camera)
      const dx = eScreen.x - center.x
      const dy = eScreen.y - center.y
      const dist = Math.sqrt(dx * dx + dy * dy)
      if (dist >= radius) continue
      const alpha = (1 - dist / radius) * 0.6
      ctx.strokeStyle = `rgba(80, 220, 255, ${alpha.toFixed(2)})`
      ctx.lineWidth = 1
      ctx.beginPath()
      ctx.moveTo(center.x, center.y)
      ctx.lineTo(eScreen.x, eScreen.y)
      ctx.stroke()
    }

    ctx.restore()
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
    unlocked: upgrades[TELEKINESIS_UPGRADE_IDS.unlockTelekinesis].currentTier > 0,
    aoeRadius: applyTierSum(TELEKINESIS.radius, upgrades, radiusUpgrade),
    powerCost: applyCostReduction(TELEKINESIS.powerPerSec, upgrades, costUpgrade),
    force: applyTierSum(TELEKINESIS.force, upgrades, forceUpgrade),
  }),
  unlockUpgrade,
  modifierUpgrades: [radiusUpgrade, costUpgrade, forceUpgrade],
  hold: telekinesisHold,
}
