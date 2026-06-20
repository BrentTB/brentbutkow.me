import { NEBULA } from '../../data'
import { rng } from '../math/random'
import { toroidalDelta, toroidalDistance } from '../math/toroid'
import { EffectKind, NebulaVariant } from '../types'
import type { ActiveEffect, Ally, NebulaEffect, Ship, Vec2 } from '../types'

// Pure helpers shared by the engine (enemy/ally/ship/game-loop) and the renderer.
// Dependency-light on purpose (types + toroid + data + rng) so `entities/` can pull
// it in without an import cycle.

// Live radius: swells from startRadius to maxRadius over growDuration, then holds.
export function nebulaRadiusAt(n: NebulaEffect, elapsed: number): number {
  const t = n.growDuration > 0 ? Math.min(1, elapsed / n.growDuration) : 1
  return n.startRadius + (n.maxRadius - n.startRadius) * t
}

// A nebula reduced to its current {pos, radius} — the form the lookups consume.
export type NebulaZone = { pos: Vec2; radius: number }
export type SightCircle = { center: Vec2; radius: number }

// The per-frame nebula context: live zones split by variant + the clear sight bubbles.
export type NebulaField = {
  fog: NebulaZone[]
  slow: NebulaZone[]
  haze: NebulaZone[]
  circles: SightCircle[]
}

function zonesOf(effects: ActiveEffect[], variant: NebulaVariant): NebulaZone[] {
  const out: NebulaZone[] = []
  for (const e of effects) {
    if (e.kind === EffectKind.nebula && e.variant === variant) {
      out.push({ pos: e.pos, radius: nebulaRadiusAt(e, e.elapsed) })
    }
  }
  return out
}

// Clear sight-bubbles: the player's (larger) + one per ally (smaller). Anything
// inside one is mutually visible despite fog.
export function sightCircles(ship: Ship, allies: Ally[]): SightCircle[] {
  return [
    { center: ship.pos, radius: NEBULA.sightRadius },
    ...allies.map((a) => ({ center: a.pos, radius: NEBULA.allySightRadius })),
  ]
}

export function buildNebulaField(effects: ActiveEffect[], ship: Ship, allies: Ally[]): NebulaField {
  return {
    fog: zonesOf(effects, NebulaVariant.fog),
    slow: zonesOf(effects, NebulaVariant.slow),
    haze: zonesOf(effects, NebulaVariant.haze),
    circles: sightCircles(ship, allies),
  }
}

export function inZone(pos: Vec2, zones: NebulaZone[]): boolean {
  return zones.some((z) => toroidalDistance(pos, z.pos) <= z.radius)
}

function inAnyCircle(pos: Vec2, circles: SightCircle[]): boolean {
  return circles.some((c) => toroidalDistance(pos, c.center) <= c.radius)
}

// Movement multiplier at a position: NEBULA.slowMult inside any slow zone, else 1.
export function slowMultAt(pos: Vec2, slowZones: NebulaZone[]): number {
  return inZone(pos, slowZones) ? NEBULA.slowMult : 1
}

// Peak aim error (radians) at a position: scales with depth inside a haze zone
// (centre = full, rim = 0); 0 outside every haze zone. Strongest zone wins.
export function hazeJitterAt(pos: Vec2, hazeZones: NebulaZone[]): number {
  let max = 0
  for (const z of hazeZones) {
    const dist = toroidalDistance(pos, z.pos)
    if (dist > z.radius) continue
    max = Math.max(max, NEBULA.hazeJitterMax * (1 - dist / z.radius))
  }
  return max
}

// An enemy the player's side can see + target: not in fog, or revealed by a bubble.
// Drives concealed-enemy rendering, ally targeting, and the ship's hunt steering.
export function enemyVisibleToPlayerSide(enemyPos: Vec2, field: NebulaField): boolean {
  return !inZone(enemyPos, field.fog) || inAnyCircle(enemyPos, field.circles)
}

// The faithful fog rule for whether an enemy can see + target the player: a player
// in the open is always fair game; a player inside fog is hidden from distant
// enemies — only an enemy within the player's bubble, or a player standing in an
// ally's bubble, is seen. (The player's own bubble does not hide the player.)
export function playerVisibleToEnemy(
  enemyPos: Vec2,
  ship: Ship,
  allies: Ally[],
  fog: NebulaZone[]
): boolean {
  if (!inZone(ship.pos, fog)) return true
  if (toroidalDistance(enemyPos, ship.pos) <= NEBULA.sightRadius) return true
  return allies.some((a) => toroidalDistance(ship.pos, a.pos) <= NEBULA.allySightRadius)
}

// Same rule applied to an ally as the target: an ally in the open is visible; an
// ally in fog is seen only by enemies within that ally's bubble.
function allyVisibleToEnemy(enemyPos: Vec2, allyPos: Vec2, fog: NebulaZone[]): boolean {
  return !inZone(allyPos, fog) || toroidalDistance(enemyPos, allyPos) <= NEBULA.allySightRadius
}

// The nearest target an enemy can actually see (player or an ally), or null when fog
// hides them all → the enemy should wander. Used by enemy movement + shooting.
export function visibleTargetForEnemy(
  enemyPos: Vec2,
  ship: Ship,
  allies: Ally[],
  fog: NebulaZone[]
): Vec2 | null {
  let best: Vec2 | null = null
  let bestDist = Infinity
  if (playerVisibleToEnemy(enemyPos, ship, allies, fog)) {
    best = ship.pos
    bestDist = toroidalDistance(enemyPos, ship.pos)
  }
  for (const a of allies) {
    if (!allyVisibleToEnemy(enemyPos, a.pos, fog)) continue
    const d = toroidalDistance(enemyPos, a.pos)
    if (d < bestDist) {
      bestDist = d
      best = a.pos
    }
  }
  return best
}

// Rotates the aim (from→target) by a random angle within ±maxRadians and returns a
// new aim point at the same range — the symmetric haze degradation for auto-fire.
export function jitterAim(from: Vec2, target: Vec2, maxRadians: number): Vec2 {
  if (maxRadians <= 0) return target
  const { x: dx, y: dy } = toroidalDelta(from, target)
  const dist = Math.hypot(dx, dy)
  if (dist < 0.0001) return target
  const angle = Math.atan2(dy, dx) + rng.range(-maxRadians, maxRadians)
  return { x: from.x + Math.cos(angle) * dist, y: from.y + Math.sin(angle) * dist }
}
