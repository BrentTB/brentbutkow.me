import { BackgroundMode, ColorMode, RenderMode } from './ascii-art.types'

// Brightness ramps, darkest -> lightest.
export const Charset = {
  classic: '$NM@B8&#%§ZXI±+^,-. ',
  blocks: '█▓▒░ ',
  simple: '@%#*+=-:. ',
  shades: '@l. ',
  mono: '@ ',
  waves: '@. @. @. ',
} as const
export type Charset = (typeof Charset)[keyof typeof Charset]
export type CharsetName = keyof typeof Charset
export const DEFAULT_CHARSET: CharsetName = 'classic'

// A charset choice can be a named preset or the user's own ramp string.
export const CUSTOM_CHARSET = 'custom' as const
export type CharsetSelection = CharsetName | typeof CUSTOM_CHARSET
// Seed value when switching to a custom ramp, so it renders something right away.
const DEFAULT_CUSTOM_RAMP = '@%#*+=-:. '

// Output detail as character ROWS (height). Cols are derived from the source
// aspect so vertical media stays viewable, and glyphs scale to the fixed canvas
// (fewer rows = larger characters).
export const DEFAULT_ROWS = 64
export const MIN_ROWS = 24
export const MAX_ROWS = 100

// Hard cap on derived columns — a perf guard for very wide sources at high rows.
export const MAX_COLS = 400
export const MIN_COLS = 8

// Monospace glyphs are ~2x taller than wide; the derived col/row ratio uses this.
export const CELL_ASPECT = 0.5

// Pre-map tone adjustment. Brightness is added to each channel; contrast is a
// factor applied around mid-gray. Defaults (0, 1) are a no-op.
export const BRIGHTNESS_MIN = -100
export const BRIGHTNESS_MAX = 100
export const CONTRAST_MIN = 0.5
export const CONTRAST_MAX = 2.5

// Sobel gradient magnitude above which a cell is drawn as an edge glyph.
export const EDGE_THRESHOLD = 48

// Inset (px) between the canvas and its fixed-size stage box.
export const CANVAS_PAD = 16

// Playback speeds offered for video sources.
export const PLAYBACK_SPEEDS = [0.5, 1, 1.5, 2] as const

// Display canvas palettes per background. Dark matches --bg/--text; light is a
// warm "paper" with dark ink.
export const ASCII_PALETTE = {
  dark: { bg: '#0b0c0f', ink: '#f3efe7' },
  light: { bg: '#f3efe7', ink: '#0b0c0f' },
} as const
export const ASCII_FONT = "'IBM Plex Mono', ui-monospace, 'SF Mono', monospace"

export type AsciiOptions = {
  colorMode: ColorMode
  background: BackgroundMode
  renderMode: RenderMode
  charset: CharsetSelection
  // Used when charset is CUSTOM_CHARSET — the user's own ramp, dark -> light.
  customRamp: string
  rows: number
  invert: boolean
  brightness: number
  contrast: number
  // Mirror the webcam left-to-right (selfie view); ignored for other sources.
  mirror: boolean
}

export const defaultOptions = (colorMode: ColorMode): AsciiOptions => ({
  colorMode,
  background: BackgroundMode.dark,
  renderMode: RenderMode.normal,
  charset: DEFAULT_CHARSET,
  customRamp: DEFAULT_CUSTOM_RAMP,
  rows: DEFAULT_ROWS,
  invert: false,
  brightness: 0,
  contrast: 1,
  mirror: true,
})
