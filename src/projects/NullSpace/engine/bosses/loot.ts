import { rng } from '../math/random'
import type { Vec2 } from '../types'
import type { DropSpec } from './boss-definition'

// Random N-piece space-metal burst radiating outward from a point. `min`/`max`
// are inclusive: `[2, 4]` drops 2–4 metals.
export function metalBurst(origin: Vec2, min: number, max: number): DropSpec[] {
  const count = min + rng.intRange(0, max - min)
  const drops: DropSpec[] = []
  for (let i = 0; i < count; i++) {
    const angle = rng.range(0, Math.PI * 2)
    const dist = rng.range(20, 60)
    drops.push({
      pos: { x: origin.x + Math.cos(angle) * dist, y: origin.y + Math.sin(angle) * dist },
      vel: { x: Math.cos(angle) * 40, y: Math.sin(angle) * 40 },
    })
  }
  return drops
}
