import { describe, it, expect } from 'vitest'
import { applyGravityWell, gravityWellDisplacement } from './gravity-pull'
import type { GravityWell } from './gravity-pull'
import { createEnemy } from '../../entities/entity-creator'
import { EnemyKind } from '../../types'

const well: GravityWell = { pos: { x: 1000, y: 1000 }, radius: 300, pullStrength: 200, damage: 10 }

describe('gravityWellDisplacement', () => {
  it('draws a body inward with a tangential swirl', () => {
    const d = gravityWellDisplacement({ x: 1200, y: 1000 }, well, 0.1) // +200x, inside radius 300
    expect(d.x).toBeLessThan(0) // net inward radial draw toward the well
    expect(Math.abs(d.y)).toBeGreaterThan(0) // tangential (orbit) component
  })

  it('is zero outside the radius', () => {
    expect(gravityWellDisplacement({ x: 1400, y: 1000 }, well, 0.1)).toEqual({ x: 0, y: 0 })
  })
})

describe('applyGravityWell', () => {
  it('moves a caught enemy by exactly the shared spiral displacement', () => {
    const enemy = createEnemy(EnemyKind.drone, { x: 1150, y: 1000 })
    const d = gravityWellDisplacement(enemy.pos, well, 0.016)
    const { enemies } = applyGravityWell([enemy], well, 0.016, { particleColor: '#fff' })
    expect(enemies).toHaveLength(1) // a single light tick of DOT won't kill it here
    expect(enemies[0].pos.x).toBeCloseTo(enemy.pos.x + d.x, 6)
    expect(enemies[0].pos.y).toBeCloseTo(enemy.pos.y + d.y, 6)
  })

  it('leaves enemies outside the radius untouched', () => {
    const enemy = createEnemy(EnemyKind.drone, { x: 1400, y: 1000 })
    const { enemies } = applyGravityWell([enemy], well, 0.016, { particleColor: '#fff' })
    expect(enemies[0].pos).toEqual(enemy.pos)
  })
})
