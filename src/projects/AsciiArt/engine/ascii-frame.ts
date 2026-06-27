import { AsciiGrid, BackgroundMode, RenderMode } from '../ascii-art.types'
import { CELL_ASPECT, EDGE_THRESHOLD } from '../data'
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
  // Glyph-selection style and the Sobel edge threshold for `edges`.
  renderMode?: RenderMode
  edgeThreshold?: number
}

// Edge glyph per gradient-orientation bin (0, 45, 90, 135 degrees). Each glyph
// runs along the edge — perpendicular to the gradient that bin represents.
const EDGE_CHARS = ['|', '/', '-', '\\'] as const

// Sobel edge detection over the luminance grid: cells whose gradient magnitude
// clears the threshold become a directional line glyph; the rest are blank.
export function sobelEdgeChars(
  lum: ArrayLike<number>,
  cols: number,
  rows: number,
  threshold: number
): string[] {
  const out = new Array<string>(cols * rows).fill(' ')
  const at = (x: number, y: number) => {
    const cx = x < 0 ? 0 : x >= cols ? cols - 1 : x
    const cy = y < 0 ? 0 : y >= rows ? rows - 1 : y
    return lum[cy * cols + cx]
  }
  for (let y = 0; y < rows; y++) {
    for (let x = 0; x < cols; x++) {
      const tl = at(x - 1, y - 1)
      const tc = at(x, y - 1)
      const tr = at(x + 1, y - 1)
      const ml = at(x - 1, y)
      const mr = at(x + 1, y)
      const bl = at(x - 1, y + 1)
      const bc = at(x, y + 1)
      const br = at(x + 1, y + 1)
      const gx = tr + 2 * mr + br - (tl + 2 * ml + bl)
      const gy = bl + 2 * bc + br - (tl + 2 * tc + tr)
      if (Math.hypot(gx, gy) < threshold) continue
      // Gradient orientation (ignore sign); EDGE_CHARS maps it to the edge glyph.
      const angle = (Math.atan2(gy, gx) + Math.PI) % Math.PI
      out[y * cols + x] = EDGE_CHARS[Math.round(angle / (Math.PI / 4)) % 4]
    }
  }
  return out
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

// Luminance scratch for edge mode, grown to the largest grid seen and reused so
// the render loop never allocates it per frame.
let lumBuffer = new Float32Array(0)
const lumScratch = (size: number): Float32Array => {
  if (lumBuffer.length < size) lumBuffer = new Float32Array(size)
  return lumBuffer
}

// Converts downsampled RGBA pixels (cols x rows, from canvas getImageData) into
// an ASCII grid. Brightness picks the glyph; the raw RGB rides along so the
// renderer can tint in color mode.
export function buildAsciiGrid(
  pixels: Uint8ClampedArray,
  cols: number,
  rows: number,
  {
    ramp,
    invert,
    invertColor = false,
    brightness = 0,
    contrast = 1,
    renderMode = RenderMode.normal,
    edgeThreshold = EDGE_THRESHOLD,
  }: FrameOptions
): AsciiGrid {
  const count = cols * rows
  const adjusting = brightness !== 0 || contrast !== 1
  const edges = renderMode === RenderMode.edges
  // Edge mode is magnitude-based, so brightness polarity has no meaning there.
  const negate = invertColor && !edges
  // Edges need the whole luminance grid before the Sobel pass; reuse a scratch
  // buffer. Normal mode reads luminance inline, so it allocates nothing extra.
  const lum = edges ? lumScratch(count) : null

  const cells: AsciiGrid['cells'] = new Array(count)
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
    const l = luminance(r, g, b)
    if (lum) lum[i] = l
    // Edge glyphs come from the Sobel pass below; normal mode resolves now.
    const char = edges ? ' ' : brightnessToChar(l, ramp, invert)
    cells[i] = negate ? { char, r: 255 - r, g: 255 - g, b: 255 - b } : { char, r, g, b }
  }

  if (lum) {
    const chars = sobelEdgeChars(lum, cols, rows, edgeThreshold)
    for (let i = 0; i < count; i++) cells[i].char = chars[i]
  }

  return { cols, rows, cells }
}
