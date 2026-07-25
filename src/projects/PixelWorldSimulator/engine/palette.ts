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

// The drawing functions below take a plain `number`, not a `MaterialId`: they read straight from the
// grid's `Uint8Array` once per cell per frame, and narrowing there would put a check in the hot loop.
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

/**
 * Where the heat tint starts and where it is at full strength, in °C. Below ambient it runs the other
 * way, toward the cold of liquid nitrogen.
 */
const WARM_FROM = 60
const WARM_FULL = 1200
const COOL_FROM = 0
const COOL_FULL = -190
/** How strong the tint gets at full heat, as an alpha byte. Enough to read, not enough to recolour. */
const TINT_MAX = 170
/**
 * Bends the ramp so the first couple of hundred degrees are already visible. Straight linear, a cell at
 * 110 °C came out around 4% opacity: technically tinted, indistinguishable from cold sand, and useless
 * for watching something warm up.
 */
const TINT_CURVE = 0.45

/** The warm and cold ends of the tint. Written additively, so both only ever brighten a cell. */
const WARM_TINT: readonly [number, number, number] = [255, 96, 20]
const COOL_TINT: readonly [number, number, number] = [40, 120, 255]

function ramp(fraction: number): number {
  return Math.min(1, fraction) ** TINT_CURVE
}

/**
 * Writes a cell's temperature as a tint into an overlay buffer: warm cells glow, cold ones go blue, and
 * anything near room temperature writes nothing. Without it heat is invisible until something crosses a
 * threshold, so holding the heat tool over sand looked like it did nothing right up to the moment the
 * sand turned to glass.
 *
 * This is a separate buffer composited over the world rather than a change to the cell's own colour, so
 * a material still draws as exactly its palette entry.
 */
export function writeHeatTint(
  pixels: Uint8ClampedArray,
  offset: number,
  temperature: number
): boolean {
  const strength =
    temperature >= WARM_FROM
      ? ramp((temperature - WARM_FROM) / (WARM_FULL - WARM_FROM))
      : temperature <= COOL_FROM
        ? -ramp((COOL_FROM - temperature) / (COOL_FROM - COOL_FULL))
        : 0

  if (strength === 0) {
    pixels[offset + 3] = 0
    return false
  }

  const [r, g, b] = strength > 0 ? WARM_TINT : COOL_TINT
  const alpha = Math.abs(strength)
  pixels[offset] = r
  pixels[offset + 1] = g
  pixels[offset + 2] = b
  pixels[offset + 3] = alpha * TINT_MAX
  return true
}

/** CSS colour for a material, for palette swatches — same table the canvas paints from. */
export function materialCss(material: MaterialId): string {
  const [r, g, b] = MATERIALS[material].color
  return `rgb(${r} ${g} ${b})`
}
