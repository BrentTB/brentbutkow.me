import type { GameState } from '../types'

export const SpaceMetalAbilityKind = {
  shieldRegen: 'shieldRegen',
  escapeDash: 'escapeDash',
} as const
export type SpaceMetalAbilityKind =
  (typeof SpaceMetalAbilityKind)[keyof typeof SpaceMetalAbilityKind]

export type SpaceMetalAbility = {
  kind: SpaceMetalAbilityKind
  meta: { icon: string; label: string }
  cost: number
  // Single uppercase character (e.g. 'F'). Matched against
  // e.key.toUpperCase() in the global keyboard handler.
  hotkey: string
  canActivate: (state: GameState) => boolean
  activate: (state: GameState) => GameState
}
