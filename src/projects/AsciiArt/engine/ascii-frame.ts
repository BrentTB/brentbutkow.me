import { AsciiGrid } from '../ascii-art.types'
import { CELL_ASPECT } from '../data'
import { brightnessToChar } from './ramp'
import { luminance } from './luminance'

type FrameOptions = {
  ramp: string
  invert: boolean
}

// Rows that keep the ASCII output proportional to the source, accounting for the
// tall monospace cell (each row renders at 2x a column's width).
export function gridRows(
  cols: number,
  srcWidth: number,
  srcHeight: number,
  cellAspect = CELL_ASPECT
): number {
  if (srcWidth <= 0 || srcHeight <= 0) return 0
  return Math.max(1, Math.round(cols * (srcHeight / srcWidth) * cellAspect))
}

// Converts downsampled RGBA pixels (cols x rows, from canvas getImageData) into
// an ASCII grid. Brightness picks the glyph; the raw RGB rides along so the
// renderer can tint in color mode.
export function buildAsciiGrid(
  pixels: Uint8ClampedArray,
  cols: number,
  rows: number,
  { ramp, invert }: FrameOptions
): AsciiGrid {
  const count = cols * rows
  const cells: AsciiGrid['cells'] = new Array(count)
  // The ramp is paper-ordered (dense glyph = dark pixel). We draw light glyphs on
  // a dark canvas, where a dense cluster reads as bright — the inverse of paper.
  // So invert brightness by default to keep tone true; the `invert` option flips
  // back to the negative look.
  for (let i = 0; i < count; i++) {
    const p = i * 4
    const r = pixels[p]
    const g = pixels[p + 1]
    const b = pixels[p + 2]
    cells[i] = { char: brightnessToChar(luminance(r, g, b), ramp, !invert), r, g, b }
  }
  return { cols, rows, cells }
}
