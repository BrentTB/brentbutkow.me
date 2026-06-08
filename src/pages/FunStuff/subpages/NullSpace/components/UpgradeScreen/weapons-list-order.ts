import { WEAPON_ORDER } from '../../data'
import type { Ability, AbilityKind } from '../../engine/types'

// Shop ordering rule: unlocked weapons first (in unlock order, hotkey 1 → N),
// then offered-but-locked weapons at the bottom (canonical WEAPON_ORDER as the
// tiebreaker). Locked + not offered stay hidden.
export function orderWeaponsForShop(
  abilities: Ability[],
  offers: readonly AbilityKind[]
): AbilityKind[] {
  const byKind = new Map(abilities.map((a) => [a.kind, a]))
  const unlocked = abilities
    .filter((a) => a.unlocked && a.unlockedAt !== null)
    .sort((a, b) => (a.unlockedAt ?? 0) - (b.unlockedAt ?? 0))
    .map((a) => a.kind)
  const offered = WEAPON_ORDER.filter((kind) => {
    const ability = byKind.get(kind)
    if (!ability) return false
    return !ability.unlocked && offers.includes(kind)
  })
  return [...unlocked, ...offered]
}
