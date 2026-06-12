import { applyTierSum } from '../abilities/ability-definition'
import { damageEnemiesInRadius } from '../math/aoe'
import { uid } from '../entities/entity-creator'
import { EffectKind, ShipWeaponKind } from '../types'
import type { NuclearWasteEffect, Vec2 } from '../types'
import type { Camera } from '../../renderer/camera'
import { worldToScreen } from '../../renderer/camera'
import type {
  EffectDefinition,
  EffectTickContext,
  EffectTickResult,
} from '../systems/effect-definition'
import { passThroughTick } from '../systems/effect-definition'
import { IconName } from '../../icon-names'
import { NUKE } from './ship-weapon-data'
import {
  makeLoadoutUpgrade,
  buildShipProjectile,
  type ShipWeaponDefinition,
} from './ship-weapon-definition'

export const NUKE_UPGRADE_IDS = {
  unlockNuke: 'unlockNuke',
  nukeDamage: 'nukeDamage',
  nukeBlastRadius: 'nukeBlastRadius',
  nukeWasteDuration: 'nukeWasteDuration',
} as const

const upgrade = makeLoadoutUpgrade(ShipWeaponKind.nuke)

const unlockUpgrade = upgrade({
  id: NUKE_UPGRADE_IDS.unlockNuke,
  label: 'Unlock Nuke',
  description: 'A very slow shell with a massive blast that leaves radioactive waste',
  tiers: [{ cost: 140, value: 1 }],
})

const damageUpgrade = upgrade({
  id: NUKE_UPGRADE_IDS.nukeDamage,
  label: 'Damage',
  description: 'Increase nuke blast damage',
  tiers: [
    { cost: 50, value: 10 },
    { cost: 200, value: 20 },
    { cost: 480, value: 35 },
  ],
})

const radiusUpgrade = upgrade({
  id: NUKE_UPGRADE_IDS.nukeBlastRadius,
  label: 'Blast Radius',
  description: 'Increase nuke blast radius',
  tiers: [
    { cost: 40, value: 25 },
    { cost: 160, value: 40 },
  ],
})

const wasteDurationUpgrade = upgrade({
  id: NUKE_UPGRADE_IDS.nukeWasteDuration,
  label: 'Fallout',
  description: 'Radioactive waste lingers longer',
  tiers: [
    { cost: 40, value: 2 },
    { cost: 160, value: 3 },
  ],
})

export function createNuclearWasteEffect(
  pos: Vec2,
  peakRadius: number,
  damagePerSec: number,
  duration: number,
  growDuration: number
): NuclearWasteEffect {
  return {
    id: uid(),
    kind: EffectKind.nuclearWaste,
    pos: { ...pos },
    elapsed: 0,
    duration,
    peakRadius,
    growDuration,
    damagePerSec,
  }
}

// Current radius of a nuclear-waste zone at `waste.elapsed`. Used by both the
// damage tick and the renderer so the visual and the damage area always match.
// Phase 1 (0 → growDuration): scale 0 → peakRadius.
// Phase 2 (growDuration → duration): linearly shrink peakRadius → 0.
export function getNuclearWasteCurrentRadius(waste: NuclearWasteEffect): number {
  if (waste.elapsed <= 0) return 0
  if (waste.elapsed < waste.growDuration) {
    return waste.peakRadius * (waste.elapsed / waste.growDuration)
  }
  const shrinkSpan = Math.max(waste.duration - waste.growDuration, 0.0001)
  const shrinkProgress = (waste.elapsed - waste.growDuration) / shrinkSpan
  return Math.max(0, waste.peakRadius * (1 - shrinkProgress))
}

function tickNuclearWaste(waste: NuclearWasteEffect, ctx: EffectTickContext): EffectTickResult {
  if (waste.elapsed >= waste.duration) {
    return passThroughTick(null, ctx)
  }

  const currentRadius = getNuclearWasteCurrentRadius(waste)
  const { enemies, scoreGained, killedEnemies } = damageEnemiesInRadius(
    ctx.enemies,
    waste.pos,
    currentRadius,
    waste.damagePerSec,
    ctx.dt
  )

  return {
    effect: waste,
    enemies,
    projectiles: ctx.projectiles,
    particles: [],
    scoreGained,
    killedEnemies,
  }
}

function renderNuclearWaste(
  ctx: CanvasRenderingContext2D,
  waste: NuclearWasteEffect,
  camera: Camera
): void {
  const screen = worldToScreen(waste.pos, camera)
  // Radius shares the damage helper so visual and damage circle match exactly.
  const r = getNuclearWasteCurrentRadius(waste)
  if (r <= 0.5) return

  ctx.save()
  ctx.translate(screen.x, screen.y)

  // Sickly green DOT field — flatter than the sun corona; reads as "ground"
  // contamination rather than a star.
  const fill = ctx.createRadialGradient(0, 0, 0, 0, 0, r)
  fill.addColorStop(0, 'rgba(136, 255, 68, 0.30)')
  fill.addColorStop(0.7, 'rgba(96, 200, 50, 0.20)')
  fill.addColorStop(1, 'rgba(60, 130, 30, 0)')
  ctx.fillStyle = fill
  ctx.beginPath()
  ctx.arc(0, 0, r, 0, Math.PI * 2)
  ctx.fill()

  // Static dashed rim to signal a damage zone. No pulse — the size schedule
  // (grow then shrink) carries the motion.
  ctx.strokeStyle = 'rgba(180, 255, 100, 0.55)'
  ctx.lineWidth = 1.5
  ctx.setLineDash([4, 6])
  ctx.beginPath()
  ctx.arc(0, 0, r, 0, Math.PI * 2)
  ctx.stroke()
  ctx.setLineDash([])

  ctx.restore()
}

// Lingering DOT zone left by a nuke detonation (combat spawns it from the
// projectile's detonate.waste* fields).
export const nuclearWasteEffect: EffectDefinition = {
  tick: (effect, ctx) => tickNuclearWaste(effect as NuclearWasteEffect, ctx),
  renderBack: (ctx, effect, camera) =>
    renderNuclearWaste(ctx, effect as NuclearWasteEffect, camera),
}

export const nuke: ShipWeaponDefinition = {
  kind: ShipWeaponKind.nuke,
  meta: { icon: IconName.nuke, label: 'Nuke' },
  fireRateMultiplier: NUKE.fireRateMultiplier,
  weaponDamage: (baseShipDamage, upgrades) =>
    applyTierSum(baseShipDamage * NUKE.damageMultiplier, upgrades, damageUpgrade),
  createProjectiles: (shipPos, targetPos, damage, upgrades) => {
    const aoeRadius = applyTierSum(NUKE.baseAoeRadius, upgrades, radiusUpgrade)
    const wasteDuration = applyTierSum(NUKE.baseWasteDuration, upgrades, wasteDurationUpgrade)
    return [
      buildShipProjectile(shipPos, targetPos, damage, {
        speed: NUKE.speed,
        lifetime: NUKE.lifetime,
        radius: NUKE.radius,
        // Carries the detonation parameters with it so combat.ts can apply
        // them at impact without importing the weapon registry.
        detonate: {
          aoeRadius,
          // Direct hit also delivers the full blast damage to the surrounding
          // enemies, so the contact damage itself is folded into the AoE.
          blastDamage: damage,
          wasteRadius: NUKE.baseWasteRadius,
          wasteDps: NUKE.baseWasteDps,
          wasteDuration,
          wasteGrowDuration: NUKE.wasteGrowDuration,
        },
      }),
    ]
  },
  unlockUpgrade,
  modifierUpgrades: [damageUpgrade, radiusUpgrade, wasteDurationUpgrade],
}
