import { describe, it, expect, afterEach } from 'vitest'
import { render, cleanup } from '@testing-library/react'
import { Abilities } from './Abilities'
import { AbilityKind } from '../../engine/types'
import type { Ability } from '../../engine/types'
import type { GameUIState } from '../../useNullSpace'

function makeAbility(overrides: Partial<Ability> = {}): Ability {
  return {
    kind: AbilityKind.meteorite,
    cooldown: 4,
    cooldownRemaining: 0,
    powerCost: 50,
    damage: 10,
    aoeRadius: 40,
    unlocked: true,
    unlockedAt: 0,
    ...overrides,
  }
}

function renderBar(ability: Ability, power: number) {
  const uiState = {
    abilities: [ability],
    ultimatesOwned: [],
    selectedAbility: null,
    power,
  } as unknown as GameUIState
  return render(<Abilities uiState={uiState} onAbilitySelect={() => {}} />)
}

// The affordability dim is the only overlay carrying an inline opacity, so it's
// uniquely queryable apart from the cooldown overlay (height-only).
const affordDim = (c: HTMLElement) => c.querySelector('[style*="opacity"]')

describe('Abilities', () => {
  afterEach(cleanup)

  it('does not dim an ability that is ready and affordable', () => {
    const { container } = renderBar(makeAbility({ cooldownRemaining: 0 }), 80)
    expect(affordDim(container)).toBeNull()
  })

  it('dims an unaffordable ability that is off cooldown', () => {
    const { container } = renderBar(makeAbility({ cooldownRemaining: 0 }), 10)
    expect(affordDim(container)).not.toBeNull()
  })

  // Regression: the unaffordable dim used to be gated on `!onCooldown`, so an
  // ability you couldn't afford only darkened AFTER it finished recharging.
  // Affordability is independent of cooldown — it must dim the whole time.
  it('dims an unaffordable ability while it is still recharging', () => {
    const { container } = renderBar(makeAbility({ cooldownRemaining: 2 }), 10)
    expect(affordDim(container)).not.toBeNull()
  })
})
