import { toroidalDistance } from './toroid'
import type { Vec2 } from '../types'

// A circular area of influence on the toroidal world — the shape every zone-based
// effect (nebula, radiation pool, overdrive field, gravity lure) reduces to.
export type Zone = { pos: Vec2; radius: number }

// Is `pos` inside any of the zones?
export function inZone(pos: Vec2, zones: Zone[]): boolean {
  return zones.some((z) => toroidalDistance(pos, z.pos) <= z.radius)
}

// The centre of the nearest zone that contains `pos`, or null if none do. Drives
// taunt-style redirection (Gravity Lure): an enemy in range steers to the beacon.
export function nearestZoneWithin(pos: Vec2, zones: Zone[]): Vec2 | null {
  let best: Vec2 | null = null
  let bestDist = Infinity
  for (const z of zones) {
    const d = toroidalDistance(pos, z.pos)
    if (d <= z.radius && d < bestDist) {
      bestDist = d
      best = z.pos
    }
  }
  return best
}
