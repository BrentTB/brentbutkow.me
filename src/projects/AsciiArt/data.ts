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

// Output width in characters; cost scales with cols * rows, so the slider caps it.
export const DEFAULT_COLS = 110
export const MIN_COLS = 40
export const MAX_COLS = 220

// Monospace glyphs are ~2x taller than wide; halve the vertical sample count so
// the ASCII output keeps the source's proportions (the Python tool's 2x trick).
export const CELL_ASPECT = 0.5

// Pixels per character column on the display canvas; rows render at 2x this.
export const BASE_CELL = 8

// Playback speeds offered for video sources.
export const PLAYBACK_SPEEDS = [0.5, 1, 1.5, 2] as const

// Display canvas colors. Background matches --bg; ink matches --text.
export const ASCII_BACKGROUND = '#0b0c0f'
export const ASCII_INK = '#f3efe7'
export const ASCII_FONT = "'IBM Plex Mono', ui-monospace, 'SF Mono', monospace"

export type AsciiOptions = {
  colorMode: ColorMode
  ramp: string
  cols: number
  invert: boolean
}

export const defaultOptions = (colorMode: ColorMode): AsciiOptions => ({
  colorMode,
  ramp: Charset.classic,
  cols: DEFAULT_COLS,
  invert: false,
})
