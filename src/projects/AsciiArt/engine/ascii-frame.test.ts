import { describe, it, expect } from 'vitest'
import {
  adjustChannel,
  buildAsciiGrid,
  gridCols,
  gridToText,
  shouldInvertBrightness,
  sobelEdgeChars,
} from './ascii-frame'
import { BackgroundMode, RenderMode } from '../ascii-art.types'
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

  it('negates the carried RGB when invertColor is set', () => {
    const pixels = new Uint8ClampedArray([10, 20, 30, 255])
    const grid = buildAsciiGrid(pixels, 1, 1, {
      ramp: Charset.classic,
      invert: false,
      invertColor: true,
    })
    expect(grid.cells[0]).toMatchObject({ r: 245, g: 235, b: 225 })
  })

  it('leaves colors un-negated in edge mode (invert does not apply)', () => {
    const pixels = new Uint8ClampedArray([10, 20, 30, 255])
    const grid = buildAsciiGrid(pixels, 1, 1, {
      ramp: Charset.classic,
      invert: false,
      invertColor: true,
      renderMode: RenderMode.edges,
    })
    expect(grid.cells[0]).toMatchObject({ r: 10, g: 20, b: 30 })
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

describe('adjustChannel', () => {
  it('is a no-op at brightness 0 / contrast 1', () => {
    expect(adjustChannel(128, 0, 1)).toBe(128)
    expect(adjustChannel(40, 0, 1)).toBe(40)
  })

  it('adds brightness and clamps to a byte', () => {
    expect(adjustChannel(100, 50, 1)).toBe(150)
    expect(adjustChannel(250, 50, 1)).toBe(255)
    expect(adjustChannel(10, -50, 1)).toBe(0)
  })

  it('scales contrast around mid-gray', () => {
    expect(adjustChannel(128, 0, 2)).toBe(128) // pivot unchanged
    expect(adjustChannel(64, 0, 2)).toBe(0)
    expect(adjustChannel(200, 0, 2)).toBe(255)
  })
})

describe('sobelEdgeChars', () => {
  it('finds no edges in a flat field', () => {
    expect(sobelEdgeChars(new Array(9).fill(120), 3, 3, 48).every((c) => c === ' ')).toBe(true)
  })

  it('marks a vertical boundary with a vertical line glyph', () => {
    const lum: number[] = []
    for (let y = 0; y < 3; y++) for (let x = 0; x < 4; x++) lum.push(x < 2 ? 0 : 255)
    const out = sobelEdgeChars(lum, 4, 3, 48)
    expect(out).toContain('|')
  })
})

describe('gridToText', () => {
  it('joins cell chars per row, rows separated by newlines', () => {
    const pixels = new Uint8ClampedArray([0, 0, 0, 255, 255, 255, 255, 255])
    const oneRow = buildAsciiGrid(pixels, 2, 1, { ramp: Charset.classic, invert: false })
    expect(gridToText(oneRow)).toBe(
      `${Charset.classic[0]}${Charset.classic[Charset.classic.length - 1]}`
    )

    const twoRows = buildAsciiGrid(pixels, 1, 2, { ramp: Charset.classic, invert: false })
    expect(gridToText(twoRows)).toBe(
      `${Charset.classic[0]}\n${Charset.classic[Charset.classic.length - 1]}`
    )
  })
})
