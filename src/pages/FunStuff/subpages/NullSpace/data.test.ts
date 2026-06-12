import { describe, it, expect } from 'vitest'
import { WEAPON_ORDER } from './data'
import { AbilityKind } from './engine/types'

describe('WEAPON_ORDER', () => {
  // createAbilities() maps over WEAPON_ORDER, so a kind missing from it would
  // silently never get an ability row — TypeScript can't enforce an array
  // covering a union, hence this guard.
  it('contains every AbilityKind exactly once', () => {
    expect([...WEAPON_ORDER].sort()).toEqual(Object.values(AbilityKind).sort())
  })
})
