import { describe, it, expect } from 'vitest'
import { createChainArcEffect, chainArcEffect, resolveChain } from './chain-lightning'
import { createEnemy, createShip } from '../../entities/entity-creator'
import { EnemyKind, ShipKind } from '../../types'
import type { ChainArcEffect, Enemy } from '../../types'
import type { EffectTickContext } from '../../systems/effect-definition'
import { WORLD_SIZE } from '../../../data'

const ORIGIN = { x: 1000, y: 1000 }

// A horizontal line of drones `gap` apart, the first sitting on ORIGIN.
function lineOfDrones(n: number, gap = 80): Enemy[] {
  return Array.from({ length: n }, (_, i) =>
    createEnemy(EnemyKind.drone, { x: ORIGIN.x + i * gap, y: ORIGIN.y })
  )
}

function ctx(enemies: Enemy[]): EffectTickContext {
  return {
    enemies,
    projectiles: [],
    ship: createShip(ShipKind.fighter, WORLD_SIZE),
    worldSize: WORLD_SIZE,
    dt: 0.016,
  }
}

function arc(overrides: Partial<ChainArcEffect> = {}): ChainArcEffect {
  return {
    ...createChainArcEffect(ORIGIN, 5, 140, 5, 1, 0.8, 0.22),
    ...overrides,
  }
}

describe('resolveChain', () => {
  it('chains from the nearest enemy through successive jumps', () => {
    const enemies = lineOfDrones(3)
    const { hits, segments } = resolveChain(ORIGIN, enemies, arc())
    expect(hits.map((h) => h.id)).toEqual(enemies.map((e) => e.id))
    expect(segments).toHaveLength(3)
  })

  it('falls off damage each generation', () => {
    const { hits } = resolveChain(ORIGIN, lineOfDrones(3), arc({ damage: 100, falloff: 0.5 }))
    expect(hits[0].damage).toBe(100)
    expect(hits[1].damage).toBe(50)
    expect(hits[2].damage).toBe(25)
  })

  it('stops at maxJumps', () => {
    const { hits } = resolveChain(ORIGIN, lineOfDrones(5), arc({ maxJumps: 2 }))
    expect(hits).toHaveLength(2)
  })

  it('will not jump across a gap wider than jumpRange', () => {
    const enemies = [
      createEnemy(EnemyKind.drone, ORIGIN),
      createEnemy(EnemyKind.drone, { x: ORIGIN.x + 300, y: ORIGIN.y }),
    ]
    const { hits } = resolveChain(ORIGIN, enemies, arc({ jumpRange: 140 }))
    expect(hits).toHaveLength(1)
    expect(hits[0].id).toBe(enemies[0].id)
  })

  // Regression: the first target must respect jumpRange too — a tap with no enemy
  // close enough fizzles instead of snapping to a far-away one.
  it('strikes nothing when the nearest enemy is beyond jumpRange of the tap', () => {
    const far = [createEnemy(EnemyKind.drone, { x: ORIGIN.x + 300, y: ORIGIN.y })]
    const { hits, segments } = resolveChain(ORIGIN, far, arc({ jumpRange: 140 }))
    expect(hits).toHaveLength(0)
    expect(segments).toHaveLength(0)
  })

  it('forks to multiple targets per hit (Ion Storm)', () => {
    const hub = createEnemy(EnemyKind.drone, ORIGIN)
    const left = createEnemy(EnemyKind.drone, { x: ORIGIN.x - 60, y: ORIGIN.y })
    const right = createEnemy(EnemyKind.drone, { x: ORIGIN.x + 60, y: ORIGIN.y })
    const { hits } = resolveChain(ORIGIN, [hub, left, right], arc({ forks: 2, maxJumps: 3 }))
    expect(hits).toHaveLength(3)
  })
})

describe('chainArcEffect.tick', () => {
  it('applies damage to every struck enemy and marks itself resolved', () => {
    const enemies = lineOfDrones(3)
    const result = chainArcEffect.tick(arc(), ctx(enemies))
    for (const e of result.enemies) {
      expect(e.hp).toBeLessThan(enemies[0].hp)
    }
    expect((result.effect as ChainArcEffect).resolved).toBe(true)
    expect((result.effect as ChainArcEffect).segments).toHaveLength(3)
  })

  it('the first hit takes more damage than the second', () => {
    const enemies = lineOfDrones(2)
    const result = chainArcEffect.tick(arc({ damage: 6, falloff: 0.5 }), ctx(enemies))
    const first = result.enemies.find((e) => e.id === enemies[0].id)!
    const second = result.enemies.find((e) => e.id === enemies[1].id)!
    expect(enemies[0].hp - first.hp).toBeGreaterThan(enemies[1].hp - second.hp)
  })

  it('reports kills through killedEnemies', () => {
    const enemies = lineOfDrones(2)
    const result = chainArcEffect.tick(arc({ damage: 100 }), ctx(enemies))
    expect(result.killedEnemies.length).toBeGreaterThan(0)
    expect(result.scoreGained).toBeGreaterThan(0)
  })

  it('does not re-apply damage once resolved', () => {
    const enemies = lineOfDrones(2)
    const resolved = arc({ resolved: true })
    const result = chainArcEffect.tick(resolved, ctx(enemies))
    expect(result.enemies).toEqual(enemies)
    expect(result.killedEnemies).toHaveLength(0)
  })

  it('fizzles when no enemy is within range of the tap', () => {
    const far = [createEnemy(EnemyKind.drone, { x: ORIGIN.x + 300, y: ORIGIN.y })]
    const result = chainArcEffect.tick(arc({ jumpRange: 140 }), ctx(far))
    expect(result.killedEnemies).toHaveLength(0)
    expect(result.enemies[0].hp).toBe(far[0].hp)
    expect((result.effect as ChainArcEffect).segments).toHaveLength(0)
    // Still crackles at the tapped spot so the player sees the ability fired.
    expect(result.particles.length).toBeGreaterThan(0)
  })
})
