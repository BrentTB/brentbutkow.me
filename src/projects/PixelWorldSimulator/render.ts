import { Grid, SimSettings } from './pixel-world.types'
import { isEmissive, writeCellRgb, writeHeatTint } from './engine/palette'
import { canAirEnter } from './engine/air'

/** Blur radius of the glow pass, in grid cells. */
const GLOW_BLUR = 2

/**
 * How the flow is shown: moving air is lightened, in proportion to how fast it is going, so a draught reads
 * as a haze thickening and sliding across the world.
 *
 * Drawn as a per-cell tint rather than as arrows or streaks. A lattice of little line segments is the
 * textbook way to picture a flow field and it does not survive being one pixel per cell — at this scale it
 * reads as a grid of dashes rather than as movement, and the direction of each stub is guesswork. The haze
 * carries direction the way the rest of the sim does, by moving.
 */
const FLOW_FULL = 6
/**
 * How much brighter the fastest air gets, in 0-255 units. Faint on purpose: this explains the picture, it is
 * not part of it, and at anything like a third of the range it stopped reading as air and started reading as
 * smoke that was not there.
 */
const FLOW_HAZE = 28

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
 *
 * Settings arrive as a getter rather than a value: the viewer can turn the temperature tint on and off
 * while the world runs, and re-reading it per frame means that never restarts the loop.
 */
export function createRenderer(
  canvas: HTMLCanvasElement,
  width: number,
  height: number,
  readSettings: () => SimSettings
): Renderer {
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

      const settings = readSettings()
      const pixels = image.data
      const glowPixels = glowImage?.data
      // With both tints off there is nothing for the pass to write, so it doesn't run at all.
      const heatPixels =
        settings.tintBlocks || settings.tintAir ? (heatImage?.data ?? undefined) : undefined
      const flowShown = settings.showFlow
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

          if (flowShown && canAirEnter(material)) {
            const speed = Math.abs(grid.airX[cell]) + Math.abs(grid.airY[cell])
            if (speed > 0) {
              // Uint8ClampedArray does the clamping, so a gale saturates instead of wrapping around.
              const lift = Math.min(1, speed / FLOW_FULL) * FLOW_HAZE
              pixels[offset] += lift
              pixels[offset + 1] += lift
              pixels[offset + 2] += lift
            }
          }

          if (
            heatPixels &&
            writeHeatTint(heatPixels, offset, material, grid.temperature[cell], settings)
          )
            tintedCells++

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

      if (emissiveCells > 0 && glowContext && glowImage) {
        glowContext.putImageData(glowImage, 0, 0)
        context.save()
        context.filter = `blur(${GLOW_BLUR}px)`
        context.globalCompositeOperation = 'lighter'
        context.drawImage(glowCanvas, 0, 0)
        context.restore()
      }
    },
  }
}
