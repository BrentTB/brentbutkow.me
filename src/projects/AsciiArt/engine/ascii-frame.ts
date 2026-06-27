import { AsciiGrid, BackgroundMode } from '../ascii-art.types'
import { CELL_ASPECT } from '../data'
import { brightnessToChar } from './ramp'
import { luminance } from './luminance'

type FrameOptions = {
  ramp: string
  invert: boolean
  // Negate the carried RGB so color mode reads as a true photo negative. Keyed
  // off the user's invert, separate from the background-resolved `invert` above.
  invertColor?: boolean
  // Pre-map tone adjustment. brightness adds, contrast scales around mid-gray.
  brightness?: number
  contrast?: number
}

// Applies brightness/contrast to a single 0-255 channel, clamped to a byte.
export function adjustChannel(value: number, brightness: number, contrast: number): number {
  const adjusted = (value - 128) * contrast + 128 + brightness
  return adjusted < 0 ? 0 : adjusted > 255 ? 255 : Math.round(adjusted)
}

// Flattens an ASCII grid to plain text — rows joined by newlines.
export function gridToText(grid: AsciiGrid): string {
  const lines: string[] = []
  for (let row = 0; row < grid.rows; row++) {
    let line = ''
    for (let col = 0; col < grid.cols; col++) line += grid.cells[row * grid.cols + col].char
    lines.push(line)
  }
  return lines.join('\n')
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
  { ramp, invert, invertColor = false, brightness = 0, contrast = 1 }: FrameOptions
): AsciiGrid {
  const count = cols * rows
  const cells: AsciiGrid['cells'] = new Array(count)
  const adjusting = brightness !== 0 || contrast !== 1
  // `invert` here is the already-resolved brightness polarity (see
  // shouldInvertBrightness). The glyph reads (adjusted) brightness; color may be
  // negated independently for the photo-negative look.
  for (let i = 0; i < count; i++) {
    const p = i * 4
    let r = pixels[p]
    let g = pixels[p + 1]
    let b = pixels[p + 2]
    if (adjusting) {
      r = adjustChannel(r, brightness, contrast)
      g = adjustChannel(g, brightness, contrast)
      b = adjustChannel(b, brightness, contrast)
    }
    const char = brightnessToChar(luminance(r, g, b), ramp, invert)
    cells[i] = invertColor ? { char, r: 255 - r, g: 255 - g, b: 255 - b } : { char, r, g, b }
  }
  return { cols, rows, cells }
}
