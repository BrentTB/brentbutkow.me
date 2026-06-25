import { ColorMode } from './ascii-art.types'

// Brightness ramps, darkest -> lightest. `classic` is the exact ramp from the
// original vidToAscii Python tool.
export const Charset = {
  classic: 'NM@B8&X§$#%ZI±+^,.- ',
  blocks: '█▓▒░ ',
  simple: '@%#*+=-:. ',
} as const
export type Charset = (typeof Charset)[keyof typeof Charset]
export type CharsetName = keyof typeof Charset

// Output detail as character ROWS (height). Cols are derived from the source
// aspect so vertical media stays viewable, and glyphs scale to the fixed canvas
// (fewer rows = larger characters).
export const DEFAULT_ROWS = 64
export const MIN_ROWS = 24
export const MAX_ROWS = 120

// Hard cap on derived columns — a perf guard for very wide sources at high rows.
export const MAX_COLS = 400
export const MIN_COLS = 8

// Monospace glyphs are ~2x taller than wide; the derived col/row ratio uses this.
export const CELL_ASPECT = 0.5

// Inset (px) between the canvas and its fixed-size stage box.
export const CANVAS_PAD = 16

// Playback speeds offered for video sources.
export const PLAYBACK_SPEEDS = [0.5, 1, 1.5, 2] as const

// Display canvas colors. Background matches --bg; ink matches --text.
export const ASCII_BACKGROUND = '#0b0c0f'
export const ASCII_INK = '#f3efe7'
export const ASCII_FONT = "'IBM Plex Mono', ui-monospace, 'SF Mono', monospace"

export type AsciiOptions = {
  colorMode: ColorMode
  ramp: string
  rows: number
  invert: boolean
}

export const defaultOptions = (colorMode: ColorMode): AsciiOptions => ({
  colorMode,
  ramp: Charset.classic,
  rows: DEFAULT_ROWS,
  invert: false,
})
