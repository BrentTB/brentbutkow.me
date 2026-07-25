import { MaterialId } from '../pixel-world.types'
import { MATERIALS, isBurning } from './materials'

/**
 * Deterministic per-cell noise in [-1, 1), from the cell's coordinates alone — so a pile's speckle
 * stays put as the grid scrolls past it rather than crawling.
 */
function jitterAt(x: number, y: number): number {
  let hash = (x * 374761393 + y * 668265263) | 0
  hash = Math.imul(hash ^ (hash >>> 13), 1274126177)
  return ((hash ^ (hash >>> 16)) & 255) / 128 - 1
}

/** A cell that is alight draws as flame, whatever it is made of. */
function paletteEntry(material: number, burn: number) {
  return MATERIALS[isBurning(burn) ? MaterialId.fire : material]
}

/** True for the cells the glow pass blooms: flames, lava, and anything currently alight. */
export function isEmissive(material: number, burn: number): boolean {
  return paletteEntry(material, burn).emissive === true
}

/**
 * Flicker for anything alight, from the cell's position and how much burn time is left. A flame
 * drawn at one steady colour reads as a neon strip; this drops each cell to somewhere between 70%
 * and 100% brightness and changes it as the fuel burns down.
 */
function flicker(x: number, y: number, burn: number): number {
  let hash = (x * 92837111 + y * 689287499 + burn * 283923481) | 0
  hash = Math.imul(hash ^ (hash >>> 15), 2246822519)
  return 0.7 + (((hash ^ (hash >>> 13)) & 255) / 255) * 0.3
}

/** Writes one cell's colour into an RGBA pixel buffer. Byte-writing keeps it endian-agnostic. */
export function writeCellRgb(
  pixels: Uint8ClampedArray,
  offset: number,
  material: number,
  burn: number,
  x: number,
  y: number
): void {
  const entry = paletteEntry(material, burn)
  const { color, jitter } = entry
  const shade = jitter === 0 ? 0 : jitterAt(x, y) * jitter
  const glow = entry.emissive === true ? flicker(x, y, burn) : 1

  pixels[offset] = (color[0] + shade) * glow
  pixels[offset + 1] = (color[1] + shade) * glow
  pixels[offset + 2] = (color[2] + shade) * glow
  pixels[offset + 3] = 255
}

/** CSS colour for a material, for palette swatches — same table the canvas paints from. */
export function materialCss(material: number): string {
  const [r, g, b] = MATERIALS[material].color
  return `rgb(${r} ${g} ${b})`
}
