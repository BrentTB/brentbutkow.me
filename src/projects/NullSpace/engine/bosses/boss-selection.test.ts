import { describe, it, expect, beforeEach } from 'vitest'
import { createBossSelection, advanceBossSelection } from './boss-selection'
import { BOSS_KINDS } from './index'
import { EnemyKind } from '../types'
import type { BossSelection } from '../types'
import { rng } from '../math/random'

beforeEach(() => {
  rng.reseed(42)
})

describe('createBossSelection', () => {
  it('draws nextBoss from the registry and pools the rest', () => {
    const sel = createBossSelection()
    expect(BOSS_KINDS).toContain(sel.nextBoss)
    expect(sel.pool).toHaveLength(BOSS_KINDS.length - 1)
    expect(sel.pool).not.toContain(sel.nextBoss)
  })
})

describe('advanceBossSelection — unique window', () => {
  it('the first n draws cover every registered boss exactly once', () => {
    let sel = createBossSelection()
    const drawn = [sel.nextBoss]
    for (let i = 1; i < BOSS_KINDS.length; i++) {
      sel = advanceBossSelection(sel)
      drawn.push(sel.nextBoss)
    }
    expect(new Set(drawn).size).toBe(BOSS_KINDS.length)
    expect(drawn.slice().sort()).toEqual([...BOSS_KINDS].sort())
    expect(sel.pool).toHaveLength(0)
  })

  it('after the pool empties, draws stay uniform over the registry', () => {
    let sel = createBossSelection()
    for (let i = 1; i < BOSS_KINDS.length; i++) sel = advanceBossSelection(sel)

    const seen = new Set<EnemyKind>()
    for (let i = 0; i < 60; i++) {
      sel = advanceBossSelection(sel)
      expect(BOSS_KINDS).toContain(sel.nextBoss)
      expect(sel.pool).toHaveLength(0)
      seen.add(sel.nextBoss)
    }
    // 60 uniform draws over 3 kinds hit every kind (P(miss) ≈ 0 at seed 42).
    expect(seen.size).toBe(BOSS_KINDS.length)
  })

  // A dev override can set nextBoss to a kind still waiting in the pool; once
  // that wave consumes it, the kind must not be drawn again inside the window.
  it('prunes an overridden nextBoss from the pool so it cannot repeat early', () => {
    const overridden: EnemyKind = EnemyKind.voidWorm
    let sel: BossSelection = {
      nextBoss: overridden,
      pool: [overridden, EnemyKind.dreadnought, EnemyKind.phaseShifter],
    }
    const drawn: EnemyKind[] = []
    while (sel.pool.length > 0) {
      sel = advanceBossSelection(sel)
      drawn.push(sel.nextBoss)
    }
    expect(drawn).not.toContain(overridden)
    expect(drawn.slice().sort()).toEqual([EnemyKind.dreadnought, EnemyKind.phaseShifter].sort())
  })
})
