import { ULTIMATE_DEFINITIONS, ULTIMATE_KIND_OF, type UltimateContext } from './abilities'
import type { AbilityKind, GameState } from './types'

// While false, owning an ultimate hides its base in the hotbar/shop
// (replacement). Flip to true to show base + ultimate side by side
// (coexistence) — no data changes needed, just the view.
const COEXIST_ULTIMATES = false

// The Nth ultimate bought this run costs N shards (N = already-owned + 1).
export function ultimateShardCost(ultimatesOwned: AbilityKind[]): number {
  return ultimatesOwned.length + 1
}

// Default prerequisite — the base ability must be unlocked.
function isBaseUnlocked(ctx: UltimateContext, baseKind: AbilityKind): boolean {
  return ctx.abilities.find((a) => a.kind === baseKind)?.unlocked ?? false
}

// True when the base ability's ultimate can be bought right now: not already
// owned, base unlocked, any custom prerequisite met, and all three currencies
// cover the cost. The single gate both the buy-button and purchaseUltimate use.
export function canPurchaseUltimate(ctx: UltimateContext, baseKind: AbilityKind): boolean {
  const def = ULTIMATE_DEFINITIONS[baseKind]
  if (!def) return false
  if (ctx.ultimatesOwned.includes(def.kind)) return false
  if (!isBaseUnlocked(ctx, baseKind)) return false
  if (def.prerequisite && !def.prerequisite(ctx)) return false
  const shardCost = ultimateShardCost(ctx.ultimatesOwned)
  return (
    ctx.currency >= def.cost.stardust &&
    ctx.spaceMetal >= def.cost.spaceMetal &&
    ctx.singularityShard >= shardCost
  )
}

// Deducts all three currencies and records the ultimate as owned. No-op when
// the purchase isn't currently allowed (gate fails / unaffordable / owned).
export function purchaseUltimate(state: GameState, baseKind: AbilityKind): GameState {
  const def = ULTIMATE_DEFINITIONS[baseKind]
  if (!def) return state
  if (!canPurchaseUltimate(state, baseKind)) return state
  const shardCost = ultimateShardCost(state.ultimatesOwned)
  return {
    ...state,
    currency: state.currency - def.cost.stardust,
    spaceMetal: state.spaceMetal - def.cost.spaceMetal,
    singularityShard: state.singularityShard - shardCost,
    ultimatesOwned: [...state.ultimatesOwned, def.kind],
  }
}

// True when `kind` is a base ability whose ultimate is owned and replacement
// mode is on — i.e. it should be hidden from the hotbar/shop.
export function isBaseReplacedByUltimate(
  kind: AbilityKind,
  ultimatesOwned: AbilityKind[]
): boolean {
  if (COEXIST_ULTIMATES) return false
  const ultimateKind = ULTIMATE_KIND_OF[kind]
  return ultimateKind !== undefined && ultimatesOwned.includes(ultimateKind)
}
