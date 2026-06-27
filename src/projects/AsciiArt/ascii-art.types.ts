// What the studio is currently rendering from.
export const SourceKind = {
  none: 'none',
  image: 'image',
  video: 'video',
  webcam: 'webcam',
} as const
export type SourceKind = (typeof SourceKind)[keyof typeof SourceKind]

// Grayscale stays faithful to the original Python tool; color tints each glyph
// by its source RGB.
export const ColorMode = {
  grayscale: 'grayscale',
  color: 'color',
} as const
export type ColorMode = (typeof ColorMode)[keyof typeof ColorMode]

// Canvas background: a dark terminal look or a light "paper" look.
export const BackgroundMode = {
  dark: 'dark',
  light: 'light',
} as const
export type BackgroundMode = (typeof BackgroundMode)[keyof typeof BackgroundMode]

// How brightness maps to glyphs. `normal` is straight ramp mapping; `edges`
// draws Sobel outlines as line art.
export const RenderMode = {
  normal: 'normal',
  edges: 'edges',
} as const
export type RenderMode = (typeof RenderMode)[keyof typeof RenderMode]

// One character cell plus the source color riding along for color rendering.
type AsciiCell = {
  char: string
  r: number
  g: number
  b: number
}

// Row-major grid; `cells` length is always `cols * rows`.
export type AsciiGrid = {
  cols: number
  rows: number
  cells: AsciiCell[]
}
