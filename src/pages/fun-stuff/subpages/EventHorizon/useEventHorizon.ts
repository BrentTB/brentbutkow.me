import { useEffect, useRef, useState, useCallback } from 'react'
import { createInitialState, startGame, startNextWave, updateGameState } from './engine/game-loop'
import type { GamePhase, GameState, PlayerInput, AbilityKind, Vec2 } from './engine/types'
import { buildSpriteCache, type SpriteCache } from './renderer/sprite-cache'
import { createCamera, updateCamera, screenToWorld, type Camera } from './renderer/camera'
import { generateStarfield, type Star } from './renderer/starfield'
import { renderFrame } from './renderer/renderer'
import { WORLD_SIZE } from './data'

export type GameUIState = {
  phase: GamePhase
  score: number
  highScore: number
  wave: number
  shipHp: number
  shipMaxHp: number
  power: number
  maxPower: number
  abilities: GameState['abilities']
}

export function useEventHorizon(canvasRef: React.RefObject<HTMLCanvasElement | null>) {
  const [uiState, setUiState] = useState<GameUIState>({
    phase: 'menu',
    score: 0,
    highScore: 0,
    wave: 0,
    shipHp: 100,
    shipMaxHp: 100,
    power: 60,
    maxPower: 100,
    abilities: [],
  })

  const gameStateRef = useRef<GameState>(createInitialState())
  const cameraRef = useRef<Camera>(createCamera(800, 600))
  const spritesRef = useRef<SpriteCache | null>(null)
  const starsRef = useRef<Star[]>([])
  const rafRef = useRef<number>(0)
  const lastTimeRef = useRef<number>(0)
  const inputRef = useRef<PlayerInput>({ clicks: [], selectedAbility: 'meteorStrike' })
  const selectedAbilityRef = useRef<AbilityKind>('meteorStrike')

  const syncUI = useCallback((state: GameState) => {
    setUiState({
      phase: state.phase,
      score: state.score,
      highScore: state.highScore,
      wave: state.wave,
      shipHp: state.ship.hp,
      shipMaxHp: state.ship.maxHp,
      power: state.power,
      maxPower: state.maxPower,
      abilities: state.abilities,
    })
  }, [])

  const handleStart = useCallback(() => {
    gameStateRef.current = startGame(gameStateRef.current)
    gameStateRef.current = startNextWave(gameStateRef.current)
    syncUI(gameStateRef.current)
  }, [syncUI])

  const handleNextWave = useCallback(() => {
    gameStateRef.current = startNextWave(gameStateRef.current)
    syncUI(gameStateRef.current)
  }, [syncUI])

  const handleRestart = useCallback(() => {
    handleStart()
  }, [handleStart])

  const setSelectedAbility = useCallback((kind: AbilityKind) => {
    selectedAbilityRef.current = kind
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
      }
    }
    resize()

    const resizeObserver = new ResizeObserver(resize)
    resizeObserver.observe(canvas.parentElement!)

    const handlePointerDown = (e: PointerEvent) => {
      const state = gameStateRef.current
      if (state.phase !== 'playing') return

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

    canvas.addEventListener('pointerdown', handlePointerDown)

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
      if (state.phase !== prevPhase || input.clicks.length > 0 || state.phase === 'playing') {
        syncUI(state)
      }

      rafRef.current = requestAnimationFrame(loop)
    }

    rafRef.current = requestAnimationFrame(loop)
    syncUI(gameStateRef.current)

    return () => {
      cancelAnimationFrame(rafRef.current)
      canvas.removeEventListener('pointerdown', handlePointerDown)
      resizeObserver.disconnect()
    }
  }, [canvasRef, syncUI])

  return {
    uiState,
    handleStart,
    handleNextWave,
    handleRestart,
    setSelectedAbility,
  }
}
