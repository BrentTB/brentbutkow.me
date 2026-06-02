import { describe, it, expect } from 'vitest'
import { renderHook } from '@testing-library/react'
import { abilityKindForHotkey, useNullSpace } from './useNullSpace'
import { createRef } from 'react'
import { createAbilities } from './engine/entities'
import { AbilityKind, GamePhase } from './engine/types'

describe('useNullSpace', () => {
  it('starts in menu phase with a null canvas ref', () => {
    const canvasRef = createRef<HTMLCanvasElement>()
    const { result } = renderHook(() => useNullSpace(canvasRef))
    expect(result.current.uiState.phase).toBe(GamePhase.menu)
    expect(result.current.uiState.score).toBe(0)
    expect(result.current.uiState.wave).toBe(0)
    expect(result.current.uiState.currency).toBe(0)
    expect(result.current.uiState.selectedAbility).toBe(AbilityKind.meteorite)
  })

  it('exposes action callbacks', () => {
    const canvasRef = createRef<HTMLCanvasElement>()
    const { result } = renderHook(() => useNullSpace(canvasRef))
    expect(typeof result.current.handleStart).toBe('function')
    expect(typeof result.current.handleNextWave).toBe('function')
    expect(typeof result.current.handleRestart).toBe('function')
    expect(typeof result.current.setSelectedAbility).toBe('function')
    expect(typeof result.current.handlePurchaseUpgrade).toBe('function')
    expect(typeof result.current.handleFinishUpgrades).toBe('function')
  })
})

describe('abilityKindForHotkey', () => {
  const abilities = createAbilities()

  it('selects abilities by hotkey position, matching the power-cost order', () => {
    // createAbilities() sorts ascending: meteorite (5) → meteor (40) → black hole (50)
    expect(abilities.map((a) => a.kind)).toEqual([
      AbilityKind.meteorite,
      AbilityKind.meteor,
      AbilityKind.blackHole,
    ])
    const unlocked = abilities.map((a) => ({ ...a, unlocked: true }))
    expect(abilityKindForHotkey(unlocked, '1')).toBe(AbilityKind.meteorite)
    expect(abilityKindForHotkey(unlocked, '2')).toBe(AbilityKind.meteor)
    expect(abilityKindForHotkey(unlocked, '3')).toBe(AbilityKind.blackHole)
  })

  it('returns null for a locked ability', () => {
    // Only the meteorite starts unlocked.
    expect(abilities[1].unlocked).toBe(false)
    expect(abilityKindForHotkey(abilities, '2')).toBeNull()
  })

  it('returns null for out-of-range, zero, and non-numeric keys', () => {
    expect(abilityKindForHotkey(abilities, '0')).toBeNull()
    expect(abilityKindForHotkey(abilities, '9')).toBeNull()
    expect(abilityKindForHotkey(abilities, 'a')).toBeNull()
    expect(abilityKindForHotkey(abilities, ' ')).toBeNull()
  })
})
