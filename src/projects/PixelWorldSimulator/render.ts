import { Grid } from './pixel-world.types'
import { isEmissive, writeCellRgb, writeHeatTint } from './engine/palette'

/** Blur radius of the glow pass, in grid cells. */
const GLOW_BLUR = 2

export type Renderer = {
  draw(grid: Grid): void
}

/**
 * One `putImageData` per frame into a canvas whose backing store is the grid itself — CSS scales it
 * up and `image-rendering: pixelated` keeps the cells crisp, so there's no per-cell drawing call.
 * Buffers are allocated once and rewritten in place.
 *
 * Fire and lava get a second, blurred pass composited additively, which is what makes them read as
 * light rather than orange paint. It only runs while something emissive is on screen.
 *
 * Temperature gets a third pass: a warm or cold tint over cells away from room temperature, so heating
 * something is visible before it crosses a threshold. Both extra passes are skipped entirely when there
 * is nothing hot, cold or alight to draw.
 */
export function createRenderer(canvas: HTMLCanvasElement, width: number, height: number): Renderer {
  canvas.width = width
  canvas.height = height

  const context = canvas.getContext('2d')
  const image = context?.createImageData(width, height) ?? null

  const glowCanvas = document.createElement('canvas')
  glowCanvas.width = width
  glowCanvas.height = height
  const glowContext = glowCanvas.getContext('2d')
  const glowImage = glowContext?.createImageData(width, height) ?? null

  const heatCanvas = document.createElement('canvas')
  heatCanvas.width = width
  heatCanvas.height = height
  const heatContext = heatCanvas.getContext('2d')
  const heatImage = heatContext?.createImageData(width, height) ?? null

  return {
    draw(grid) {
      if (!context || !image) return

      const pixels = image.data
      const glowPixels = glowImage?.data
      const heatPixels = heatImage?.data
      let emissiveCells = 0
      let tintedCells = 0

      for (let y = 0; y < height; y++) {
        const row = y * width
        for (let x = 0; x < width; x++) {
          const cell = row + x
          const offset = cell * 4
          const material = grid.material[cell]
          const burn = grid.burn[cell]

          writeCellRgb(pixels, offset, material, burn, x, y)

          if (heatPixels && writeHeatTint(heatPixels, offset, grid.temperature[cell])) tintedCells++

          if (!glowPixels) continue
          if (isEmissive(material, burn)) {
            glowPixels[offset] = pixels[offset]
            glowPixels[offset + 1] = pixels[offset + 1]
            glowPixels[offset + 2] = pixels[offset + 2]
            glowPixels[offset + 3] = 255
            emissiveCells++
          } else {
            glowPixels[offset + 3] = 0
          }
        }
      }

      context.putImageData(image, 0, 0)

      // Temperature goes on before the glow, so a flame still blooms over the warmth around it.
      if (tintedCells > 0 && heatContext && heatImage) {
        heatContext.putImageData(heatImage, 0, 0)
        context.save()
        context.globalCompositeOperation = 'lighter'
        context.drawImage(heatCanvas, 0, 0)
        context.restore()
      }

      if (emissiveCells === 0 || !glowContext || !glowImage) return
      glowContext.putImageData(glowImage, 0, 0)
      context.save()
      context.filter = `blur(${GLOW_BLUR}px)`
      context.globalCompositeOperation = 'lighter'
      context.drawImage(glowCanvas, 0, 0)
      context.restore()
    },
  }
}
