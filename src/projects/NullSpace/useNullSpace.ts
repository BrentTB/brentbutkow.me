import { useEffect, useRef, useState, useCallback } from 'react'
import {
  createInitialState,
  moveToShipSelection,
  startGame,
  startNextWave,
  updateGameState,
  applyUpgradeToState,
  applyUltimatePurchaseToState,
  salvageAbility,
  finishUpgradeScreen,
  advanceWarp,
  advanceDeathSequence,
} from './engine/game-loop'
import {
  devJumpToBoss,
  devJumpToUpgrades,
  devPatchState,
  devSpawnCalamity,
  type DevCalamity,
  type DevPatch,
} from './engine/dev-tools'
import { isBaseReplacedByUltimate } from './engine/ultimates'
import { ULTIMATE_KIND_OF } from './engine/abilities'
import {
  AbilityKind,
  CollectibleKind,
  EffectKind,
  EnemyKind,
  GamePhase,
  ShipKind,
  HelperWeaponKind,
} from './engine/types'
import type { GameState, PlayerInput, Vec2, PlayerUpgrades } from './engine/types'
import type { UpgradeId } from './engine/upgrade-ids'
import { getBossDefinition } from './engine/bosses'
import { HOLD_ABILITIES } from './engine/abilities'
import {
  SLING_MAX_DRAG_PX,
  moveGesture,
  releaseGesture,
  tryGrabShip,
  type SlingGesture,
} from './input/sling-gesture'
import {
  SPACE_METAL_ABILITIES,
  SpaceMetalAbilityKind,
  findSpaceMetalAbilityByKey,
  tryActivateSpaceMetalAbility,
} from './engine/spaceMetalAbilities'
import {
  createGameTime,
  tickGameTime,
  pauseGameTime,
  resumeGameTime,
  resetGameClock,
  setGameSpeed,
  type GameTime,
} from './engine/world/time'
import { isBossWave } from './engine/world/waves'
import { secondsUntilSpeedUp } from './engine/world/wave-escalation'
import {
  buildAnimationCache,
  buildSpriteCache,
  type AnimationCache,
  type SpriteCache,
} from './renderer/sprite-cache'
import { useReducedMotion } from './useReducedMotion'
import {
  createCamera,
  updateCamera,
  centerCameraOn,
  computeZoom,
  screenToWorld,
  triggerCameraShake,
  shakeStrengthForHit,
  type Camera,
} from './renderer/camera'
import { generateStarfield, type Star } from './renderer/starfield'
import { renderFrame } from './renderer/renderer'
import { drawSlingAim } from './renderer/sling-aim'
import { WORLD_SIZE } from './data'
import { rng } from './engine/math/random'
import {
  saveGame,
  loadGame,
  clearSave,
  saveTutorialSeen,
  savePlayerName,
} from './engine/world/persistence'
import { buildScoreSubmission, submitScore } from './leaderboard/score-submission'
import { bankPlaySegment } from './leaderboard/run-duration'
import {
  advanceTutorial,
  createTutorialState,
  TutorialEntry,
  type TutorialState,
  type TutorialView,
  type TutorialSignals,
} from './engine/tutorial/tutorial-machine'
import {
  applyTutorialStepEnter,
  ensureTutorialEnemy,
  pickSpotlightEnemyId,
  startTutorialRun,
} from './engine/tutorial/demo-wave'
import { TutorialSpotlightKind } from './engine/tutorial/tutorial-script'
import { drawTutorialFocus } from './renderer/tutorial-overlay'
import { useCoarsePointer } from './useCoarsePointer'

// Build-time literal, same as in NullSpace.tsx
const DEV_MODE = import.meta.env.VITE_NULL_SPACE_DEV_MODE === 'true'

// Background star count — reseeded on each sector entry.
const STAR_COUNT = 250

// Shared no-op stub returned in place of the dev handlers when DEV_MODE is
// off. A single zero-arg arrow satisfies all three slots because TypeScript
// permits assigning functions with fewer parameters where more are expected.
const noop = () => {}

export type GameUIState = {
  phase: GameState['phase']
  shipKind: ShipKind
  score: number
  highScore: number
  isNewHighScore: boolean
  kills: number
  wave: number
  level: number
  shipHp: number
  shipMaxHp: number
  shipShield: number
  shipMaxShield: number
  shieldCooldownRemaining: number
  shipSpeed: number
  power: number
  maxPower: number
  currency: number
  spaceMetal: number
  singularityShard: number
  ultimatesOwned: GameState['ultimatesOwned']
  abilities: GameState['abilities']
  upgrades: PlayerUpgrades
  selectedAbility: GameState['abilities'][number]['kind']
  spawnedInWave: number
  totalWaveEnemies: number
  enemiesAlive: number
  // Seconds until this wave's enemies speed up — set only in the final warning
  // window, else null. Purely a UI telegraph for the existing escalation.
  speedUpCountdown: number | null
  levelUpWeaponOffers: GameState['levelUpWeaponOffers']
  unlockedWeapons: GameState['unlockedWeapons']
  escapeModeActive: boolean
  slingHeat: number
  slingOverheated: boolean
  boss: { hp: number; maxHp: number; label: string } | null
  nextBoss: EnemyKind
  // Cryptic boss warning shown in the pre-boss shop; null in every other shop.
  bossWarning: string | null
  // Tutorial overlay state (the demo-wave onboarding). Inactive → tutorialActive false.
  tutorialActive: boolean
  tutorialCopy: string
  tutorialAwaitingAck: boolean
  tutorialAckLabel: string | null
  tutorialIsFinal: boolean
}

// Hotkey number = position in unlock order. The HUD renders only unlocked
// abilities, sorted by unlockedAt, so badge "2" always selects whatever was
// unlocked second. A base whose ultimate is owned is hidden — the ultimate
// occupies its slot instead.
export function getUnlockedAbilitiesInOrder(
  abilities: GameState['abilities'],
  ultimatesOwned: GameState['ultimatesOwned'] = []
): GameState['abilities'] {
  return abilities
    .filter((a) => a.unlockedAt !== null && !isBaseReplacedByUltimate(a.kind, ultimatesOwned))
    .slice()
    .sort((a, b) => (a.unlockedAt as number) - (b.unlockedAt as number))
}

export function abilityKindForHotkey(
  abilities: GameState['abilities'],
  key: string,
  ultimatesOwned: GameState['ultimatesOwned'] = []
): GameState['abilities'][number]['kind'] | null {
  const index = Number(key) - 1
  if (!Number.isInteger(index) || index < 0) return null
  const ordered = getUnlockedAbilitiesInOrder(abilities, ultimatesOwned)
  return ordered[index]?.kind ?? null
}

// After buying an ultimate, selection should follow the base it replaces —
// otherwise the player keeps firing the now-hidden base. Returns the ultimate
// when the just-purchased base was the active selection, else leaves it as-is.
export function selectionAfterUltimatePurchase(
  current: AbilityKind,
  baseKind: AbilityKind,
  purchased: boolean
): AbilityKind {
  const ultimateKind = ULTIMATE_KIND_OF[baseKind]
  return purchased && ultimateKind && current === baseKind ? ultimateKind : current
}

// After salvaging a line, if it (or its ultimate) was the active selection, fall
// back to the first ability still in the hotbar — Meteorite at worst, which can't
// be removed.
export function selectionAfterSalvage(
  current: AbilityKind,
  salvagedBase: AbilityKind,
  abilities: GameState['abilities'],
  ultimatesOwned: GameState['ultimatesOwned']
): AbilityKind {
  if (current !== salvagedBase && current !== ULTIMATE_KIND_OF[salvagedBase]) return current
  return getUnlockedAbilitiesInOrder(abilities, ultimatesOwned)[0]?.kind ?? AbilityKind.meteorite
}

// Whether to republish the HUD this frame. Always during the actively-animating
// phases — playing, and the warp cutscene where loot still flies in and the
// currency counters change — plus on any phase change or click. Static screens
// (shop, game over, menu) don't churn React state every frame.
export function shouldSyncUI(phase: GamePhase, prevPhase: GamePhase, hasClicks: boolean): boolean {
  return (
    phase !== prevPhase || hasClicks || phase === GamePhase.playing || phase === GamePhase.warping
  )
}

export function useNullSpace(canvasRef: React.RefObject<HTMLCanvasElement | null>) {
  const gameStateRef = useRef<GameState>(createInitialState())

  const [uiState, setUiState] = useState<GameUIState>(() => ({
    phase: GamePhase.menu,
    shipKind: ShipKind.fighter,
    score: 0,
    highScore: 0,
    isNewHighScore: false,
    kills: 0,
    wave: 0,
    level: 0,
    shipHp: 100,
    shipMaxHp: 100,
    shipShield: 50,
    shipMaxShield: 50,
    shieldCooldownRemaining: 0,
    shipSpeed: 0,
    power: 80,
    maxPower: 100,
    currency: 0,
    spaceMetal: 0,
    singularityShard: 0,
    ultimatesOwned: [],
    abilities: [],
    upgrades: {} as PlayerUpgrades,
    selectedAbility: AbilityKind.meteorite,
    spawnedInWave: 0,
    totalWaveEnemies: 0,
    enemiesAlive: 0,
    speedUpCountdown: null,
    levelUpWeaponOffers: [],
    unlockedWeapons: [HelperWeaponKind.bullet],
    escapeModeActive: false,
    slingHeat: 0,
    slingOverheated: false,
    boss: null,
    nextBoss: gameStateRef.current.bossSelection.nextBoss,
    bossWarning: null,
    tutorialActive: false,
    tutorialCopy: '',
    tutorialAwaitingAck: false,
    tutorialAckLabel: null,
    tutorialIsFinal: false,
  }))

  // Whether a resumable save exists on disk (drives the menu's Continue button).
  const [hasSave, setHasSave] = useState(() => loadGame() !== null)

  const cameraRef = useRef<Camera>(createCamera(800, 600))
  const spritesRef = useRef<SpriteCache | null>(null)
  const animationsRef = useRef<AnimationCache | null>(null)
  // Cosmetic clock (seconds) driving ship-side animation; advanced by dt so it
  // freezes on pause. Kept out of GameState — purely a render concern.
  const renderClockRef = useRef(0)
  // OS reduce-motion preference, mirrored into a ref so the rAF loop (set up
  // once) always reads the live value.
  const reducedMotion = useReducedMotion()
  const reducedMotionRef = useRef(reducedMotion)
  reducedMotionRef.current = reducedMotion
  // Coarse (touch) pointer — swaps tutorial "click" copy for "tap" and drops the
  // keyboard-only beats. Mirrored to a ref so the rAF loop reads the live value.
  const isTouch = useCoarsePointer()
  const isTouchRef = useRef(isTouch)
  isTouchRef.current = isTouch
  const starsRef = useRef<Star[]>([])
  // Ship HP / shield at the end of the previous frame — a drop this frame kicks the
  // damage screen-shake (a heavier jolt for HP, a lighter one for a shield-only hit).
  // Seeded high; the first playing frame reseats them before comparing.
  const prevShipHpRef = useRef<number>(Infinity)
  const prevShipShieldRef = useRef<number>(Infinity)
  const rafRef = useRef<number>(0)
  const gameTimeRef = useRef<GameTime>(createGameTime())
  // Run timing + one-shot submit guard for the leaderboard. runStart marks the
  // start of the live play segment, reset whenever a fresh segment begins (game
  // start, Continue, unpause) and on each autosave; the segment it ends is banked
  // into state.runDurationMs. Pause banks too, so paused time — like away time —
  // never counts toward the duration. runEnd is stamped at death so the submitted
  // duration excludes game-over-screen reading time. The guard stops a successful
  // score POSTing twice if the game-over submit button is tapped again.
  const runStartRef = useRef(0)
  const runEndRef = useRef(0)
  const scoreSubmittedRef = useRef(false)
  const inputRef = useRef<PlayerInput>({
    clicks: [],
    selectedAbility: AbilityKind.meteorite,
    holdPos: null,
    isHolding: false,
  })
  // Hold-ability cursor tracking. Screen pos is the truth — world pos drifts
  // when the camera moves and we'd otherwise leave the beam pinned to stale
  // world coordinates while the player's actual cursor stays still on screen.
  const holdScreenPosRef = useRef<Vec2 | null>(null)
  const selectedAbilityRef = useRef<GameState['abilities'][number]['kind']>(AbilityKind.meteorite)
  // Active slingshot grab (null = not grabbing) and the one-shot flick handed
  // to the engine on release.
  const slingRef = useRef<SlingGesture | null>(null)
  const pendingFlingRef = useRef<PlayerInput['fling']>(null)
  // Tutorial (demo-wave onboarding) runtime — kept out of GameState. The machine
  // state, its latest projection (for the overlay), the resolved spotlight target
  // enemy id (for the renderer), and one-shot input flags consumed each frame.
  const tutorialRef = useRef<TutorialState | null>(null)
  const tutorialViewRef = useRef<TutorialView | null>(null)
  const tutorialTargetIdRef = useRef<string | null>(null)
  // Last beat the per-step enter-setup ran for, so spawns/shield-break fire once.
  const tutorialPrevStepIdRef = useRef<string>('')
  const tutorialAckRef = useRef(false)

  const syncUI = useCallback((state: GameState) => {
    const tutorialActive = tutorialRef.current !== null && !tutorialRef.current.done
    setUiState({
      phase: state.phase,
      shipKind: state.shipKind,
      score: state.score,
      highScore: state.highScore,
      isNewHighScore: state.isNewHighScore,
      kills: state.kills,
      wave: state.wave,
      level: state.level,
      shipHp: state.ship.hp,
      shipMaxHp: state.ship.maxHp,
      shipShield: state.ship.shield,
      shipMaxShield: state.ship.maxShield,
      shieldCooldownRemaining: state.ship.shieldCooldownRemaining,
      shipSpeed: state.ship.speed,
      power: state.power,
      maxPower: state.maxPower,
      currency: state.currency,
      spaceMetal: state.spaceMetal,
      singularityShard: state.singularityShard,
      ultimatesOwned: state.ultimatesOwned,
      abilities: state.abilities,
      upgrades: state.upgrades,
      selectedAbility: selectedAbilityRef.current,
      spawnedInWave: state.spawn.spawned,
      totalWaveEnemies: state.spawn.total,
      enemiesAlive: state.enemies.length,
      // The wave timer ticks during the tutorial too, but the speed-up warning
      // isn't part of the guided lesson — hide it there.
      speedUpCountdown: tutorialActive
        ? null
        : secondsUntilSpeedUp(state.spawn.elapsed, isBossWave(state.wave)),
      levelUpWeaponOffers: state.levelUpWeaponOffers,
      unlockedWeapons: state.unlockedWeapons,
      escapeModeActive: state.ship.escapeMode !== null,
      slingHeat: state.ship.slingHeat,
      slingOverheated: state.ship.slingOverheated,
      boss: (() => {
        const bossEnemy = state.enemies.find((e) => e.boss !== undefined)
        if (!bossEnemy) return null
        const def = getBossDefinition(bossEnemy.kind)
        // Aggregate-HP bosses (the worm) report head + body; others raw HP.
        const value = def?.hpBarValue
          ? def.hpBarValue(bossEnemy, state.enemies)
          : { hp: bossEnemy.hp, maxHp: bossEnemy.maxHp }
        return { ...value, label: def?.hpBarLabel ?? 'BOSS' }
      })(),
      nextBoss: state.bossSelection.nextBoss,
      // The pre-boss shop (boss queued on the next wave) shows a cryptic heads-up.
      bossWarning:
        state.phase === GamePhase.upgradeScreen && isBossWave(state.wave)
          ? (getBossDefinition(state.bossSelection.nextBoss)?.warning ?? null)
          : null,
      tutorialActive,
      tutorialCopy: tutorialViewRef.current?.copy ?? '',
      tutorialAwaitingAck: tutorialViewRef.current?.awaitingAck ?? false,
      tutorialAckLabel: tutorialViewRef.current?.ackLabel ?? null,
      tutorialIsFinal: tutorialViewRef.current?.isFinalStep ?? false,
    })
  }, [])

  // Autosave the run whenever the wave counter climbs — the clean checkpoint a
  // resumed run picks up from. Both mid-sector auto-advance (startNextWave) and
  // opening a sector / pre-boss shop (openUpgradeScreen) bump `wave`, so one
  // wave-increase check covers every between-wave beat, independent of the rAF
  // loop's timing. Drop the save when a run ends.
  const prevSavedWaveRef = useRef(uiState.wave)
  useEffect(() => {
    const phase = uiState.phase
    const waveAdvanced = uiState.wave > prevSavedWaveRef.current
    prevSavedWaveRef.current = uiState.wave
    const inLiveRun = phase === GamePhase.playing || phase === GamePhase.upgradeScreen
    if (waveAdvanced && inLiveRun) {
      // Bank the live segment into the run duration before persisting, then
      // restart it — so a resumed run keeps the time played before exiting
      // instead of submitting only the post-resume stretch.
      const now = Date.now()
      gameStateRef.current = {
        ...gameStateRef.current,
        runDurationMs: bankPlaySegment(
          gameStateRef.current.runDurationMs,
          runStartRef.current,
          now
        ),
      }
      runStartRef.current = now
      saveGame(gameStateRef.current, rng.getState())
      setHasSave(true)
    } else if (phase === GamePhase.gameOver) {
      // Stamp the run-end here (not at submit) so the duration sent to the
      // leaderboard excludes time spent reading the game-over screen.
      runEndRef.current = Date.now()
      clearSave()
      setHasSave(false)
    }
  }, [uiState.phase, uiState.wave])

  // Snap the camera onto the ship and reseed the starfield — called whenever a
  // fresh sector is laid out (game start, warp).
  const enterSector = useCallback(() => {
    cameraRef.current = centerCameraOn(cameraRef.current, gameStateRef.current.ship.pos)
    starsRef.current = generateStarfield(
      gameStateRef.current.worldSize.x,
      gameStateRef.current.worldSize.y,
      STAR_COUNT
    )
  }, [])

  const handleStart = useCallback(() => {
    // Starting fresh discards any resumable save.
    clearSave()
    setHasSave(false)
    gameStateRef.current = moveToShipSelection(gameStateRef.current)
    syncUI(gameStateRef.current)
  }, [syncUI])

  const handleSelectShip = useCallback(
    (kind: ShipKind) => {
      gameStateRef.current = startGame(gameStateRef.current, kind)
      gameStateRef.current = startNextWave(gameStateRef.current)
      runStartRef.current = Date.now()
      scoreSubmittedRef.current = false
      gameTimeRef.current = resetGameClock(gameTimeRef.current)
      selectedAbilityRef.current = AbilityKind.meteorite
      enterSector()
      syncUI(gameStateRef.current)
    },
    [syncUI, enterSector]
  )

  const handleRestart = useCallback(() => {
    handleStart()
  }, [handleStart])

  // Submit the finished run to the leaderboard. Best-effort: resolves to whether
  // it succeeded so the game-over screen can offer a retry; the one-shot guard
  // stops a successful score being posted twice.
  const handleSubmitScore = useCallback(async (name: string): Promise<boolean> => {
    if (scoreSubmittedRef.current) return true
    // Banked segments (state.runDurationMs) plus the final live one, ending at
    // the stamped death time — the full run, spanning any Save & Exit → Continue.
    const durationMs = bankPlaySegment(
      gameStateRef.current.runDurationMs,
      runStartRef.current,
      runEndRef.current
    )
    const submission = buildScoreSubmission(gameStateRef.current, name, durationMs)
    try {
      await submitScore(submission)
      scoreSubmittedRef.current = true
      savePlayerName(submission.name)
      return true
    } catch {
      return false
    }
  }, [])

  // Resume the saved run (from the last sector clear). Restores RNG so spawns
  // play out identically, then re-seats the camera/starfield on the loaded world.
  const handleContinue = useCallback(() => {
    const saved = loadGame()
    if (!saved) return
    gameStateRef.current = saved.state
    rng.setState(saved.rngState)
    runStartRef.current = Date.now()
    scoreSubmittedRef.current = false
    // Restart the frame clock — otherwise the resumed run stays frozen (dt 0).
    gameTimeRef.current = resetGameClock(gameTimeRef.current)
    selectedAbilityRef.current = AbilityKind.meteorite
    enterSector()
    syncUI(gameStateRef.current)
  }, [syncUI, enterSector])

  // Save & Exit: the run was already auto-saved at the last wave clear, so this
  // just returns to a fresh menu; the save on disk stays for Continue.
  const handleSaveAndExit = useCallback(() => {
    gameStateRef.current = createInitialState()
    syncUI(gameStateRef.current)
  }, [syncUI])

  const handleUseSpaceMetalAbility = useCallback(
    (kind: SpaceMetalAbilityKind) => {
      gameStateRef.current = tryActivateSpaceMetalAbility(gameStateRef.current, kind)
      syncUI(gameStateRef.current)
    },
    [syncUI]
  )

  // Dev-only handlers. Stubbed to no-ops by default; the `if (DEV_MODE)` block
  // below rebinds them with real implementations. When DEV_MODE folds to
  // `false` at build time, Rollup removes the whole block, taking the
  // engine/dev-tools imports with it.
  let handleDevPatch: (patch: DevPatch) => void = noop
  let handleDevJumpToUpgrades: () => void = noop
  let handleDevJumpToBoss: () => void = noop
  let handleDevQuickStart: (kind: ShipKind) => void = noop
  let handleDevSpawnCalamity: (kind: DevCalamity) => void = noop

  if (DEV_MODE) {
    handleDevPatch = (patch: DevPatch) => {
      gameStateRef.current = devPatchState(gameStateRef.current, patch)
      syncUI(gameStateRef.current)
    }

    handleDevJumpToUpgrades = () => {
      gameStateRef.current = devJumpToUpgrades(gameStateRef.current)
      syncUI(gameStateRef.current)
    }

    handleDevJumpToBoss = () => {
      gameStateRef.current = devJumpToBoss(gameStateRef.current)
      syncUI(gameStateRef.current)
    }

    handleDevSpawnCalamity = (kind: DevCalamity) => {
      // Engine-only: the running loop picks the new effect/body up next frame; no
      // console-visible field changes, so no syncUI needed.
      gameStateRef.current = devSpawnCalamity(gameStateRef.current, kind)
    }

    handleDevQuickStart = (kind: ShipKind) => {
      gameStateRef.current = startGame(gameStateRef.current, kind)
      gameStateRef.current = startNextWave(gameStateRef.current)
      runStartRef.current = Date.now()
      scoreSubmittedRef.current = false
      gameTimeRef.current = resetGameClock(gameTimeRef.current)
      selectedAbilityRef.current = AbilityKind.meteorite
      enterSector()
      syncUI(gameStateRef.current)
    }
  }

  const setSelectedAbility = useCallback(
    (kind: GameState['abilities'][number]['kind']) => {
      const ability = gameStateRef.current.abilities.find((a) => a.kind === kind)
      if (ability?.unlocked) {
        selectedAbilityRef.current = kind
        syncUI(gameStateRef.current)
      }
    },
    [syncUI]
  )

  const handlePurchaseUpgrade = useCallback(
    (upgradeId: UpgradeId) => {
      gameStateRef.current = applyUpgradeToState(gameStateRef.current, upgradeId)
      syncUI(gameStateRef.current)
    },
    [syncUI]
  )

  const handlePurchaseUltimate = useCallback(
    (baseKind: AbilityKind) => {
      const before = gameStateRef.current.ultimatesOwned.length
      gameStateRef.current = applyUltimatePurchaseToState(gameStateRef.current, baseKind)
      const purchased = gameStateRef.current.ultimatesOwned.length > before
      selectedAbilityRef.current = selectionAfterUltimatePurchase(
        selectedAbilityRef.current,
        baseKind,
        purchased
      )
      syncUI(gameStateRef.current)
    },
    [syncUI]
  )

  const handleSalvageAbility = useCallback(
    (baseKind: AbilityKind) => {
      gameStateRef.current = salvageAbility(gameStateRef.current, baseKind)
      selectedAbilityRef.current = selectionAfterSalvage(
        selectedAbilityRef.current,
        baseKind,
        gameStateRef.current.abilities,
        gameStateRef.current.ultimatesOwned
      )
      syncUI(gameStateRef.current)
    },
    [syncUI]
  )

  const handleFinishUpgrades = useCallback(() => {
    gameStateRef.current = finishUpgradeScreen(gameStateRef.current)
    syncUI(gameStateRef.current)
  }, [syncUI])

  const handlePause = useCallback(() => {
    if (gameStateRef.current.phase !== GamePhase.playing) return
    // Bank the live segment before pausing so the time spent paused — like away
    // time between a Save & Exit and a Continue — never counts toward the run.
    gameStateRef.current = {
      ...gameStateRef.current,
      phase: GamePhase.paused,
      runDurationMs: bankPlaySegment(
        gameStateRef.current.runDurationMs,
        runStartRef.current,
        Date.now()
      ),
    }
    gameTimeRef.current = pauseGameTime(gameTimeRef.current)
    syncUI(gameStateRef.current)
  }, [syncUI])

  const handleResume = useCallback(() => {
    if (gameStateRef.current.phase !== GamePhase.paused) return
    gameStateRef.current = { ...gameStateRef.current, phase: GamePhase.playing }
    // Start a fresh play segment so only post-resume time is measured from here.
    runStartRef.current = Date.now()
    gameTimeRef.current = resumeGameTime(gameTimeRef.current, performance.now())
    syncUI(gameStateRef.current)
  }, [syncUI])

  // Ends the tutorial: marks it seen, then routes — first-play flows into the
  // real run (ship selection); a replay drops back to the menu.
  const finishTutorial = useCallback(
    (entry: TutorialEntry) => {
      saveTutorialSeen()
      tutorialRef.current = null
      tutorialViewRef.current = null
      tutorialTargetIdRef.current = null
      tutorialAckRef.current = false
      gameStateRef.current =
        entry === TutorialEntry.firstPlay
          ? moveToShipSelection(createInitialState())
          : createInitialState()
      gameTimeRef.current = resetGameClock(gameTimeRef.current)
      syncUI(gameStateRef.current)
    },
    [syncUI]
  )

  // Launches the guided demo wave. Auto-triggered on first-ever play and
  // available from the menu's "How to Play" button (replay).
  const handleStartTutorial = useCallback(
    (entry: TutorialEntry) => {
      const view = advanceTutorial(createTutorialState(entry, isTouchRef.current), {
        realDt: 0,
        clicked: false,
        flung: false,
        powerFraction: 1,
        abilitySwapped: false,
        swapAbilityUsed: false,
        spaceMetal: 0,
        shieldFraction: 1,
        acknowledged: false,
      })
      tutorialRef.current = view.state
      tutorialViewRef.current = view
      tutorialTargetIdRef.current = null
      tutorialPrevStepIdRef.current = ''
      tutorialAckRef.current = false
      gameStateRef.current = startTutorialRun(gameStateRef.current)
      gameTimeRef.current = resetGameClock(gameTimeRef.current)
      selectedAbilityRef.current = AbilityKind.meteorite
      enterSector()
      syncUI(gameStateRef.current)
    },
    [syncUI, enterSector]
  )

  const handleSkipTutorial = useCallback(() => {
    finishTutorial(tutorialRef.current?.entry ?? TutorialEntry.replay)
  }, [finishTutorial])

  // Next / Finish button — a one-shot the machine consumes on the next frame.
  const handleTutorialAck = useCallback(() => {
    tutorialAckRef.current = true
  }, [])

  const handleSetSpeed = useCallback((speed: number) => {
    gameTimeRef.current = setGameSpeed(gameTimeRef.current, speed)
  }, [])

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return

    const ctx = canvas.getContext('2d')
    if (!ctx) return

    spritesRef.current = buildSpriteCache()
    animationsRef.current = buildAnimationCache()
    starsRef.current = generateStarfield(WORLD_SIZE.x, WORLD_SIZE.y, STAR_COUNT)

    const resize = () => {
      const parent = canvas.parentElement
      if (!parent) return
      const rect = parent.getBoundingClientRect()
      const dpr = window.devicePixelRatio || 1
      canvas.width = Math.round(rect.width * dpr)
      canvas.height = Math.round(rect.height * dpr)
      cameraRef.current = {
        ...cameraRef.current,
        width: rect.width,
        height: rect.height,
        dpr,
        // Recompute zoom on every resize so the visible world area stays
        // consistent across viewport size changes (mobile rotate,
        // fullscreen toggle, etc.).
        zoom: computeZoom(rect.width, rect.height),
      }
      // Re-center on the ship after a viewport change so we never need to
      // chase it across the world (e.g. on initial mount where the camera
      // starts at (0,0) but the ship is at world center).
      cameraRef.current = centerCameraOn(cameraRef.current, gameStateRef.current.ship.pos)
    }
    resize()

    const resizeObserver = new ResizeObserver(resize)
    resizeObserver.observe(canvas.parentElement!)

    const handlePointerDown = (e: PointerEvent) => {
      const state = gameStateRef.current
      if (state.phase !== GamePhase.playing) return

      const rect = canvas.getBoundingClientRect()
      const screenPos: Vec2 = {
        x: e.clientX - rect.left,
        y: e.clientY - rect.top,
      }
      const worldPos = screenToWorld(screenPos, cameraRef.current)

      // Grab the ship → slingshot flick, regardless of the selected ability.
      // During the tutorial, only the fling beat allows a grab — otherwise a
      // frozen beat could be flung past (and rack up sling heat).
      const tut = tutorialRef.current
      const flingAllowed = !tut || (tut.steps[tut.stepIndex]?.allowFling ?? false)
      const grab = flingAllowed ? tryGrabShip(worldPos, state.ship.pos, screenPos) : null
      if (grab) {
        slingRef.current = grab
        return
      }

      const selected = selectedAbilityRef.current

      if (selected && HOLD_ABILITIES.has(selected)) {
        holdScreenPosRef.current = screenPos
        inputRef.current = {
          ...inputRef.current,
          isHolding: true,
          holdPos: worldPos,
          // Still register the click so the space-metal collector gets a shot
          // at it before the (no-op for hold abilities) click ability resolver.
          clicks: [...inputRef.current.clicks, worldPos],
          selectedAbility: selected,
        }
      } else {
        inputRef.current = {
          ...inputRef.current,
          clicks: [...inputRef.current.clicks, worldPos],
          selectedAbility: selected,
        }
      }
    }

    const handlePointerMove = (e: PointerEvent) => {
      if (gameStateRef.current.phase !== GamePhase.playing) return
      const rect = canvas.getBoundingClientRect()
      const sp: Vec2 = { x: e.clientX - rect.left, y: e.clientY - rect.top }
      if (slingRef.current) {
        slingRef.current = moveGesture(slingRef.current, sp)
        return
      }
      if (!inputRef.current.isHolding) return
      holdScreenPosRef.current = sp
    }

    const handlePointerUp = () => {
      // Release of a ship-grab → fling in the drag direction, power by distance.
      if (slingRef.current) {
        const gesture = slingRef.current
        slingRef.current = null
        // Pausing or dying mid-drag discards the flick — never queue one that
        // would fire on resume.
        if (gameStateRef.current.phase !== GamePhase.playing) return
        const release = releaseGesture(gesture)
        if ('fling' in release) {
          pendingFlingRef.current = release.fling
        } else {
          inputRef.current = {
            ...inputRef.current,
            clicks: [...inputRef.current.clicks, release.tapWorld],
            selectedAbility: selectedAbilityRef.current,
          }
        }
        return
      }
      holdScreenPosRef.current = null
      inputRef.current = {
        ...inputRef.current,
        isHolding: false,
        holdPos: null,
      }
    }

    const handleKeyDown = (e: KeyboardEvent) => {
      // During the tutorial, swallow keys by default (the tutorial drives the
      // freeze and has its own Skip) — except, on the beats that teach them, let
      // ability hotkeys (swap) and space-metal hotkeys (shield refresh) through.
      if (tutorialRef.current) {
        const tutStep = tutorialRef.current.steps[tutorialRef.current.stepIndex]
        if (tutStep?.allowAbilityKeys) {
          const kind = abilityKindForHotkey(
            gameStateRef.current.abilities,
            e.key,
            gameStateRef.current.ultimatesOwned
          )
          if (kind) {
            selectedAbilityRef.current = kind
            syncUI(gameStateRef.current)
          }
          return
        }
        if (tutStep?.allowSpaceMetalKeys) {
          const sm = findSpaceMetalAbilityByKey(e.key)
          if (sm) handleUseSpaceMetalAbility(sm.kind)
        }
        return
      }
      // Use P (not Esc) for pause: in fullscreen, browsers intercept Esc to exit
      // fullscreen so a pause keybind there would never fire.
      if (e.key === 'p' || e.key === 'P') {
        if (gameStateRef.current.phase === GamePhase.playing) handlePause()
        else if (gameStateRef.current.phase === GamePhase.paused) handleResume()
        return
      }
      if (gameStateRef.current.phase !== GamePhase.playing) return
      const spaceMetalAbility = findSpaceMetalAbilityByKey(e.key)
      if (spaceMetalAbility) {
        handleUseSpaceMetalAbility(spaceMetalAbility.kind)
        return
      }
      const kind = abilityKindForHotkey(
        gameStateRef.current.abilities,
        e.key,
        gameStateRef.current.ultimatesOwned
      )
      if (kind) {
        selectedAbilityRef.current = kind
        syncUI(gameStateRef.current)
      }
    }

    canvas.addEventListener('pointerdown', handlePointerDown)
    canvas.addEventListener('pointermove', handlePointerMove)
    window.addEventListener('pointerup', handlePointerUp)
    window.addEventListener('keydown', handleKeyDown)

    const loop = (time: number) => {
      const tick = tickGameTime(gameTimeRef.current, time)
      gameTimeRef.current = tick.time
      // Real frame dt drives the tutorial machine's timers; the SIM dt is forced
      // to 0 on a frozen tutorial beat so the world holds while the prompt shows.
      const dt = tick.dt
      const tut = tutorialRef.current
      const tutStep = tut ? tut.steps[tut.stepIndex] : null
      // One-shot setup when a new beat opens (drop space metal / park shield
      // regen / place a mine).
      if (tutStep && tutStep.id !== tutorialPrevStepIdRef.current) {
        tutorialPrevStepIdRef.current = tutStep.id
        gameStateRef.current = applyTutorialStepEnter(gameStateRef.current, tutStep)
      }
      // Keep a target on screen for beats that need one — the demo drones may have
      // been cleared (e.g. the "cast until power runs low" beat).
      if (tutStep?.keepEnemyAlive && gameStateRef.current.enemies.length === 0) {
        gameStateRef.current = ensureTutorialEnemy(gameStateRef.current)
      }
      const simDt = tutStep?.freeze ? 0 : dt
      // Cosmetic render clock — frozen on pause / tutorial freeze (simDt 0 then).
      renderClockRef.current += simDt

      // Re-resolve hold cursor world-pos every frame from screen-pos so it
      // tracks the actual cursor even as the camera moves.
      const liveHoldPos = holdScreenPosRef.current
        ? screenToWorld(holdScreenPosRef.current, cameraRef.current)
        : null

      // Clicks reach the engine only on beats that teach casting; elsewhere a
      // stray click must not fire a meteorite (the machine still sees the click).
      const rawClicks = inputRef.current.clicks
      const clickedThisFrame = rawClicks.length > 0
      const fling = pendingFlingRef.current ?? null
      const allowCast = tutStep?.allowCast ?? false
      const input: PlayerInput = {
        clicks: tut && !allowCast ? [] : rawClicks,
        selectedAbility: inputRef.current.selectedAbility,
        holdPos: liveHoldPos,
        isHolding: inputRef.current.isHolding,
        fling,
        reducedMotion: reducedMotionRef.current,
      }
      // clicks + fling are one-shot per frame; hold state persists until pointerup.
      pendingFlingRef.current = null
      inputRef.current = {
        ...inputRef.current,
        clicks: [],
        selectedAbility: selectedAbilityRef.current,
      }

      const prevPhase = gameStateRef.current.phase
      gameStateRef.current = updateGameState(gameStateRef.current, simDt, input)

      // Tick the warp animation; reseed the starfield when it lands.
      const warp = advanceWarp(gameStateRef.current, simDt)
      gameStateRef.current = warp.state
      if (warp.landed) enterSector()

      // Tick the player-death explosion; flips to gameOver when it ends.
      gameStateRef.current = advanceDeathSequence(
        gameStateRef.current,
        simDt,
        reducedMotionRef.current
      )

      // Advance the tutorial from this frame's outcome (signals read post-update,
      // e.g. power after a cast), then resolve the spotlight target.
      if (tutorialRef.current) {
        const st = gameStateRef.current
        const signals: TutorialSignals = {
          realDt: dt,
          clicked: clickedThisFrame,
          flung: fling !== null,
          powerFraction: st.maxPower > 0 ? st.power / st.maxPower : 0,
          abilitySwapped: selectedAbilityRef.current !== AbilityKind.meteorite,
          swapAbilityUsed: st.activeEffects.some((ef) => ef.kind === EffectKind.blackHole),
          spaceMetal: st.spaceMetal,
          shieldFraction: st.ship.maxShield > 0 ? st.ship.shield / st.ship.maxShield : 1,
          acknowledged: tutorialAckRef.current,
        }
        const view = advanceTutorial(tutorialRef.current, signals)
        tutorialRef.current = view.state
        tutorialViewRef.current = view
        tutorialAckRef.current = false
        tutorialTargetIdRef.current =
          view.spotlight === TutorialSpotlightKind.enemy ? pickSpotlightEnemyId(st) : null
        if (view.finished) finishTutorial(view.state.entry)
      }

      // Warp cutscene: lock the camera dead-centre on the ship so the portal it
      // flies into lines up with the screen-space warp rays (and the view sits
      // still as it arrives). Normal play follows with a smooth lerp.
      cameraRef.current =
        gameStateRef.current.phase === GamePhase.warping
          ? centerCameraOn(cameraRef.current, gameStateRef.current.ship.pos)
          : updateCamera(cameraRef.current, gameStateRef.current.ship.pos, simDt)

      // Kick the screen-shake when the ship takes a hit mid-play: a full jolt on HP
      // damage, a lighter one when the shield alone soaks it.
      const postState = gameStateRef.current
      const shakeStrength = shakeStrengthForHit({
        prevPhase,
        phase: postState.phase,
        prevHp: prevShipHpRef.current,
        hp: postState.ship.hp,
        prevShield: prevShipShieldRef.current,
        shield: postState.ship.shield,
        reducedMotion: reducedMotionRef.current,
      })
      if (shakeStrength !== null) {
        cameraRef.current = triggerCameraShake(cameraRef.current, shakeStrength)
      }
      prevShipHpRef.current = postState.ship.hp
      prevShipShieldRef.current = postState.ship.shield

      if (spritesRef.current && animationsRef.current) {
        renderFrame(
          ctx,
          gameStateRef.current,
          cameraRef.current,
          spritesRef.current,
          starsRef.current,
          {
            animations: animationsRef.current,
            clock: renderClockRef.current,
            reducedMotion: reducedMotionRef.current,
          }
        )
        // Slingshot aim arrow — drawn after the world while a grab is active.
        const sling = slingRef.current
        if (sling && gameStateRef.current.phase === GamePhase.playing) {
          drawSlingAim(
            ctx,
            gameStateRef.current.ship,
            cameraRef.current,
            sling.start,
            sling.current,
            SLING_MAX_DRAG_PX
          )
        }
        // Tutorial spotlight — dim the scene and ring the current focus target.
        const tutView = tutorialViewRef.current
        if (tutorialRef.current && tutView && !tutView.finished) {
          const st = gameStateRef.current
          const focus =
            tutView.spotlight === TutorialSpotlightKind.ship
              ? st.ship.pos
              : tutView.spotlight === TutorialSpotlightKind.enemy
                ? (st.enemies.find((e) => e.id === tutorialTargetIdRef.current)?.pos ?? null)
                : tutView.spotlight === TutorialSpotlightKind.metal
                  ? (st.collectibles.find((c) => c.kind === CollectibleKind.spaceMetal)?.pos ??
                    null)
                  : tutView.spotlight === TutorialSpotlightKind.mine
                    ? (st.hazards[0]?.pos ?? null)
                    : null
          drawTutorialFocus(ctx, cameraRef.current, focus, {
            reducedMotion: reducedMotionRef.current,
            pulseClock: time / 1000,
          })
        }
      }

      const state = gameStateRef.current
      if (shouldSyncUI(state.phase, prevPhase, input.clicks.length > 0)) {
        syncUI(state)
      }

      rafRef.current = requestAnimationFrame(loop)
    }

    rafRef.current = requestAnimationFrame(loop)
    syncUI(gameStateRef.current)

    return () => {
      cancelAnimationFrame(rafRef.current)
      canvas.removeEventListener('pointerdown', handlePointerDown)
      canvas.removeEventListener('pointermove', handlePointerMove)
      window.removeEventListener('pointerup', handlePointerUp)
      window.removeEventListener('keydown', handleKeyDown)
      resizeObserver.disconnect()
    }
  }, [
    canvasRef,
    syncUI,
    handlePause,
    handleResume,
    handleUseSpaceMetalAbility,
    enterSector,
    finishTutorial,
  ])

  return {
    uiState,
    hasSave,
    handleStart,
    handleContinue,
    handleSaveAndExit,
    handleSelectShip,
    handleRestart,
    handleSubmitScore,
    setSelectedAbility,
    handlePurchaseUpgrade,
    handlePurchaseUltimate,
    handleSalvageAbility,
    handleFinishUpgrades,
    handlePause,
    handleResume,
    handleSetSpeed,
    handleUseSpaceMetalAbility,
    handleStartTutorial,
    handleSkipTutorial,
    handleTutorialAck,
    handleDevPatch,
    handleDevJumpToUpgrades,
    handleDevJumpToBoss,
    handleDevQuickStart,
    handleDevSpawnCalamity,
    spaceMetalAbilities: SPACE_METAL_ABILITIES,
  }
}
