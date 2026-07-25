import { MATERIALS } from './materials'

/**
 * Deterministic per-cell noise in [-1, 1), from the cell's coordinates alone — so a pile's speckle
 * stays put as the grid scrolls past it rather than crawling.
 */
function jitterAt(x: number, y: number): number {
  let hash = (x * 374761393 + y * 668265263) | 0
  hash = Math.imul(hash ^ (hash >>> 13), 1274126177)
  return ((hash ^ (hash >>> 16)) & 255) / 128 - 1
}

/** Writes one cell's colour into an RGBA pixel buffer. Byte-writing keeps it endian-agnostic. */
export function writeCellRgb(
  pixels: Uint8ClampedArray,
  offset: number,
  material: number,
  x: number,
  y: number
): void {
  const { color, jitter } = MATERIALS[material]
  const shade = jitter === 0 ? 0 : jitterAt(x, y) * jitter

  pixels[offset] = color[0] + shade
  pixels[offset + 1] = color[1] + shade
  pixels[offset + 2] = color[2] + shade
  pixels[offset + 3] = 255
}

/** CSS colour for a material, for palette swatches — same table the canvas reads. */
export function materialCss(material: number): string {
  const [r, g, b] = MATERIALS[material].color
  return `rgb(${r} ${g} ${b})`
}
