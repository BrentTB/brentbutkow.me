import { describe, it, expect } from 'vitest'
import { createInitialState } from './game-loop'
import {
  canPurchaseUltimate,
  purchaseUltimate,
  ultimateShardCost,
  isBaseReplacedByUltimate,
} from './ultimates'
import { ULTIMATE_DEFINITIONS } from './abilities'
import { AbilityKind } from './types'
import type { GameState } from './types'

const METEORITE_ULT = ULTIMATE_DEFINITIONS[AbilityKind.meteorite]!
const METEOR_ULT = ULTIMATE_DEFINITIONS[AbilityKind.meteor]!

// Meteorite starts unlocked; flush the wallet so affordability isn't the gate.
function richState(): GameState {
  return { ...createInitialState(), currency: 1000, spaceMetal: 100, singularityShard: 5 }
}

function unlockMeteor(state: GameState): GameState {
  return {
    ...state,
    abilities: state.abilities.map((a) =>
      a.kind === AbilityKind.meteor ? { ...a, unlocked: true } : a
    ),
  }
}

describe('ultimateShardCost', () => {
  it('escalates with the number already owned (1 → 2 → 3)', () => {
    expect(ultimateShardCost([])).toBe(1)
    expect(ultimateShardCost([AbilityKind.cometShower])).toBe(2)
    expect(ultimateShardCost([AbilityKind.cometShower, AbilityKind.meteorShower])).toBe(3)
  })
})

describe('purchaseUltimate', () => {
  it('deducts all three currencies and records the ultimate as owned', () => {
    const res = purchaseUltimate(richState(), AbilityKind.meteorite)
    expect(res.currency).toBe(1000 - METEORITE_ULT.cost.stardust)
    expect(res.spaceMetal).toBe(100 - METEORITE_ULT.cost.spaceMetal)
    expect(res.singularityShard).toBe(5 - 1)
    expect(res.ultimatesOwned).toEqual([AbilityKind.cometShower])
  })

  it('charges escalating shards — the second ultimate costs 2', () => {
    const first = purchaseUltimate(richState(), AbilityKind.meteorite)
    const second = purchaseUltimate(unlockMeteor(first), AbilityKind.meteor)
    expect(second.singularityShard).toBe(first.singularityShard - 2)
    expect(second.ultimatesOwned).toEqual([AbilityKind.cometShower, AbilityKind.meteorShower])
  })

  it('is a no-op when the base ability is locked', () => {
    const s = richState() // meteor is locked
    expect(canPurchaseUltimate(s, AbilityKind.meteor)).toBe(false)
    expect(purchaseUltimate(s, AbilityKind.meteor)).toBe(s)
  })

  it('is a no-op when already owned', () => {
    const res = purchaseUltimate(richState(), AbilityKind.meteorite)
    expect(purchaseUltimate(res, AbilityKind.meteorite)).toBe(res)
  })

  it('blocks on insufficient stardust, space metal, or shards independently', () => {
    expect(canPurchaseUltimate({ ...richState(), currency: 0 }, AbilityKind.meteorite)).toBe(false)
    expect(canPurchaseUltimate({ ...richState(), spaceMetal: 0 }, AbilityKind.meteorite)).toBe(
      false
    )
    expect(
      canPurchaseUltimate({ ...richState(), singularityShard: 0 }, AbilityKind.meteorite)
    ).toBe(false)
  })

  it('succeeds at the exact shard boundary (shards === cost)', () => {
    const s = { ...richState(), singularityShard: 1 }
    expect(canPurchaseUltimate(s, AbilityKind.meteorite)).toBe(true)
  })

  // The buy-button gate (canPurchaseUltimate) and the purchase must evaluate the
  // SAME custom prerequisite — otherwise a met-cost-but-prerequisite-failed
  // ultimate shows an enabled button that silently no-ops on click.
  it('a failing custom prerequisite blocks both the gate and the purchase', () => {
    const def = ULTIMATE_DEFINITIONS[AbilityKind.meteorite]!
    const original = def.prerequisite
    def.prerequisite = () => false
    try {
      const s = richState()
      expect(canPurchaseUltimate(s, AbilityKind.meteorite)).toBe(false)
      expect(purchaseUltimate(s, AbilityKind.meteorite)).toBe(s)
    } finally {
      def.prerequisite = original
    }
  })

  it('a met custom prerequisite still allows an otherwise-affordable purchase', () => {
    const def = ULTIMATE_DEFINITIONS[AbilityKind.meteorite]!
    const original = def.prerequisite
    def.prerequisite = () => true
    try {
      expect(canPurchaseUltimate(richState(), AbilityKind.meteorite)).toBe(true)
    } finally {
      def.prerequisite = original
    }
  })
})

describe('isBaseReplacedByUltimate', () => {
  it('hides a base whose ultimate is owned', () => {
    expect(isBaseReplacedByUltimate(AbilityKind.meteorite, [AbilityKind.cometShower])).toBe(true)
  })

  it('shows the base when no ultimate is owned', () => {
    expect(isBaseReplacedByUltimate(AbilityKind.meteorite, [])).toBe(false)
  })

  it('never hides an unrelated ability', () => {
    expect(isBaseReplacedByUltimate(AbilityKind.rocket, [AbilityKind.cometShower])).toBe(false)
  })
})

describe('METEOR_ULT cost wiring', () => {
  it('exposes a distinct stardust/space-metal cost', () => {
    expect(METEOR_ULT.cost.stardust).toBeGreaterThan(0)
    expect(METEOR_ULT.cost.spaceMetal).toBeGreaterThan(0)
  })
})
