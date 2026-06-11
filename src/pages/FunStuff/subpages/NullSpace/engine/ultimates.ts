import { ULTIMATE_DEFINITIONS, ULTIMATE_KIND_OF } from './abilities'
import type { AbilityKind, GameState } from './types'

// While false, owning an ultimate hides its base in the hotbar/shop
// (replacement). Flip to true to show base + ultimate side by side
// (coexistence) — no data changes needed, just the view.
export const COEXIST_ULTIMATES = false

// Affordability/ownership context — the structural subset both GameState and
// GameUIState satisfy, so the shop and the engine share one predicate.
export type UltimateContext = Pick<
  GameState,
  'currency' | 'spaceMetal' | 'singularityShard' | 'ultimatesOwned' | 'abilities'
>

// The Nth ultimate bought this run costs N shards (N = already-owned + 1).
export function ultimateShardCost(ultimatesOwned: AbilityKind[]): number {
  return ultimatesOwned.length + 1
}

// Default prerequisite — the base ability must be unlocked. Custom prerequisites
// (which need the full GameState) are checked separately in purchaseUltimate.
function isBaseUnlocked(ctx: UltimateContext, baseKind: AbilityKind): boolean {
  return ctx.abilities.find((a) => a.kind === baseKind)?.unlocked ?? false
}

// True when the base ability's ultimate can be bought right now: not already
// owned, base unlocked, and all three currencies cover the cost.
export function canPurchaseUltimate(ctx: UltimateContext, baseKind: AbilityKind): boolean {
  const def = ULTIMATE_DEFINITIONS[baseKind]
  if (!def) return false
  if (ctx.ultimatesOwned.includes(def.kind)) return false
  if (!isBaseUnlocked(ctx, baseKind)) return false
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
  if (def.prerequisite && !def.prerequisite(state)) return state
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
