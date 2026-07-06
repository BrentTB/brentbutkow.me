import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { renderHook, act } from '@testing-library/react'
import {
  abilityKindForHotkey,
  getUnlockedAbilitiesInOrder,
  selectionAfterUltimatePurchase,
  shouldSyncUI,
  useNullSpace,
} from './useNullSpace'
import { createRef } from 'react'
import { createAbilities } from './engine/abilities'
import { BOSS_KINDS } from './engine/bosses'
import { AbilityKind, GamePhase, ShipKind } from './engine/types'
import { TutorialEntry } from './engine/tutorial/tutorial-machine'
import { TUTORIAL_STEPS } from './engine/tutorial/tutorial-script'
import { WEAPON_ORDER } from './data'
import { submitScore } from './leaderboard/score-submission'
import { clearSave, savePlayerName, saveGame } from './engine/world/persistence'
import { createInitialState } from './engine/game-loop'

// Stub only the network post and the name persistence — every other export of
// these modules stays real so the rest of the hook (save/load, buildSubmission)
// behaves normally.
vi.mock('./leaderboard/score-submission', async (importOriginal) => {
  const actual = await importOriginal<typeof import('./leaderboard/score-submission')>()
  return { ...actual, submitScore: vi.fn() }
})
vi.mock('./engine/world/persistence', async (importOriginal) => {
  const actual = await importOriginal<typeof import('./engine/world/persistence')>()
  return { ...actual, savePlayerName: vi.fn() }
})

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

  it('resumes a run saved mid-sector straight back into play', () => {
    // Autosave now checkpoints at each wave start while play continues, so a save
    // carries a live `playing` phase — Continue must restore straight into it.
    clearSave()
    const saved = { ...createInitialState(), phase: GamePhase.playing, wave: 2, level: 1 }
    saveGame(saved, 12345)
    const canvasRef = createRef<HTMLCanvasElement>()
    const { result } = renderHook(() => useNullSpace(canvasRef))
    act(() => result.current.handleContinue())
    expect(result.current.uiState.phase).toBe(GamePhase.playing)
    expect(result.current.uiState.wave).toBe(2)
    clearSave()
  })
})

describe('useNullSpace — handleSubmitScore', () => {
  beforeEach(() => {
    vi.mocked(submitScore).mockReset()
    vi.mocked(savePlayerName).mockReset()
  })

  it('on success returns true, persists the name, and is a no-op on resubmit', async () => {
    vi.mocked(submitScore).mockResolvedValue(undefined)
    const canvasRef = createRef<HTMLCanvasElement>()
    const { result } = renderHook(() => useNullSpace(canvasRef))

    let ok: boolean | undefined
    await act(async () => {
      ok = await result.current.handleSubmitScore('Ace')
    })
    expect(ok).toBe(true)
    expect(submitScore).toHaveBeenCalledTimes(1)
    expect(submitScore).toHaveBeenCalledWith(expect.objectContaining({ name: 'Ace' }))
    expect(savePlayerName).toHaveBeenCalledWith('Ace')

    // The one-shot guard stops a second post once a score landed.
    await act(async () => {
      ok = await result.current.handleSubmitScore('Ace')
    })
    expect(ok).toBe(true)
    expect(submitScore).toHaveBeenCalledTimes(1)
  })

  it('submits the full run duration after a resume, not just the post-resume segment', async () => {
    // Regression: continuing a saved run reset the run clock, so the duration
    // sent to the leaderboard was only the time played since pressing Continue.
    // The 60s banked into the save before exiting must survive the resume.
    vi.mocked(submitScore).mockResolvedValue(undefined)
    const nowSpy = vi.spyOn(Date, 'now').mockReturnValue(600_000)
    clearSave()
    const saved = {
      ...createInitialState(),
      phase: GamePhase.upgradeScreen,
      runDurationMs: 60_000,
    }
    saveGame(saved, 12345)

    const canvasRef = createRef<HTMLCanvasElement>()
    const { result } = renderHook(() => useNullSpace(canvasRef))
    // Resume long after exiting — the away time is excluded; only banked play counts.
    act(() => result.current.handleContinue())
    await act(async () => {
      await result.current.handleSubmitScore('Ace')
    })

    expect(vi.mocked(submitScore).mock.calls[0][0].durationMs).toBe(60_000)
    nowSpy.mockRestore()
    clearSave()
  })

  it('excludes paused time from the submitted run duration', async () => {
    // Regression: pausing left the wall-clock segment running, so time spent on
    // the pause screen counted as play-time. Pause must bank the live segment and
    // resume must start a fresh one, so only real play reaches the leaderboard.
    vi.mocked(submitScore).mockResolvedValue(undefined)
    let now = 0
    const nowSpy = vi.spyOn(Date, 'now').mockImplementation(() => now)

    const canvasRef = createRef<HTMLCanvasElement>()
    const { result } = renderHook(() => useNullSpace(canvasRef))
    act(() => result.current.handleStart())
    act(() => result.current.handleSelectShip(ShipKind.fighter)) // segment starts at 0
    now = 10_000
    act(() => result.current.handlePause()) // banks the 10s played
    now = 70_000 // 60s spent paused
    act(() => result.current.handleResume()) // fresh segment from 70s
    now = 90_000
    act(() => result.current.handlePause()) // banks the next 20s played
    await act(async () => {
      await result.current.handleSubmitScore('Ace')
    })

    // 10s + 20s of play; the 60s pause is excluded (not the 90s of wall-clock).
    expect(vi.mocked(submitScore).mock.calls[0][0].durationMs).toBe(30_000)
    nowSpy.mockRestore()
  })

  it('on failure returns false, leaves the guard unset, and allows a retry', async () => {
    vi.mocked(submitScore)
      .mockRejectedValueOnce(new Error('network'))
      .mockResolvedValueOnce(undefined)
    const canvasRef = createRef<HTMLCanvasElement>()
    const { result } = renderHook(() => useNullSpace(canvasRef))

    let ok: boolean | undefined
    await act(async () => {
      ok = await result.current.handleSubmitScore('Ace')
    })
    expect(ok).toBe(false)
    expect(savePlayerName).not.toHaveBeenCalled()

    // Guard never armed, so the next attempt actually re-posts.
    await act(async () => {
      ok = await result.current.handleSubmitScore('Ace')
    })
    expect(ok).toBe(true)
    expect(submitScore).toHaveBeenCalledTimes(2)
    expect(savePlayerName).toHaveBeenCalledTimes(1)
  })
})

describe('shouldSyncUI', () => {
  // Regression: loot now flies to the ship during the warp, so the HUD counters
  // must refresh every frame while warping — not just once at the shop.
  it('republishes the HUD every frame during the warp cutscene', () => {
    expect(shouldSyncUI(GamePhase.warping, GamePhase.warping, false)).toBe(true)
  })

  it('republishes every frame while playing', () => {
    expect(shouldSyncUI(GamePhase.playing, GamePhase.playing, false)).toBe(true)
  })

  it('republishes on a phase change or a click, even on static screens', () => {
    expect(shouldSyncUI(GamePhase.upgradeScreen, GamePhase.warping, false)).toBe(true) // phase change
    expect(shouldSyncUI(GamePhase.upgradeScreen, GamePhase.upgradeScreen, true)).toBe(true) // click
  })

  it('skips redundant publishes on a quiet static screen', () => {
    expect(shouldSyncUI(GamePhase.upgradeScreen, GamePhase.upgradeScreen, false)).toBe(false)
    expect(shouldSyncUI(GamePhase.gameOver, GamePhase.gameOver, false)).toBe(false)
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
    const key = (k: string) =>
      act(() => window.dispatchEvent(new KeyboardEvent('keydown', { key: k })))

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
      // The engine reseeds rng from Date.now() on game start, so wave 1's mine
      // field and enemy spawn points are otherwise non-deterministic — on an
      // unlucky seed an enemy spawns onto a mine and detonates in the same tick,
      // leaving enemiesAlive at 0 (flaky in CI). Pin the seed to a layout where
      // the first spawn survives.
      vi.spyOn(Date, 'now').mockReturnValue(424242)
      const canvasRef = { current: canvas }
      const { result } = renderHook(() => useNullSpace(canvasRef))
      startPlaying(result)

      step(16) // wave 1 has no spawn delay — at least one enemy is on the field
      const { enemiesAlive, totalWaveEnemies } = result.current.uiState
      expect(enemiesAlive).toBeGreaterThan(0)
      expect(enemiesAlive).toBeLessThanOrEqual(totalWaveEnemies)
    })

    // Regression: keyDown's tutorial branch swallows keys by default — only the
    // beats that teach swap/shield-refresh let hotkeys through. The intro beat
    // teaches neither, so an ability hotkey must not change selection even though
    // startTutorialRun unlocks Black Hole (so '2' would select it in normal play).
    // Also guards the removal of the old WASD movement-key special-casing: a
    // movement key is now an inert no-op, not a handled input.
    it('swallows ability and movement keys on a tutorial beat that teaches neither', () => {
      const canvasRef = { current: canvas }
      const { result } = renderHook(() => useNullSpace(canvasRef))
      act(() => result.current.handleStartTutorial(TutorialEntry.replay))
      step(0)
      expect(result.current.uiState.selectedAbility).toBe(AbilityKind.meteorite)

      key('2') // Black Hole hotkey — unlocked for the tutorial, but not yet taught
      expect(result.current.uiState.selectedAbility).toBe(AbilityKind.meteorite)

      key('w') // old movement key — must do nothing and not crash
      expect(result.current.uiState.selectedAbility).toBe(AbilityKind.meteorite)
    })

    // The overlay reads uiState.tutorial — null while inactive, and once running
    // its progress must mirror the machine's 1-based position and script length.
    it('exposes tutorial ui state (with 1-based progress) once the tutorial starts', () => {
      const canvasRef = { current: canvas }
      const { result } = renderHook(() => useNullSpace(canvasRef))
      expect(result.current.uiState.tutorial).toBeNull()

      act(() => result.current.handleStartTutorial(TutorialEntry.replay))
      step(0)
      expect(result.current.uiState.tutorial?.stepNumber).toBe(1)
      expect(result.current.uiState.tutorial?.stepCount).toBe(TUTORIAL_STEPS.length)
    })
  })
})
