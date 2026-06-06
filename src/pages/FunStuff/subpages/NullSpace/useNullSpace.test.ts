import { describe, it, expect } from 'vitest'
import { renderHook, act } from '@testing-library/react'
import { abilityKindForHotkey, useNullSpace } from './useNullSpace'
import { createRef } from 'react'
import { createAbilities } from './engine/entities/entity-creator'
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
    expect(typeof result.current.handleSuspendTime).toBe('function')
    expect(typeof result.current.handleResumeTime).toBe('function')
    expect(typeof result.current.handleUseSpaceMetalAbility).toBe('function')
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

  it('suspending then resuming game time leaves the phase playing', () => {
    const canvasRef = createRef<HTMLCanvasElement>()
    const { result } = renderHook(() => useNullSpace(canvasRef))

    act(() => result.current.handleStart())
    act(() => result.current.handleSelectShip(ShipKind.fighter))
    expect(result.current.uiState.phase).toBe(GamePhase.playing)

    // Suspend halts the clock without flipping GamePhase (used by the help
    // modal so it replaces, not stacks with, the regular paused screen).
    act(() => result.current.handleSuspendTime())
    expect(result.current.uiState.phase).toBe(GamePhase.playing)

    act(() => result.current.handleResumeTime())
    expect(result.current.uiState.phase).toBe(GamePhase.playing)
  })

  it('resuming game time when not suspended is a no-op', () => {
    const canvasRef = createRef<HTMLCanvasElement>()
    const { result } = renderHook(() => useNullSpace(canvasRef))

    act(() => result.current.handleStart())
    act(() => result.current.handleSelectShip(ShipKind.fighter))

    // Never suspended — resuming should neither throw nor change phase.
    act(() => result.current.handleResumeTime())
    expect(result.current.uiState.phase).toBe(GamePhase.playing)
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

  it('selects abilities by hotkey position, in unlock order', () => {
    // When everything unlocks in WEAPON_ORDER, hotkey i maps to WEAPON_ORDER[i-1].
    expect(abilities.map((a) => a.kind)).toEqual([...WEAPON_ORDER])
    const unlocked = abilities.map((a, i) => ({ ...a, unlocked: true, unlockedAt: i }))
    for (let i = 0; i < WEAPON_ORDER.length; i++) {
      expect(abilityKindForHotkey(unlocked, String(i + 1))).toBe(WEAPON_ORDER[i])
    }
  })

  it('hotkeys reflect unlock order, not WEAPON_ORDER, when unlocks happen out of order', () => {
    // meteorite (always 0), then black hole second (1), then rocket third (2).
    const reordered = abilities.map((a) => {
      if (a.kind === AbilityKind.meteorite) return { ...a, unlocked: true, unlockedAt: 0 }
      if (a.kind === AbilityKind.blackHole) return { ...a, unlocked: true, unlockedAt: 1 }
      if (a.kind === AbilityKind.rocket) return { ...a, unlocked: true, unlockedAt: 2 }
      return { ...a, unlocked: false, unlockedAt: null }
    })
    expect(abilityKindForHotkey(reordered, '1')).toBe(AbilityKind.meteorite)
    expect(abilityKindForHotkey(reordered, '2')).toBe(AbilityKind.blackHole)
    expect(abilityKindForHotkey(reordered, '3')).toBe(AbilityKind.rocket)
    expect(abilityKindForHotkey(reordered, '4')).toBeNull()
  })

  it('returns null for a locked ability slot', () => {
    // Only meteorite is unlocked — slot 2 is empty.
    expect(abilityKindForHotkey(abilities, '2')).toBeNull()
  })

  it('returns null for out-of-range, zero, and non-numeric keys', () => {
    expect(abilityKindForHotkey(abilities, '0')).toBeNull()
    expect(abilityKindForHotkey(abilities, '9')).toBeNull()
    expect(abilityKindForHotkey(abilities, 'a')).toBeNull()
    expect(abilityKindForHotkey(abilities, ' ')).toBeNull()
  })
})
