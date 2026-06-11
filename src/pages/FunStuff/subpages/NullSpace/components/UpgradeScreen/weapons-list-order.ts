import { WEAPON_ORDER } from '../../data'
import { isBaseReplacedByUltimate } from '../../engine/ultimates'
import type { Ability, AbilityKind } from '../../engine/types'

// Shop ordering rule: unlocked weapons first (in unlock order, hotkey 1 → N),
// then offered-but-locked weapons at the bottom (canonical WEAPON_ORDER as the
// tiebreaker). Locked + not offered stay hidden. A base whose ultimate is owned
// is hidden — its ultimate row takes the slot instead.
export function orderWeaponsForShop(
  abilities: Ability[],
  offers: readonly AbilityKind[],
  ultimatesOwned: AbilityKind[] = []
): AbilityKind[] {
  const byKind = new Map(abilities.map((a) => [a.kind, a]))
  const unlocked = abilities
    .filter((a) => a.unlocked && !isBaseReplacedByUltimate(a.kind, ultimatesOwned))
    .sort((a, b) => (a.unlockedAt ?? 0) - (b.unlockedAt ?? 0))
    .map((a) => a.kind)
  const offered = WEAPON_ORDER.filter((kind) => {
    const ability = byKind.get(kind)
    if (!ability) return false
    return !ability.unlocked && offers.includes(kind)
  })
  return [...unlocked, ...offered]
}
