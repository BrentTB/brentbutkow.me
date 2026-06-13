import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { renderHook, act } from '@testing-library/react'
import {
  abilityKindForHotkey,
  getUnlockedAbilitiesInOrder,
  selectionAfterUltimatePurchase,
  useNullSpace,
} from './useNullSpace'
import { createRef } from 'react'
import { createAbilities } from './engine/entities/entity-creator'
import { BOSS_KINDS } from './engine/bosses/index'
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

  it('seeds nextBoss from the pre-rolled boss selection at mount, not a hardcoded default', () => {
    // Regression: the hook used to initialise uiState.nextBoss to a literal
    // EnemyKind.dreadnought, so the dev-console readout was misleading at
    // menu time even though the engine had already pre-rolled a random boss.
    const canvasRef = createRef<HTMLCanvasElement>()
    const { result } = renderHook(() => useNullSpace(canvasRef))
    expect(BOSS_KINDS).toContain(result.current.uiState.nextBoss)
  })

  it('exposes the pre-rolled next boss once a game starts', () => {
    const canvasRef = createRef<HTMLCanvasElement>()
    const { result } = renderHook(() => useNullSpace(canvasRef))
    act(() => {
      result.current.handleStart()
      result.current.handleSelectShip(ShipKind.fighter)
    })
    expect(BOSS_KINDS).toContain(result.current.uiState.nextBoss)
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

  it('an owned ultimate takes its base hotkey slot', () => {
    const owned = abilities.map((a) => {
      if (a.kind === AbilityKind.meteorite) return { ...a, unlocked: true, unlockedAt: 0 }
      if (a.kind === AbilityKind.cometShower) return { ...a, unlocked: true, unlockedAt: 0 }
      return a
    })
    expect(abilityKindForHotkey(owned, '1', [AbilityKind.cometShower])).toBe(
      AbilityKind.cometShower
    )
  })
})

describe('getUnlockedAbilitiesInOrder — ultimate replacement', () => {
  it('hides the base and surfaces the ultimate in its slot when owned', () => {
    const abilities = createAbilities().map((a) => {
      if (a.kind === AbilityKind.meteorite) return { ...a, unlocked: true, unlockedAt: 0 }
      if (a.kind === AbilityKind.cometShower) return { ...a, unlocked: true, unlockedAt: 0 }
      return a
    })
    const kinds = getUnlockedAbilitiesInOrder(abilities, [AbilityKind.cometShower]).map(
      (a) => a.kind
    )
    expect(kinds).toContain(AbilityKind.cometShower)
    expect(kinds).not.toContain(AbilityKind.meteorite)
  })

  it('keeps the base when its ultimate is not owned', () => {
    const abilities = createAbilities().map((a) =>
      a.kind === AbilityKind.meteorite ? { ...a, unlocked: true, unlockedAt: 0 } : a
    )
    const kinds = getUnlockedAbilitiesInOrder(abilities).map((a) => a.kind)
    expect(kinds).toContain(AbilityKind.meteorite)
    expect(kinds).not.toContain(AbilityKind.cometShower)
  })
})

describe('selectionAfterUltimatePurchase', () => {
  it('redirects selection to the ultimate when the purchased base was selected', () => {
    expect(selectionAfterUltimatePurchase(AbilityKind.meteorite, AbilityKind.meteorite, true)).toBe(
      AbilityKind.cometShower
    )
  })

  it('leaves selection alone when a different ability was selected', () => {
    expect(selectionAfterUltimatePurchase(AbilityKind.blackHole, AbilityKind.meteorite, true)).toBe(
      AbilityKind.blackHole
    )
  })

  it('leaves selection alone when the purchase did not go through', () => {
    expect(
      selectionAfterUltimatePurchase(AbilityKind.meteorite, AbilityKind.meteorite, false)
    ).toBe(AbilityKind.meteorite)
  })

  it('leaves selection alone for an ability with no ultimate', () => {
    // cometShower is itself an ultimate — ULTIMATE_KIND_OF lookup is undefined.
    expect(
      selectionAfterUltimatePurchase(AbilityKind.cometShower, AbilityKind.cometShower, true)
    ).toBe(AbilityKind.cometShower)
  })
})

describe('useNullSpace — slingshot', () => {
  it('exposes neutral slingshot heat on a fresh game', () => {
    const canvasRef = createRef<HTMLCanvasElement>()
    const { result } = renderHook(() => useNullSpace(canvasRef))
    expect(result.current.uiState.slingHeat).toBe(0)
    expect(result.current.uiState.slingOverheated).toBe(false)
  })

  // The flick gesture only reaches the engine through the render loop, which
  // needs a live canvas — stub just enough of the browser drawing surface to
  // run it under jsdom, then step the loop by hand.
  describe('flick gesture (live render loop)', () => {
    let frame: ((t: number) => void) | null = null
    let canvas: HTMLCanvasElement

    beforeEach(() => {
      frame = null
      const gradient = { addColorStop: () => {} }
      const ctx = new Proxy(
        {},
        {
          get: (_t, prop) => {
            if (prop === 'createRadialGradient' || prop === 'createLinearGradient')
              return () => gradient
            if (prop === 'canvas') return { width: 0, height: 0 }
            return () => {}
          },
          set: () => true,
        }
      ) as unknown as CanvasRenderingContext2D

      vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockReturnValue(ctx)
      vi.stubGlobal(
        'OffscreenCanvas',
        class {
          getContext() {
            return ctx
          }
        }
      )
      vi.stubGlobal(
        'ResizeObserver',
        class {
          observe() {}
          unobserve() {}
          disconnect() {}
        }
      )
      // Capture each scheduled frame instead of running it, so a test can step
      // the loop deterministically.
      vi.stubGlobal('requestAnimationFrame', (cb: (t: number) => void) => {
        frame = cb
        return 1
      })
      vi.stubGlobal('cancelAnimationFrame', () => {})

      canvas = document.createElement('canvas')
      const parent = document.createElement('div')
      parent.appendChild(canvas)
      document.body.appendChild(parent)
    })

    afterEach(() => {
      vi.restoreAllMocks()
      vi.unstubAllGlobals()
      document.body.innerHTML = ''
    })

    const step = (t: number) => act(() => frame?.(t))
    const pointer = (target: EventTarget, type: string, x: number, y: number) =>
      target.dispatchEvent(new MouseEvent(type, { clientX: x, clientY: y }))

    const startPlaying = (result: { current: ReturnType<typeof useNullSpace> }) => {
      act(() => result.current.handleStart())
      act(() => result.current.handleSelectShip(ShipKind.fighter))
      step(0) // first tick is dt=0 — just initializes game time
    }

    it('a drag-release off the ship builds slingshot heat', () => {
      const canvasRef = { current: canvas }
      const { result } = renderHook(() => useNullSpace(canvasRef))
      startPlaying(result)

      // Screen origin maps to the ship under the centered camera, so this grabs
      // the ship, drags 100px, and releases into a flick.
      pointer(canvas, 'pointerdown', 0, 0)
      pointer(canvas, 'pointermove', 100, 0)
      pointer(window, 'pointerup', 100, 0)
      step(16) // consume the queued flick

      expect(result.current.uiState.slingHeat).toBeGreaterThan(0)
      expect(result.current.uiState.slingOverheated).toBe(false)
    })

    // Regression: a press on the ship used to be swallowed by the slingshot
    // grab, making enemies near the ship untargetable. A sub-threshold release
    // must fall through to a normal ability tap (and never fling).
    it('a tap on the ship (no drag) fires the selected ability instead of flinging', () => {
      const canvasRef = { current: canvas }
      const { result } = renderHook(() => useNullSpace(canvasRef))
      startPlaying(result)

      const powerBefore = result.current.uiState.power
      pointer(canvas, 'pointerdown', 0, 0)
      pointer(window, 'pointerup', 0, 0)
      step(16) // consume the queued tap

      expect(result.current.uiState.slingHeat).toBe(0)
      // The starting meteorite costs power — proof the tap reached the resolver.
      expect(result.current.uiState.power).toBeLessThan(powerBefore)
    })

    // Regression: releasing a grab after a pause must NOT queue a flick that
    // fires on resume. Without the phase guard in handlePointerUp it leaks.
    it('discards a flick released while paused', () => {
      const canvasRef = { current: canvas }
      const { result } = renderHook(() => useNullSpace(canvasRef))
      startPlaying(result)

      pointer(canvas, 'pointerdown', 0, 0)
      pointer(canvas, 'pointermove', 100, 0)
      act(() => result.current.handlePause())
      pointer(window, 'pointerup', 100, 0)
      act(() => result.current.handleResume())
      step(16)

      expect(result.current.uiState.slingHeat).toBe(0)
    })

    // Regression: restarting from the (paused) pause menu used to leave the game
    // clock paused, so after picking a ship the new game never advanced (dt=0).
    it('restarting from a paused game resumes the clock so the new game advances', () => {
      const canvasRef = { current: canvas }
      const { result } = renderHook(() => useNullSpace(canvasRef))
      startPlaying(result)

      act(() => result.current.handlePause())
      act(() => result.current.handleRestart()) // → ship selection
      act(() => result.current.handleSelectShip(ShipKind.fighter)) // → playing
      expect(result.current.uiState.phase).toBe(GamePhase.playing)

      step(0) // initialise the clock
      const powerStart = result.current.uiState.power
      step(60)
      step(120)
      // Power only regenerates when dt > 0 — proof the clock un-paused.
      expect(result.current.uiState.power).toBeGreaterThan(powerStart)
    })

    // enemiesAlive mirrors the live enemy count (state.enemies.length), not a
    // static value — the HUD sector bar reads it to size the kill progress.
    it('exposes the live enemy count once a wave starts spawning', () => {
      const canvasRef = { current: canvas }
      const { result } = renderHook(() => useNullSpace(canvasRef))
      startPlaying(result)

      step(16) // wave 1 has no spawn delay — at least one enemy is on the field
      const { enemiesAlive, totalWaveEnemies } = result.current.uiState
      expect(enemiesAlive).toBeGreaterThan(0)
      expect(enemiesAlive).toBeLessThanOrEqual(totalWaveEnemies)
    })
  })
})
