import { describe, it, expect } from 'vitest'
import { renderHook } from '@testing-library/react'
import { useWaterRipple } from './useWaterRipple'

// WebGL isn't available under jsdom, so these exercise the graceful early-return
// paths (no canvas / no WebGL context) rather than the render loop itself.
describe('useWaterRipple', () => {
  it('no-ops when the canvas ref is empty', () => {
    expect(() => renderHook(() => useWaterRipple({ current: null }))).not.toThrow()
  })

  it('no-ops when WebGL is unavailable', () => {
    const canvas = document.createElement('canvas')
    expect(() => renderHook(() => useWaterRipple({ current: canvas }))).not.toThrow()
  })
})
