import { Grid } from './pixel-world.types'
import { writeCellRgb } from './engine/palette'

export type Renderer = {
  draw(grid: Grid): void
}

/**
 * One `putImageData` per frame into a canvas whose backing store is the grid itself — CSS scales it
 * up and `image-rendering: pixelated` keeps the cells crisp, so there's no second canvas and no
 * per-cell drawing call. The pixel buffer is allocated once and rewritten in place.
 */
export function createRenderer(canvas: HTMLCanvasElement, width: number, height: number): Renderer {
  canvas.width = width
  canvas.height = height

  const context = canvas.getContext('2d')
  const image = context?.createImageData(width, height) ?? null

  return {
    draw(grid) {
      if (!context || !image) return

      const pixels = image.data
      for (let y = 0; y < height; y++) {
        const row = y * width
        for (let x = 0; x < width; x++) {
          const cell = row + x
          writeCellRgb(pixels, cell * 4, grid.material[cell], x, y)
        }
      }
      context.putImageData(image, 0, 0)
    },
  }
}
