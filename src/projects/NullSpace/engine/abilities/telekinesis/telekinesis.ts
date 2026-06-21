import { TELEKINESIS } from '../ability-data'
import { AbilityKind } from '../../types'
import { worldToScreen } from '../../../renderer/camera'
import {
  makeAbilityUpgrade,
  applyCostReduction,
  applyTierSum,
  type AbilityDefinition,
} from '../ability-definition'
import { applyRadialForce, applyRadialForceToAsteroids } from './radial-force'
import { drawForceField } from '../shield/force-field-render'
import { IconName } from '../../../icon-names'
import type { HoldAbilityConfig } from '../hold-runtime'

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

const telekinesisHold: HoldAbilityConfig = {
  armSeconds: TELEKINESIS.armSeconds,
  // No drainInterval → continuous drain + onFrame every frame.
  onFrame: (bag, ability, holdPos, dt) => {
    const force = ability.force ?? TELEKINESIS.force
    const enemies = applyRadialForce(
      bag.enemies,
      holdPos,
      ability.aoeRadius,
      force,
      TELEKINESIS.mode,
      dt
    )
    const asteroids = applyRadialForceToAsteroids(
      bag.asteroids,
      holdPos,
      ability.aoeRadius,
      force,
      TELEKINESIS.mode,
      dt
    )
    return { ...bag, enemies, asteroids }
  },
  // Dashed ripple ring at the field edge + force lines to affected enemies.
  // Radius is in world units — the render transform applies the camera zoom, so
  // the ring matches the engine's world-space push radius exactly.
  renderFront: (ctx, ability, target, state, camera) => {
    const center = worldToScreen(target, camera)
    ctx.save()
    drawForceField(ctx, center, ability.aoeRadius, state.enemies, camera, {
      ring: 'rgba(80, 220, 255, 0.5)',
      lineRgb: '80, 220, 255',
    })
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
  ultimate: {
    kind: AbilityKind.singularity,
    label: 'Singularity',
    description: 'All things inevitably fall to one point',
    cost: { stardust: 400, spaceMetal: 15 },
  },
}
