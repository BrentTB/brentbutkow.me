import { describe, it, expect } from 'vitest'
import { pickFrame } from './sprite-cache'

describe('pickFrame', () => {
  it('returns 0 for a single-frame animation', () => {
    expect(pickFrame(1, 0.1, 5)).toBe(0)
  })

  it('returns 0 when the frame duration is non-positive', () => {
    expect(pickFrame(4, 0, 5)).toBe(0)
  })

  it('selects the frame for the current time within the loop', () => {
    // 4 frames × 0.1s → 0.4s loop. Sampled mid-frame to dodge float-boundary noise.
    expect(pickFrame(4, 0.1, 0.05)).toBe(0)
    expect(pickFrame(4, 0.1, 0.15)).toBe(1)
    expect(pickFrame(4, 0.1, 0.25)).toBe(2)
    expect(pickFrame(4, 0.1, 0.35)).toBe(3)
  })

  it('wraps via modulo into the next loop', () => {
    expect(pickFrame(4, 0.1, 0.45)).toBe(0)
    expect(pickFrame(4, 0.1, 0.55)).toBe(1)
    expect(pickFrame(4, 0.1, 0.85)).toBe(0) // two full loops + 0.05
  })

  it('never exceeds the last index', () => {
    expect(pickFrame(4, 0.1, 0.399)).toBe(3)
  })

  it('normalizes negative elapsed', () => {
    expect(pickFrame(4, 0.1, -0.05)).toBe(3)
  })
})
