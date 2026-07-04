import { describe, it, expect } from 'vitest'
import {
  cascadeTiming,
  CASCADE_STEP_MS,
  CASCADE_SPREAD_MAX_MS,
  CASCADE_POP_MS,
} from './terminal-cascade'

describe('cascadeTiming', () => {
  it('uses the base step for short completions', () => {
    const { step, clearAfter } = cascadeTiming(2)
    expect(step).toBe(CASCADE_STEP_MS)
    expect(clearAfter).toBe(CASCADE_STEP_MS + CASCADE_POP_MS)
  })

  it('compresses the step so the spread never exceeds the cap', () => {
    const letters = 30
    const { step, clearAfter } = cascadeTiming(letters)
    expect(step).toBeLessThan(CASCADE_STEP_MS)
    // Last letter starts within the spread cap, so the whole thing stays fast.
    expect((letters - 1) * step).toBeCloseTo(CASCADE_SPREAD_MAX_MS)
    expect(clearAfter).toBeCloseTo(CASCADE_SPREAD_MAX_MS + CASCADE_POP_MS)
  })

  it('has no spread for a single letter', () => {
    expect(cascadeTiming(1)).toEqual({ step: 0, clearAfter: CASCADE_POP_MS })
  })
})
