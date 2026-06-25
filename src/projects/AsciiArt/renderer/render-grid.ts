import { AsciiGrid, BackgroundMode, ColorMode } from '../ascii-art.types'
import { ASCII_FONT, ASCII_PALETTE } from '../data'

// Draws an ASCII grid onto a 2D canvas, filling the whole canvas. Cell size is
// derived from the canvas dimensions so the caller controls scale by sizing the
// canvas (cols x rows kept proportional upstream). Color mode tints each glyph by
// its source RGB; grayscale uses the palette ink and lets glyph density carry the
// tone — faithful to the original Python output.
export function renderGrid(
  ctx: CanvasRenderingContext2D,
  grid: AsciiGrid,
  colorMode: ColorMode,
  background: BackgroundMode
): void {
  const { width, height } = ctx.canvas
  const cellW = width / grid.cols
  const cellH = height / grid.rows
  const { bg, ink } = ASCII_PALETTE[background]

  ctx.fillStyle = bg
  ctx.fillRect(0, 0, width, height)

  // Tone on a light canvas comes only from how much of each cell the glyph fills,
  // so dark glyphs on white never read truly dark. Bolder, slightly larger glyphs
  // add coverage and rescue the contrast. The dark canvas keeps its lean look.
  const isLight = background === BackgroundMode.light
  const weight = isLight ? 'bold ' : ''
  const fontScale = isLight ? 1.75 : 1.6
  ctx.font = `${weight}${cellW * fontScale}px ${ASCII_FONT}`
  ctx.textAlign = 'center'
  ctx.textBaseline = 'middle'

  const isColor = colorMode === ColorMode.color
  if (!isColor) ctx.fillStyle = ink

  for (let row = 0; row < grid.rows; row++) {
    const y = row * cellH + cellH / 2
    for (let col = 0; col < grid.cols; col++) {
      const cell = grid.cells[row * grid.cols + col]
      if (cell.char === ' ') continue
      if (isColor) ctx.fillStyle = `rgb(${cell.r},${cell.g},${cell.b})`
      ctx.fillText(cell.char, col * cellW + cellW / 2, y)
    }
  }
}
