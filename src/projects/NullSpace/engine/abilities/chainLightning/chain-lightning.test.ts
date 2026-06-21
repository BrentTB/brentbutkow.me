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
  it('a single fork chains from the nearest enemy through successive hops', () => {
    const enemies = lineOfDrones(3)
    const { hits, segments } = resolveChain(ORIGIN, enemies, arc({ forks: 1, depth: 5 }))
    expect(hits.map((h) => h.id)).toEqual(enemies.map((e) => e.id))
    expect(segments).toHaveLength(3)
  })

  it('falls off damage each hop', () => {
    const { hits } = resolveChain(
      ORIGIN,
      lineOfDrones(3),
      arc({ damage: 100, falloff: 0.5, forks: 1, depth: 5 })
    )
    expect(hits[0].damage).toBe(100)
    expect(hits[1].damage).toBe(50)
    expect(hits[2].damage).toBe(25)
  })

  it('a fork stops after `depth` hops (seed + depth enemies)', () => {
    const { hits } = resolveChain(ORIGIN, lineOfDrones(6), arc({ forks: 1, depth: 2 }))
    expect(hits).toHaveLength(3)
  })

  it('will not jump across a gap wider than jumpRange', () => {
    const enemies = [
      createEnemy(EnemyKind.drone, ORIGIN),
      createEnemy(EnemyKind.drone, { x: ORIGIN.x + 300, y: ORIGIN.y }),
    ]
    const { hits } = resolveChain(ORIGIN, enemies, arc({ forks: 1, jumpRange: 140 }))
    expect(hits).toHaveLength(1)
    expect(hits[0].id).toBe(enemies[0].id)
  })

  // Regression: the seeds must respect jumpRange too — a tap with no enemy close
  // enough fizzles instead of snapping to a far-away one.
  it('strikes nothing when the nearest enemy is beyond jumpRange of the tap', () => {
    const far = [createEnemy(EnemyKind.drone, { x: ORIGIN.x + 300, y: ORIGIN.y })]
    const { hits, segments } = resolveChain(ORIGIN, far, arc({ jumpRange: 140 }))
    expect(hits).toHaveLength(0)
    expect(segments).toHaveLength(0)
  })

  it('forks seed distinct enemies and overlap on a cluster (3 forks × 3 enemies = 9 hits)', () => {
    const cluster = [
      createEnemy(EnemyKind.drone, ORIGIN),
      createEnemy(EnemyKind.drone, { x: ORIGIN.x + 40, y: ORIGIN.y }),
      createEnemy(EnemyKind.drone, { x: ORIGIN.x, y: ORIGIN.y + 40 }),
    ]
    const { hits } = resolveChain(ORIGIN, cluster, arc({ forks: 3, depth: 2, jumpRange: 140 }))
    expect(hits).toHaveLength(9)
    // each enemy struck exactly three times — once per fork
    for (const e of cluster) {
      expect(hits.filter((h) => h.id === e.id)).toHaveLength(3)
    }
  })

  it('a lone target feeds only one fork, so it stays a single hit', () => {
    const lone = [createEnemy(EnemyKind.drone, ORIGIN)]
    const { hits } = resolveChain(ORIGIN, lone, arc({ forks: 3, depth: 2 }))
    expect(hits).toHaveLength(1)
  })

  it('tendrils cover every enemy before doubling up (no one left untouched)', () => {
    // A tight 5-cluster, all within jumpRange of each other. Without the coverage
    // preference two forks would re-bounce the same few; here they fan out to all 5.
    const cluster = [
      createEnemy(EnemyKind.drone, ORIGIN),
      createEnemy(EnemyKind.drone, { x: ORIGIN.x + 35, y: ORIGIN.y }),
      createEnemy(EnemyKind.drone, { x: ORIGIN.x, y: ORIGIN.y + 35 }),
      createEnemy(EnemyKind.drone, { x: ORIGIN.x + 35, y: ORIGIN.y + 35 }),
      createEnemy(EnemyKind.drone, { x: ORIGIN.x + 18, y: ORIGIN.y + 18 }),
    ]
    const { hits } = resolveChain(ORIGIN, cluster, arc({ forks: 2, depth: 2, jumpRange: 140 }))
    expect(new Set(hits.map((h) => h.id)).size).toBe(5)
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

  it('stacks overlapping fork hits into combined damage on a clustered enemy', () => {
    const cluster = [
      createEnemy(EnemyKind.tank, ORIGIN),
      createEnemy(EnemyKind.tank, { x: ORIGIN.x + 40, y: ORIGIN.y }),
      createEnemy(EnemyKind.tank, { x: ORIGIN.x, y: ORIGIN.y + 40 }),
    ]
    // 3 forks, depth 2, no falloff → each tank is struck 3× for 10 = 30 total.
    const result = chainArcEffect.tick(
      arc({ forks: 3, depth: 2, damage: 10, falloff: 1, jumpRange: 140 }),
      ctx(cluster)
    )
    const struck = result.enemies.find((e) => e.id === cluster[0].id)!
    expect(cluster[0].hp - struck.hp).toBe(30)
  })
})
