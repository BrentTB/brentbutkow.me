import { AsciiGrid, BackgroundMode } from '../ascii-art.types'
import { CELL_ASPECT } from '../data'
import { brightnessToChar } from './ramp'
import { luminance } from './luminance'

type FrameOptions = {
  ramp: string
  invert: boolean
}

// The ramp is paper-ordered (dense glyph = dark). On a dark canvas, light glyphs
// read as bright, so brightness must be inverted to keep tone true; on a light
// canvas the paper mapping is already correct. The user's invert flips whichever
// is natural for the background.
export function shouldInvertBrightness(background: BackgroundMode, userInvert: boolean): boolean {
  return background === BackgroundMode.dark ? !userInvert : userInvert
}

// Columns that keep the ASCII output proportional for a target row count,
// accounting for the tall monospace cell (each row renders at 2x a column's
// width). Driving by rows keeps vertical media from overflowing the canvas.
export function gridCols(
  rows: number,
  srcWidth: number,
  srcHeight: number,
  cellAspect = CELL_ASPECT
): number {
  if (srcWidth <= 0 || srcHeight <= 0) return 0
  return Math.max(1, Math.round((rows * (srcWidth / srcHeight)) / cellAspect))
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
  // `invert` here is the already-resolved brightness polarity (see
  // shouldInvertBrightness) — apply it straight through.
  for (let i = 0; i < count; i++) {
    const p = i * 4
    const r = pixels[p]
    const g = pixels[p + 1]
    const b = pixels[p + 2]
    cells[i] = { char: brightnessToChar(luminance(r, g, b), ramp, invert), r, g, b }
  }
  return { cols, rows, cells }
}
