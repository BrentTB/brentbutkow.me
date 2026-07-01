import { AsciiGrid } from '../ascii-art.types'
import {
  AsciiOptions,
  CUSTOM_CHARSET,
  Charset,
  MAX_COLS,
  MAX_ROWS,
  MIN_COLS,
  MIN_ROWS,
} from '../data'
import { buildAsciiGrid, gridCols, shouldInvertBrightness } from './ascii-frame'

const clamp = (value: number, min: number, max: number) => Math.min(max, Math.max(min, value))

// Samples a source (image or the current video frame) down to an ASCII grid for
// the given options, drawing into the supplied sample canvas. Returns null when
// the source has no usable size yet. `flip` mirrors horizontally (webcam selfie).
// Shared by the live render loop and the PDF/text export paths.
export function buildGridFromSource(
  sample: HTMLCanvasElement,
  sctx: CanvasRenderingContext2D,
  src: CanvasImageSource,
  srcWidth: number,
  srcHeight: number,
  options: AsciiOptions,
  flip: boolean
): AsciiGrid | null {
  if (!srcWidth || !srcHeight) return null

  const { charset, customRamp, invert, background, renderMode, brightness, contrast } = options
  const ramp = charset === CUSTOM_CHARSET ? customRamp : Charset[charset]
  const rows = clamp(Math.round(options.rows), MIN_ROWS, MAX_ROWS)
  const cols = clamp(gridCols(rows, srcWidth, srcHeight), MIN_COLS, MAX_COLS)
  if (cols < 1 || rows < 1) return null

  sample.width = cols
  sample.height = rows
  if (flip) {
    sctx.save()
    sctx.translate(cols, 0)
    sctx.scale(-1, 1)
  }
  sctx.drawImage(src, 0, 0, cols, rows)
  if (flip) sctx.restore()

  return buildAsciiGrid(sctx.getImageData(0, 0, cols, rows).data, cols, rows, {
    ramp,
    invert: shouldInvertBrightness(background, invert),
    invertColor: invert,
    brightness,
    contrast,
    renderMode,
  })
}
