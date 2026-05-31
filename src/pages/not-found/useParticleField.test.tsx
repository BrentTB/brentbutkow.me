import { describe, it, expect } from 'vitest'
import { renderHook } from '@testing-library/react'
import { useParticleField } from './useParticleField'

// jsdom has no 2D canvas context, so this exercises the graceful early-return
// (no canvas / no context) rather than the particle animation itself.
describe('useParticleField', () => {
  it('no-ops when the canvas ref is empty', () => {
    expect(() => renderHook(() => useParticleField({ current: null }, 0.1, 0.9))).not.toThrow()
  })
})
