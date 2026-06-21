import { toroidalDistance } from '../math/toroid'
import type { Enemy, Vec2 } from '../types'

// An overdrive field reduced to the params the per-frame passes read.
export type OverdriveZone = {
  pos: Vec2
  radius: number
  ampMult: number
  slowMult: number
  enemyDamageMult: number
  selfHaste: number
}

function hasStamp(e: Enemy): boolean {
  return (
    e.damageTakenMult !== undefined || e.speedMult !== undefined || e.damageDealtMult !== undefined
  )
}

// The strongest overdrive zone containing `pos` (most damage amp), or null.
function zoneAt(pos: Vec2, zones: OverdriveZone[]): OverdriveZone | null {
  let best: OverdriveZone | null = null
  for (const z of zones) {
    if (toroidalDistance(pos, z.pos) > z.radius) continue
    if (!best || z.ampMult > best.ampMult) best = z
  }
  return best
}

// Stamps each enemy's per-frame Overdrive debuffs (incoming/outgoing damage + speed
// multipliers) from the active fields, so every downstream pass — the damage choke,
// movement, shooting, contact — just reads the field. Reset to 1× (cleared) once an
// enemy isn't in a zone. Returns the input untouched in the common case of no fields
// and no lingering stamps, so an idle game pays nothing.
export function stampOverdriveDebuffs(enemies: Enemy[], zones: OverdriveZone[]): Enemy[] {
  if (zones.length === 0 && !enemies.some(hasStamp)) return enemies
  return enemies.map((e) => {
    const z = zones.length > 0 ? zoneAt(e.pos, zones) : null
    if (!z) {
      return hasStamp(e)
        ? { ...e, damageTakenMult: undefined, speedMult: undefined, damageDealtMult: undefined }
        : e
    }
    return {
      ...e,
      damageTakenMult: z.ampMult,
      speedMult: z.slowMult,
      damageDealtMult: z.enemyDamageMult,
    }
  })
}

// Cooldown-tick multiplier for the ship: the strongest self-haste among the
// overdrive zones it stands in, else 1.
export function overdriveHasteAt(pos: Vec2, zones: OverdriveZone[]): number {
  let haste = 1
  for (const z of zones) {
    if (toroidalDistance(pos, z.pos) <= z.radius) haste = Math.max(haste, z.selfHaste)
  }
  return haste
}
