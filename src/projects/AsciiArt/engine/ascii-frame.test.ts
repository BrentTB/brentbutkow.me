import { describe, it, expect } from 'vitest'
import { buildAsciiGrid, gridCols, shouldInvertBrightness } from './ascii-frame'
import { BackgroundMode } from '../ascii-art.types'
import { Charset } from '../data'

describe('gridCols', () => {
  it('doubles for the tall monospace cell, scaled by aspect', () => {
    // 50 rows, square source -> 50 / 0.5 = 100 cols.
    expect(gridCols(50, 200, 200)).toBe(100)
    // Portrait source -> fewer cols than rows.
    expect(gridCols(50, 100, 400)).toBe(25)
  })

  it('returns 0 for a source with no dimensions', () => {
    expect(gridCols(50, 0, 0)).toBe(0)
  })
})

describe('buildAsciiGrid', () => {
  // invert:false is the raw paper mapping — dense glyph for a dark pixel.
  it('maps a dark pixel to a dense glyph and a bright pixel to blank (paper)', () => {
    // Two pixels (RGBA): black then white.
    const pixels = new Uint8ClampedArray([0, 0, 0, 255, 255, 255, 255, 255])
    const grid = buildAsciiGrid(pixels, 2, 1, { ramp: Charset.classic, invert: false })

    expect(grid.cols).toBe(2)
    expect(grid.rows).toBe(1)
    expect(grid.cells).toHaveLength(2)
    expect(grid.cells[0].char).toBe(Charset.classic[0])
    expect(grid.cells[1].char).toBe(Charset.classic[Charset.classic.length - 1])
    expect(grid.cells[1]).toMatchObject({ r: 255, g: 255, b: 255 })
  })

  it('flips the brightness mapping when inverted', () => {
    const pixels = new Uint8ClampedArray([0, 0, 0, 255, 255, 255, 255, 255])
    const grid = buildAsciiGrid(pixels, 2, 1, { ramp: Charset.classic, invert: true })
    expect(grid.cells[0].char).toBe(Charset.classic[Charset.classic.length - 1])
    expect(grid.cells[1].char).toBe(Charset.classic[0])
  })
})

describe('shouldInvertBrightness', () => {
  it('inverts on a dark canvas so tone stays true, paper-direct on light', () => {
    expect(shouldInvertBrightness(BackgroundMode.dark, false)).toBe(true)
    expect(shouldInvertBrightness(BackgroundMode.light, false)).toBe(false)
  })

  it('lets the user invert flip whichever is natural for the background', () => {
    expect(shouldInvertBrightness(BackgroundMode.dark, true)).toBe(false)
    expect(shouldInvertBrightness(BackgroundMode.light, true)).toBe(true)
  })
})
