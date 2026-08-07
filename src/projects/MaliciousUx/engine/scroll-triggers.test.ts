import { describe, expect, it } from 'vitest'
import { dueInterruption, INTERRUPTION_DEPTHS, scrollDepth } from './scroll-triggers'

describe('scrollDepth', () => {
  it('reports nothing for content that does not scroll', () => {
    expect(scrollDepth(0, 200, 200)).toBe(0)
  })

  it('reports the fraction of the scrollable distance covered', () => {
    expect(scrollDepth(50, 300, 200)).toBe(0.5)
  })

  it('clamps to the ends rather than reporting past them', () => {
    expect(scrollDepth(-40, 300, 200)).toBe(0)
    expect(scrollDepth(400, 300, 200)).toBe(1)
  })
})

describe('dueInterruption', () => {
  it('holds back until the reader reaches the first depth', () => {
    expect(dueInterruption(INTERRUPTION_DEPTHS[0] - 0.01, 0)).toBeNull()
    expect(dueInterruption(INTERRUPTION_DEPTHS[0], 0)).toBe(0)
  })

  it('pays out each depth once, in order', () => {
    // Deep enough for all of them, but only the next unspent one is due.
    expect(dueInterruption(1, 0)).toBe(0)
    expect(dueInterruption(1, 1)).toBe(1)
    expect(dueInterruption(1, 2)).toBe(2)
  })

  it('stops once every interruption has been spent', () => {
    expect(dueInterruption(1, INTERRUPTION_DEPTHS.length)).toBeNull()
  })

  it('does not fire the second one early just because the first is spent', () => {
    expect(dueInterruption(INTERRUPTION_DEPTHS[0], 1)).toBeNull()
  })
})
