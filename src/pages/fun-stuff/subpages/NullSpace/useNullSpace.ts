import { useEffect, useRef, useState, useCallback } from 'react'
import {
  createInitialState,
  startGame,
  startNextWave,
  updateGameState,
  applyUpgradeToState,
  finishUpgradeScreen,
} from './engine/game-loop'
import { AbilityKind, GamePhase } from './engine/types'
import type { GameState, PlayerInput, Vec2, UpgradeId, PlayerUpgrades } from './engine/types'
import { buildSpriteCache, type SpriteCache } from './renderer/sprite-cache'
import { createCamera, updateCamera, screenToWorld, type Camera } from './renderer/camera'
import { generateStarfield, type Star } from './renderer/starfield'
import { renderFrame } from './renderer/renderer'
import { WORLD_SIZE } from './data'

export type GameUIState = {
  phase: GameState['phase']
  score: number
  highScore: number
  isNewHighScore: boolean
  wave: number
  level: number
  shipHp: number
  shipMaxHp: number
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

// Number keys select abilities by their position in the list (which is sorted
// by power cost), so the hotkey matches the HUD badge regardless of ability order.
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
    score: 0,
    highScore: 0,
    isNewHighScore: false,
    wave: 0,
    level: 0,
    shipHp: 100,
    shipMaxHp: 100,
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
  const lastTimeRef = useRef<number>(0)
  const inputRef = useRef<PlayerInput>({ clicks: [], selectedAbility: AbilityKind.meteorite })
  const selectedAbilityRef = useRef<GameState['abilities'][number]['kind']>(AbilityKind.meteorite)

  const syncUI = useCallback((state: GameState) => {
    setUiState({
      phase: state.phase,
      score: state.score,
      highScore: state.highScore,
      isNewHighScore: state.isNewHighScore,
      wave: state.wave,
      level: state.level,
      shipHp: state.ship.hp,
      shipMaxHp: state.ship.maxHp,
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
    gameStateRef.current = startGame(gameStateRef.current)
    gameStateRef.current = startNextWave(gameStateRef.current)
    selectedAbilityRef.current = AbilityKind.meteorite
    syncUI(gameStateRef.current)
  }, [syncUI])

  const handleNextWave = useCallback(() => {
    gameStateRef.current = startNextWave(gameStateRef.current)
    syncUI(gameStateRef.current)
  }, [syncUI])

  const handleRestart = useCallback(() => {
    handleStart()
  }, [handleStart])

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
      }
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
      inputRef.current = {
        ...inputRef.current,
        clicks: [...inputRef.current.clicks, worldPos],
        selectedAbility: selectedAbilityRef.current,
      }
    }

    const handleKeyDown = (e: KeyboardEvent) => {
      if (gameStateRef.current.phase !== GamePhase.playing) return
      const kind = abilityKindForHotkey(gameStateRef.current.abilities, e.key)
      if (kind) {
        selectedAbilityRef.current = kind
        syncUI(gameStateRef.current)
      }
    }

    canvas.addEventListener('pointerdown', handlePointerDown)
    window.addEventListener('keydown', handleKeyDown)

    const loop = (time: number) => {
      if (lastTimeRef.current === 0) lastTimeRef.current = time
      const dt = Math.min((time - lastTimeRef.current) / 1000, 0.1)
      lastTimeRef.current = time

      const input: PlayerInput = {
        clicks: inputRef.current.clicks,
        selectedAbility: inputRef.current.selectedAbility,
      }
      inputRef.current = { clicks: [], selectedAbility: selectedAbilityRef.current }

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
      window.removeEventListener('keydown', handleKeyDown)
      resizeObserver.disconnect()
    }
  }, [canvasRef, syncUI])

  return {
    uiState,
    handleStart,
    handleNextWave,
    handleRestart,
    setSelectedAbility,
    handlePurchaseUpgrade,
    handleFinishUpgrades,
  }
}
