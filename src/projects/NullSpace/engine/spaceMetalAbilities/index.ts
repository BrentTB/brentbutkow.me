import type { GameState } from '../types'
import { shieldRegen } from './shield-regen'
import { escapeDash } from './escape-mode'
import { repulse } from './repulse'
import { cometStorm } from './comet-storm'
import type { SpaceMetalAbility, SpaceMetalAbilityKind } from './space-metal-ability-definition'

export { SpaceMetalAbilityKind, type SpaceMetalAbility } from './space-metal-ability-definition'

// Order here drives the right-side rail layout. New abilities can be added
// by registering them below — the HUD and keyboard handler pick them up.
export const SPACE_METAL_ABILITIES: SpaceMetalAbility[] = [
  shieldRegen,
  escapeDash,
  repulse,
  cometStorm,
]

const BY_KIND: Record<SpaceMetalAbilityKind, SpaceMetalAbility> = Object.fromEntries(
  SPACE_METAL_ABILITIES.map((a) => [a.kind, a])
) as Record<SpaceMetalAbilityKind, SpaceMetalAbility>

export function findSpaceMetalAbilityByKey(key: string): SpaceMetalAbility | null {
  const upper = key.toUpperCase()
  return SPACE_METAL_ABILITIES.find((a) => a.hotkey === upper) ?? null
}

export function tryActivateSpaceMetalAbility(
  state: GameState,
  kind: SpaceMetalAbilityKind
): GameState {
  const ability = BY_KIND[kind]
  if (!ability.canActivate(state)) return state
  return ability.activate(state)
}
