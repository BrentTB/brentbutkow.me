// Falling-glyph "matrix" rain. Pure of React so the per-frame draw stays testable with a mock 2D
// context; the useMatrixRain hook owns the canvas, the rAF loop, and resize/cleanup.

const GLYPHS = 'アイウエオカキクケコサシスセソタチツテト0123456789<>=*+-¦|'
const FONT_SIZE = 16
// A translucent wash each frame fades the previous glyphs into trailing tails.
const TRAIL_WASH = 'rgba(8, 10, 12, 0.09)'
// Matrix green — a deliberate egg-only exception to the site's gold-on-ink palette.
const GLYPH_COLOR = '#4dff88'

const pickGlyph = () => GLYPHS[Math.floor(Math.random() * GLYPHS.length)]
const pickReset = () => Math.random() > 0.975

export type MatrixRain = {
  resize(width: number, height: number): void
  step(): void
}

export function createMatrixRain(
  ctx: CanvasRenderingContext2D,
  width: number,
  height: number,
  randomGlyph: () => string = pickGlyph,
  shouldReset: () => boolean = pickReset
): MatrixRain {
  let columns = 0
  let drops: number[] = []

  const resize = (nextWidth: number, nextHeight: number) => {
    width = nextWidth
    height = nextHeight
    columns = Math.max(1, Math.floor(width / FONT_SIZE))
    // Start each column at a random height so the rain doesn't fall in one flat line.
    drops = Array.from({ length: columns }, () => Math.floor((Math.random() * height) / FONT_SIZE))
  }

  const step = () => {
    ctx.fillStyle = TRAIL_WASH
    ctx.fillRect(0, 0, width, height)
    ctx.fillStyle = GLYPH_COLOR
    ctx.font = `${FONT_SIZE}px monospace`
    for (let i = 0; i < columns; i++) {
      ctx.fillText(randomGlyph(), i * FONT_SIZE, drops[i] * FONT_SIZE)
      if (drops[i] * FONT_SIZE > height && shouldReset()) drops[i] = 0
      drops[i]++
    }
  }

  resize(width, height)
  return { resize, step }
}
