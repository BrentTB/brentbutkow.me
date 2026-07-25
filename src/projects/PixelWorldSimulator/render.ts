import { Grid } from './pixel-world.types'
import { isEmissive, writeCellRgb } from './engine/palette'

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

  return {
    draw(grid) {
      if (!context || !image) return

      const pixels = image.data
      const glowPixels = glowImage?.data
      let emissiveCells = 0

      for (let y = 0; y < height; y++) {
        const row = y * width
        for (let x = 0; x < width; x++) {
          const cell = row + x
          const offset = cell * 4
          const material = grid.material[cell]
          const burn = grid.burn[cell]

          writeCellRgb(pixels, offset, material, burn, x, y)

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
