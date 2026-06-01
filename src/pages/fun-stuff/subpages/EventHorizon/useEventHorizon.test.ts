import { describe, it, expect } from 'vitest'
import { renderHook } from '@testing-library/react'
import { useEventHorizon } from './useEventHorizon'
import { createRef } from 'react'

describe('useEventHorizon', () => {
  it('starts in menu phase with a null canvas ref', () => {
    const canvasRef = createRef<HTMLCanvasElement>()
    const { result } = renderHook(() => useEventHorizon(canvasRef))
    expect(result.current.uiState.phase).toBe('menu')
    expect(result.current.uiState.score).toBe(0)
    expect(result.current.uiState.wave).toBe(0)
  })

  it('exposes action callbacks', () => {
    const canvasRef = createRef<HTMLCanvasElement>()
    const { result } = renderHook(() => useEventHorizon(canvasRef))
    expect(typeof result.current.handleStart).toBe('function')
    expect(typeof result.current.handleNextWave).toBe('function')
    expect(typeof result.current.handleRestart).toBe('function')
    expect(typeof result.current.setSelectedAbility).toBe('function')
  })
})
