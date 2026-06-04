import { useEffect, useRef, useState, useCallback } from 'react'
import {
  createInitialState,
  moveToShipSelection,
  startGame,
  startNextWave,
  updateGameState,
  applyUpgradeToState,
  finishUpgradeScreen,
  rechargeShieldWithMetal,
} from './engine/game-loop'
import { AbilityKind, GamePhase, ShipKind } from './engine/types'
import type { GameState, PlayerInput, Vec2, UpgradeId, PlayerUpgrades } from './engine/types'
import { createShip } from './engine/entities/entityCreator'
import { getLevel } from './engine/upgrades'
import { WAVES_PER_LEVEL } from './data'
import { HOLD_ABILITIES } from './engine/abilities'
import {
  createGameTime,
  tickGameTime,
  pauseGameTime,
  resumeGameTime,
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
import { WORLD_SIZE } from './data'

// Build-time literal, same as in NullSpace.tsx
const DEV_MODE = import.meta.env.VITE_NULL_SPACE_DEV_MODE === 'true'

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
  abilities: GameState['abilities']
  upgrades: PlayerUpgrades
  selectedAbility: GameState['abilities'][number]['kind']
  spawnedInWave: number
  totalWaveEnemies: number
}

// Patch shape for the dev console — every field optional, undefined means
// "leave alone." The hook merges this onto the live GameState in one shot.
export type DevPatch = {
  shipKind?: ShipKind
  shipHp?: number
  shipMaxHp?: number
  shipShield?: number
  shipMaxShield?: number
  shipDamage?: number
  shipFireRate?: number
  shipSpeed?: number
  score?: number
  currency?: number
  spaceMetal?: number
  power?: number
  maxPower?: number
  wave?: number
}

// Number keys select abilities by their position in the list (WEAPON_ORDER),
// so the hotkey always matches the HUD badge.
export function abilityKindForHotkey(
  abilities: GameState['abilities'],
  key: string
): GameState['abilities'][number]['kind'] | null {
  const index = Number(key) - 1
  if (!Number.isInteger(index) || index < 0) return null
  const ability = abilities[index]
  return ability?.unlocked ? ability.kind : null
}

export function useNullSpace(canvasRef: React.RefObject<HTMLCanvasElement | null>) {
  const [uiState, setUiState] = useState<GameUIState>({
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
    abilities: [],
    upgrades: {} as PlayerUpgrades,
    selectedAbility: AbilityKind.meteorite,
    spawnedInWave: 0,
    totalWaveEnemies: 0,
  })

  const gameStateRef = useRef<GameState>(createInitialState())
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
      abilities: state.abilities,
      upgrades: state.upgrades,
      selectedAbility: selectedAbilityRef.current,
      spawnedInWave: state.spawnedInWave,
      totalWaveEnemies: state.totalWaveEnemies,
    })
  }, [])

  const handleStart = useCallback(() => {
    gameStateRef.current = moveToShipSelection(gameStateRef.current)
    syncUI(gameStateRef.current)
  }, [syncUI])

  const handleSelectShip = useCallback(
    (kind: ShipKind) => {
      gameStateRef.current = startGame(gameStateRef.current, kind)
      gameStateRef.current = startNextWave(gameStateRef.current)
      selectedAbilityRef.current = AbilityKind.meteorite
      cameraRef.current = centerCameraOn(
        cameraRef.current,
        gameStateRef.current.ship.pos,
        gameStateRef.current.worldSize
      )
      syncUI(gameStateRef.current)
    },
    [syncUI]
  )

  const handleNextWave = useCallback(() => {
    gameStateRef.current = startNextWave(gameStateRef.current)
    syncUI(gameStateRef.current)
  }, [syncUI])

  const handleRestart = useCallback(() => {
    handleStart()
  }, [handleStart])

  const handleUseSpaceMetalShield = useCallback(() => {
    gameStateRef.current = rechargeShieldWithMetal(gameStateRef.current)
    syncUI(gameStateRef.current)
  }, [syncUI])

  // Dev-only handlers. Stubbed to no-ops by default; the `if (DEV_MODE)` block
  // below rebinds them with real implementations. When DEV_MODE folds to
  // `false` at build time, Rollup removes the whole block, taking the
  // createShip / getLevel / WAVES_PER_LEVEL imports with it.
  let handleDevPatch: (patch: DevPatch) => void = noop
  let handleDevJumpToUpgrades: () => void = noop
  let handleDevQuickStart: (kind: ShipKind) => void = noop

  if (DEV_MODE) {
    handleDevPatch = (patch: DevPatch) => {
      const state = gameStateRef.current
      let ship = state.ship
      let shipKind = state.shipKind

      if (patch.shipKind !== undefined && patch.shipKind !== state.shipKind) {
        const fresh = createShip(patch.shipKind, state.worldSize)
        ship = { ...fresh, pos: ship.pos, vel: ship.vel, patrolAngle: ship.patrolAngle }
        shipKind = patch.shipKind
      }
      if (patch.shipMaxHp !== undefined) ship = { ...ship, maxHp: patch.shipMaxHp }
      if (patch.shipHp !== undefined) ship = { ...ship, hp: patch.shipHp }
      if (patch.shipMaxShield !== undefined) ship = { ...ship, maxShield: patch.shipMaxShield }
      if (patch.shipShield !== undefined) ship = { ...ship, shield: patch.shipShield }
      if (patch.shipDamage !== undefined) ship = { ...ship, damage: patch.shipDamage }
      if (patch.shipFireRate !== undefined) ship = { ...ship, fireRate: patch.shipFireRate }
      if (patch.shipSpeed !== undefined) ship = { ...ship, speed: patch.shipSpeed }

      const wave = patch.wave ?? state.wave
      gameStateRef.current = {
        ...state,
        ship,
        shipKind,
        score: patch.score ?? state.score,
        currency: patch.currency ?? state.currency,
        spaceMetal: patch.spaceMetal ?? state.spaceMetal,
        power: patch.power ?? state.power,
        maxPower: patch.maxPower ?? state.maxPower,
        wave,
        level: patch.wave !== undefined ? getLevel(wave) : state.level,
      }
      syncUI(gameStateRef.current)
    }

    handleDevJumpToUpgrades = () => {
      const state = gameStateRef.current
      const base = state.wave > 0 ? state.wave : 1
      const nextUpgradeWave = Math.ceil(base / WAVES_PER_LEVEL) * WAVES_PER_LEVEL
      gameStateRef.current = {
        ...state,
        phase: GamePhase.upgradeScreen,
        wave: nextUpgradeWave,
        level: getLevel(nextUpgradeWave),
        enemies: [],
        projectiles: [],
        activeEffects: [],
        spawnQueue: [],
        spawnTimer: 0,
        spawnedInWave: 1,
        totalWaveEnemies: 1,
        waveTimer: 0,
      }
      syncUI(gameStateRef.current)
    }

    handleDevQuickStart = (kind: ShipKind) => {
      gameStateRef.current = startGame(gameStateRef.current, kind)
      gameStateRef.current = startNextWave(gameStateRef.current)
      selectedAbilityRef.current = AbilityKind.meteorite
      cameraRef.current = centerCameraOn(
        cameraRef.current,
        gameStateRef.current.ship.pos,
        gameStateRef.current.worldSize
      )
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

  const handleFinishUpgrades = useCallback(() => {
    gameStateRef.current = finishUpgradeScreen(gameStateRef.current)
    syncUI(gameStateRef.current)
  }, [syncUI])

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
    starsRef.current = generateStarfield(WORLD_SIZE.x, WORLD_SIZE.y, 250)

    const resize = () => {
      const parent = canvas.parentElement
      if (!parent) return
      const rect = parent.getBoundingClientRect()
      canvas.width = rect.width
      canvas.height = rect.height
      cameraRef.current = {
        ...cameraRef.current,
        width: rect.width,
        height: rect.height,
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
      if (!inputRef.current.isHolding) return
      if (gameStateRef.current.phase !== GamePhase.playing) return
      const rect = canvas.getBoundingClientRect()
      holdScreenPosRef.current = {
        x: e.clientX - rect.left,
        y: e.clientY - rect.top,
      }
    }

    const handlePointerUp = () => {
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
      if (e.key === 'f' || e.key === 'F') {
        handleUseSpaceMetalShield()
        return
      }
      const kind = abilityKindForHotkey(gameStateRef.current.abilities, e.key)
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
      }
      // clicks reset each frame; hold state persists until pointerup.
      inputRef.current = {
        ...inputRef.current,
        clicks: [],
        selectedAbility: selectedAbilityRef.current,
      }

      const prevPhase = gameStateRef.current.phase
      gameStateRef.current = updateGameState(gameStateRef.current, dt, input)

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
  }, [canvasRef, syncUI, handlePause, handleResume, handleUseSpaceMetalShield])

  return {
    uiState,
    handleStart,
    handleSelectShip,
    handleNextWave,
    handleRestart,
    setSelectedAbility,
    handlePurchaseUpgrade,
    handleFinishUpgrades,
    handlePause,
    handleResume,
    handleSetSpeed,
    handleUseSpaceMetalShield,
    handleDevPatch,
    handleDevJumpToUpgrades,
    handleDevQuickStart,
  }
}
