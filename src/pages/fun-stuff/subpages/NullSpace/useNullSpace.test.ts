import { describe, it, expect } from 'vitest'
import { renderHook, act } from '@testing-library/react'
import { abilityKindForHotkey, useNullSpace } from './useNullSpace'
import { createRef } from 'react'
import { createAbilities } from './engine/entities/entityCreator'
import { AbilityKind, GamePhase, ShipKind } from './engine/types'
import { WEAPON_ORDER } from './data'

describe('useNullSpace', () => {
  it('starts in menu phase with a null canvas ref', () => {
    const canvasRef = createRef<HTMLCanvasElement>()
    const { result } = renderHook(() => useNullSpace(canvasRef))
    expect(result.current.uiState.phase).toBe(GamePhase.menu)
    expect(result.current.uiState.score).toBe(0)
    expect(result.current.uiState.wave).toBe(0)
    expect(result.current.uiState.currency).toBe(0)
    expect(result.current.uiState.spaceMetal).toBe(0)
    expect(result.current.uiState.selectedAbility).toBe(AbilityKind.meteorite)
  })

  it('exposes action callbacks', () => {
    const canvasRef = createRef<HTMLCanvasElement>()
    const { result } = renderHook(() => useNullSpace(canvasRef))
    expect(typeof result.current.handleStart).toBe('function')
    expect(typeof result.current.handleSelectShip).toBe('function')
    expect(typeof result.current.handleNextWave).toBe('function')
    expect(typeof result.current.handleRestart).toBe('function')
    expect(typeof result.current.setSelectedAbility).toBe('function')
    expect(typeof result.current.handlePurchaseUpgrade).toBe('function')
    expect(typeof result.current.handleFinishUpgrades).toBe('function')
    expect(typeof result.current.handlePause).toBe('function')
    expect(typeof result.current.handleResume).toBe('function')
    expect(typeof result.current.handleSetSpeed).toBe('function')
    expect(typeof result.current.handleUseSpaceMetalShield).toBe('function')
  })

  it('pauses and resumes a playing game', () => {
    const canvasRef = createRef<HTMLCanvasElement>()
    const { result } = renderHook(() => useNullSpace(canvasRef))

    act(() => result.current.handleStart())
    expect(result.current.uiState.phase).toBe(GamePhase.shipSelection)
    act(() => result.current.handleSelectShip(ShipKind.fighter))
    expect(result.current.uiState.phase).toBe(GamePhase.playing)

    act(() => result.current.handlePause())
    expect(result.current.uiState.phase).toBe(GamePhase.paused)

    act(() => result.current.handleResume())
    expect(result.current.uiState.phase).toBe(GamePhase.playing)
  })

  it('pause is a no-op outside the playing phase', () => {
    const canvasRef = createRef<HTMLCanvasElement>()
    const { result } = renderHook(() => useNullSpace(canvasRef))

    // Still in the menu — pausing should not flip the phase.
    act(() => result.current.handlePause())
    expect(result.current.uiState.phase).toBe(GamePhase.menu)
  })

  it('setting the game speed does not crash or change phase', () => {
    const canvasRef = createRef<HTMLCanvasElement>()
    const { result } = renderHook(() => useNullSpace(canvasRef))

    act(() => result.current.handleStart())
    act(() => result.current.handleSelectShip(ShipKind.fighter))
    act(() => result.current.handleSetSpeed(2))
    expect(result.current.uiState.phase).toBe(GamePhase.playing)
  })
})

describe('abilityKindForHotkey', () => {
  const abilities = createAbilities()

  it('selects abilities by hotkey position, matching WEAPON_ORDER', () => {
    // Hotkey i maps to position (i-1) in the abilities array, which mirrors WEAPON_ORDER.
    expect(abilities.map((a) => a.kind)).toEqual([...WEAPON_ORDER])
    const unlocked = abilities.map((a) => ({ ...a, unlocked: true }))
    for (let i = 0; i < WEAPON_ORDER.length; i++) {
      expect(abilityKindForHotkey(unlocked, String(i + 1))).toBe(WEAPON_ORDER[i])
    }
  })

  it('returns null for a locked ability', () => {
    const locked = abilities.map((a) =>
      a.kind === AbilityKind.meteorite ? { ...a, unlocked: true } : { ...a, unlocked: false }
    )
    expect(abilityKindForHotkey(locked, '2')).toBeNull()
  })

  it('returns null for out-of-range, zero, and non-numeric keys', () => {
    expect(abilityKindForHotkey(abilities, '0')).toBeNull()
    expect(abilityKindForHotkey(abilities, '9')).toBeNull()
    expect(abilityKindForHotkey(abilities, 'a')).toBeNull()
    expect(abilityKindForHotkey(abilities, ' ')).toBeNull()
  })
})
