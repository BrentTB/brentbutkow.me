import { useEffect, useRef, useState, useCallback } from 'react'
import {
  createInitialState,
  equipShipWeapon,
  moveToShipSelection,
  startGame,
  startNextWave,
  updateGameState,
  applyUpgradeToState,
  applyUltimatePurchaseToState,
  finishUpgradeScreen,
  completeWarp,
} from './engine/game-loop'
import { devJumpToBoss, devJumpToUpgrades, devPatchState, type DevPatch } from './engine/dev-tools'
import { isBaseReplacedByUltimate } from './engine/ultimates'
import { ULTIMATE_KIND_OF } from './engine/abilities'
import { AbilityKind, EnemyKind, GamePhase, ShipKind, ShipWeaponKind } from './engine/types'
import type { GameState, PlayerInput, Vec2, PlayerUpgrades } from './engine/types'
import type { UpgradeId } from './engine/upgrade-ids'
import { getBossDefinition } from './engine/bosses/index'
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
import { buildSpriteCache, type SpriteCache } from './renderer/sprite-cache'
import {
  createCamera,
  updateCamera,
  centerCameraOn,
  computeZoom,
  screenToWorld,
  type Camera,
} from './renderer/camera'
import { generateStarfield, type Star } from './renderer/starfield'
import { renderFrame } from './renderer/renderer'
import { drawSlingAim } from './renderer/sling-aim'
import { WORLD_SIZE } from './data'

// Build-time literal, same as in NullSpace.tsx
const DEV_MODE = import.meta.env.VITE_NULL_SPACE_DEV_MODE === 'true'

// Background star count — reseeded to the corridor dimensions on each sector entry.
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
  wave: number
  level: number
  shipHp: number
  shipMaxHp: number
  shipShield: number
  shipMaxShield: number
  shieldCooldownRemaining: number
  shipDamage: number
  shipFireRate: number
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
  levelUpWeaponOffers: GameState['levelUpWeaponOffers']
  unlockedWeapons: GameState['unlockedWeapons']
  equippedWeapons: GameState['ship']['equippedWeapons']
  escapeModeActive: boolean
  slingHeat: number
  slingOverheated: boolean
  boss: { hp: number; maxHp: number; label: string } | null
  nextBoss: EnemyKind
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

export function useNullSpace(canvasRef: React.RefObject<HTMLCanvasElement | null>) {
  const gameStateRef = useRef<GameState>(createInitialState())

  const [uiState, setUiState] = useState<GameUIState>(() => ({
    phase: GamePhase.menu,
    shipKind: ShipKind.fighter,
    score: 0,
    highScore: 0,
    isNewHighScore: false,
    wave: 0,
    level: 0,
    shipHp: 100,
    shipMaxHp: 100,
    shipShield: 50,
    shipMaxShield: 50,
    shieldCooldownRemaining: 0,
    shipDamage: 0,
    shipFireRate: 0,
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
    levelUpWeaponOffers: [],
    unlockedWeapons: [ShipWeaponKind.bullet],
    equippedWeapons: [ShipWeaponKind.bullet],
    escapeModeActive: false,
    slingHeat: 0,
    slingOverheated: false,
    boss: null,
    nextBoss: gameStateRef.current.bossSelection.nextBoss,
  }))

  const cameraRef = useRef<Camera>(createCamera(800, 600))
  const spritesRef = useRef<SpriteCache | null>(null)
  const starsRef = useRef<Star[]>([])
  const rafRef = useRef<number>(0)
  const gameTimeRef = useRef<GameTime>(createGameTime())
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

  const syncUI = useCallback((state: GameState) => {
    setUiState({
      phase: state.phase,
      shipKind: state.shipKind,
      score: state.score,
      highScore: state.highScore,
      isNewHighScore: state.isNewHighScore,
      wave: state.wave,
      level: state.level,
      shipHp: state.ship.hp,
      shipMaxHp: state.ship.maxHp,
      shipShield: state.ship.shield,
      shipMaxShield: state.ship.maxShield,
      shieldCooldownRemaining: state.ship.shieldCooldownRemaining,
      shipDamage: state.ship.damage,
      shipFireRate: state.ship.fireRate,
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
      spawnedInWave: state.spawnedInWave,
      totalWaveEnemies: state.totalWaveEnemies,
      enemiesAlive: state.enemies.length,
      levelUpWeaponOffers: state.levelUpWeaponOffers,
      unlockedWeapons: state.unlockedWeapons,
      equippedWeapons: state.ship.equippedWeapons,
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
    })
  }, [])

  // Snap the camera onto the ship and reseed the starfield to the active corridor
  // dimensions — called whenever a fresh corridor is laid out (game start, warp).
  const enterCorridor = useCallback(() => {
    cameraRef.current = centerCameraOn(
      cameraRef.current,
      gameStateRef.current.ship.pos,
      gameStateRef.current.worldSize
    )
    starsRef.current = generateStarfield(
      gameStateRef.current.worldSize.x,
      gameStateRef.current.worldSize.y,
      STAR_COUNT
    )
  }, [])

  const handleStart = useCallback(() => {
    gameStateRef.current = moveToShipSelection(gameStateRef.current)
    syncUI(gameStateRef.current)
  }, [syncUI])

  const handleSelectShip = useCallback(
    (kind: ShipKind) => {
      gameStateRef.current = startGame(gameStateRef.current, kind)
      gameStateRef.current = startNextWave(gameStateRef.current)
      gameTimeRef.current = resetGameClock(gameTimeRef.current)
      selectedAbilityRef.current = AbilityKind.meteorite
      enterCorridor()
      syncUI(gameStateRef.current)
    },
    [syncUI, enterCorridor]
  )

  const handleNextWave = useCallback(() => {
    gameStateRef.current = startNextWave(gameStateRef.current)
    syncUI(gameStateRef.current)
  }, [syncUI])

  const handleRestart = useCallback(() => {
    handleStart()
  }, [handleStart])

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

    handleDevQuickStart = (kind: ShipKind) => {
      gameStateRef.current = startGame(gameStateRef.current, kind)
      gameStateRef.current = startNextWave(gameStateRef.current)
      gameTimeRef.current = resetGameClock(gameTimeRef.current)
      selectedAbilityRef.current = AbilityKind.meteorite
      enterCorridor()
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

  const handleFinishUpgrades = useCallback(() => {
    gameStateRef.current = finishUpgradeScreen(gameStateRef.current)
    syncUI(gameStateRef.current)
  }, [syncUI])

  const handleEquipShipWeapon = useCallback(
    (slotIndex: number, weapon: ShipWeaponKind) => {
      gameStateRef.current = equipShipWeapon(gameStateRef.current, slotIndex, weapon)
      syncUI(gameStateRef.current)
    },
    [syncUI]
  )

  const handlePause = useCallback(() => {
    if (gameStateRef.current.phase !== GamePhase.playing) return
    gameStateRef.current = { ...gameStateRef.current, phase: GamePhase.paused }
    gameTimeRef.current = pauseGameTime(gameTimeRef.current)
    syncUI(gameStateRef.current)
  }, [syncUI])

  const handleResume = useCallback(() => {
    if (gameStateRef.current.phase !== GamePhase.paused) return
    gameStateRef.current = { ...gameStateRef.current, phase: GamePhase.playing }
    gameTimeRef.current = resumeGameTime(gameTimeRef.current, performance.now())
    syncUI(gameStateRef.current)
  }, [syncUI])

  const handleSetSpeed = useCallback((speed: number) => {
    gameTimeRef.current = setGameSpeed(gameTimeRef.current, speed)
  }, [])

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return

    const ctx = canvas.getContext('2d')
    if (!ctx) return

    spritesRef.current = buildSpriteCache()
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
      cameraRef.current = centerCameraOn(
        cameraRef.current,
        gameStateRef.current.ship.pos,
        gameStateRef.current.worldSize
      )
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
      const grab = tryGrabShip(worldPos, state.ship.pos, screenPos)
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
      const dt = tick.dt

      // Re-resolve hold cursor world-pos every frame from screen-pos so it
      // tracks the actual cursor even as the camera moves.
      const liveHoldPos = holdScreenPosRef.current
        ? screenToWorld(holdScreenPosRef.current, cameraRef.current)
        : null

      const input: PlayerInput = {
        clicks: inputRef.current.clicks,
        selectedAbility: inputRef.current.selectedAbility,
        holdPos: liveHoldPos,
        isHolding: inputRef.current.isHolding,
        fling: pendingFlingRef.current ?? null,
      }
      // clicks + fling are one-shot per frame; hold state persists until pointerup.
      pendingFlingRef.current = null
      inputRef.current = {
        ...inputRef.current,
        clicks: [],
        selectedAbility: selectedAbilityRef.current,
      }

      const prevPhase = gameStateRef.current.phase
      gameStateRef.current = updateGameState(gameStateRef.current, dt, input)

      // Warp transition: the sim is frozen (updateGameState early-returns while
      // not playing), so tick the timer here and jump to the fresh corridor at 0.
      if (gameStateRef.current.phase === GamePhase.warping) {
        const warpTimer = gameStateRef.current.warpTimer - dt
        if (warpTimer <= 0) {
          gameStateRef.current = completeWarp(gameStateRef.current)
          enterCorridor()
        } else {
          gameStateRef.current = { ...gameStateRef.current, warpTimer }
        }
      }

      cameraRef.current = updateCamera(
        cameraRef.current,
        gameStateRef.current.ship.pos,
        dt,
        gameStateRef.current.worldSize
      )

      if (spritesRef.current) {
        renderFrame(
          ctx,
          gameStateRef.current,
          cameraRef.current,
          spritesRef.current,
          starsRef.current
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
      }

      const state = gameStateRef.current
      if (
        state.phase !== prevPhase ||
        input.clicks.length > 0 ||
        state.phase === GamePhase.playing
      ) {
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
  }, [canvasRef, syncUI, handlePause, handleResume, handleUseSpaceMetalAbility, enterCorridor])

  return {
    uiState,
    handleStart,
    handleSelectShip,
    handleNextWave,
    handleRestart,
    setSelectedAbility,
    handlePurchaseUpgrade,
    handlePurchaseUltimate,
    handleFinishUpgrades,
    handleEquipShipWeapon,
    handlePause,
    handleResume,
    handleSetSpeed,
    handleUseSpaceMetalAbility,
    handleDevPatch,
    handleDevJumpToUpgrades,
    handleDevJumpToBoss,
    handleDevQuickStart,
    spaceMetalAbilities: SPACE_METAL_ABILITIES,
  }
}
