import type { GameState } from '../types'
import type { IconName } from '../../icon-names'

export const SpaceMetalAbilityKind = {
  shieldRegen: 'shieldRegen',
  escapeDash: 'escapeDash',
  repulse: 'repulse',
  cometStorm: 'cometStorm',
} as const
export type SpaceMetalAbilityKind =
  (typeof SpaceMetalAbilityKind)[keyof typeof SpaceMetalAbilityKind]

// The subset of HUD state each ability needs to decide if its button is
// enabled. Lets the HUD ask `ability.canUse(uiState)` without a per-kind
// switch, so a new ability stays a pure registry addition.
export type SpaceMetalAbilityUIState = {
  spaceMetal: number
  shipShield: number
  shipMaxShield: number
  escapeModeActive: boolean
}

export type SpaceMetalAbility = {
  kind: SpaceMetalAbilityKind
  meta: { icon: IconName; label: string }
  cost: number
  // Single uppercase character (e.g. 'F'). Matched against
  // e.key.toUpperCase() in the global keyboard handler.
  hotkey: string
  // Authoritative engine guard — runs on every activation (HUD click + hotkey).
  canActivate: (state: GameState) => boolean
  // HUD-only mirror of canActivate over the projected UI state, for the button
  // disabled flag. Lives beside canActivate so the two can't silently drift.
  canUse: (ui: SpaceMetalAbilityUIState) => boolean
  activate: (state: GameState) => GameState
}
