import { Grid, MaterialId } from '../pixel-world.types'
import { AMBIENT_TEMPERATURE, SNAPSHOT_MAX_CHARS, TEMPERATURE_LIMITS } from '../data'
import { MATERIALS } from './materials'
import { asMaterial, clearGrid, markHotRow, placeMaterial } from './grid'

/**
 * Bumped when an old link would read wrong under the new format. A new flag bit that an old link simply
 * lacks stays backward-compatible — the bit reads as clear, which is what that world was — so it holds.
 * An old link read by a newer build is refused rather than misread: a snapshot is somebody else's world,
 * and a plausible-looking wrong answer is worse than a refusal they can understand.
 */
/**
 * Bumped to 2 when the turbine was removed and the material ids above it renumbered. A world's cells are raw
 * material bytes, so a link written before that decodes into different materials entirely; the version check is
 * what turns that into a refusal the reader can understand instead of a scrambled world.
 */
export const VERSION = 2

/** Bytes before the cell data: version, width, height, flags. */
const HEADER_BYTES = 6

/** Set in the flags byte when the payload carries a temperature layer at all. */
const HAS_HEAT = 1
/**
 * Set when the world was built with air currents switched on. Air changes what a world *does*, not just how
 * it looks, so a link that dropped this would replay into something the sender never saw.
 */
const HAS_AIR = 2

/**
 * Stands in for "however this cell came out when it was placed" in the temperature layer. It keeps a
 * material's own heat with the material — lava loads at lava's temperature — and it compresses far better
 * than real numbers, since one repeated value covers every cell nobody has touched.
 */
const AS_PLACED = 255

/**
 * Degrees per step in the stored temperature layer. Temperature is kept as a level in a single byte rather
 * than as degrees in two, which halved the layer and made it compress better besides: a smooth gradient
 * becomes a run of plateaus. Measured on a volcano left to erupt, the layer went from 12,195 characters to
 * 6,028, and it is the layer that dominates a hot world — materials were only 4,419 of it.
 *
 * 16° is finer than the tint can show (it ramps over 60° to 1200°) and leaves 127 levels, comfortably inside
 * a byte alongside the sentinel.
 */
export const TEMPERATURE_QUANTUM = 16

/** Why a link was refused. The UI turns each of these into something the reader can act on. */
export const SnapshotRefusal = {
  /** Not base64, not a deflate stream, or the wrong number of bytes for a world. */
  malformed: 'malformed',
  /** A version this build cannot read. */
  version: 'version',
  /** A world of different dimensions, which cannot be stretched to fit this one. */
  size: 'size',
  /** Longer than the cap, so it is refused without being unpacked at all. */
  tooLong: 'tooLong',
  /** This browser has no compression streams, so it can neither write nor read a link. */
  unsupported: 'unsupported',
} as const
export type SnapshotRefusal = (typeof SnapshotRefusal)[keyof typeof SnapshotRefusal]

export type SnapshotResult =
  | {
      ok: true
      /** Whether the sender had air currents on. The reader matches it, so the world replays as they saw it. */
      airCurrents: boolean
    }
  | { ok: false; refusal: SnapshotRefusal }

/**
 * Whether links work here at all. Compression streams are the one part of this with a real support gap, so
 * the UI asks first and leaves the share control out rather than showing a button that cannot work.
 */
export function snapshotsSupported(): boolean {
  return typeof CompressionStream === 'function' && typeof DecompressionStream === 'function'
}

/** The temperature a cell holds the moment it is placed, before anything heats or cools it. */
function asPlacedTemperature(material: MaterialId): number {
  return MATERIALS[material].startTemperature ?? AMBIENT_TEMPERATURE
}

function payloadBytes(cells: number, withHeat: boolean): number {
  // A material byte per cell, and a temperature level byte per cell when the heat layer is carried.
  return HEADER_BYTES + cells * (withHeat ? 2 : 1)
}

/**
 * Every temperature at which this material turns into something else. Quantising must not step a cell across
 * one of them, or a shared world melts, ignites or explodes the moment it loads — which would read as the
 * link being broken rather than as a rounding error eight degrees wide.
 */
function triggersOf(material: MaterialId): { at: number; onRising: boolean }[] {
  const { hot, cold, ignite, explodes } = MATERIALS[material]
  const triggers: { at: number; onRising: boolean }[] = []
  if (hot !== undefined) triggers.push({ at: hot.at, onRising: true })
  if (ignite !== undefined) triggers.push({ at: ignite.at, onRising: true })
  if (explodes !== undefined) triggers.push({ at: explodes.at, onRising: true })
  if (cold !== undefined) triggers.push({ at: cold.at, onRising: false })
  return triggers
}

/** A stored temperature level, keeping the cell on the same side of every threshold it was on. */
function toLevel(material: MaterialId, held: number): number {
  let level = Math.round((held - TEMPERATURE_LIMITS.floor) / TEMPERATURE_QUANTUM)
  level = Math.max(0, Math.min(AS_PLACED - 1, level))

  // Enforce each threshold in level space, not in degrees: clamping the degrees and then requantising rounds
  // the value straight back across the line whenever the nearest level lands on the far side, which is what
  // ignited or melted a shared world the moment it loaded. `fromLevel(level)` is what decode reads back, so
  // the level itself is what has to sit on the right side.
  for (const { at, onRising } of triggersOf(material)) {
    const boundary = (at - TEMPERATURE_LIMITS.floor) / TEMPERATURE_QUANTUM
    const fired = onRising ? held >= at : held <= at
    if (onRising) {
      level = fired
        ? Math.max(level, Math.ceil(boundary))
        : Math.min(level, Math.ceil(boundary) - 1)
    } else {
      level = fired
        ? Math.min(level, Math.floor(boundary))
        : Math.max(level, Math.floor(boundary) + 1)
    }
  }

  return Math.max(0, Math.min(AS_PLACED - 1, level))
}

function fromLevel(level: number): number {
  return TEMPERATURE_LIMITS.floor + level * TEMPERATURE_QUANTUM
}

function streamOf(bytes: Uint8Array<ArrayBuffer>): ReadableStream<BufferSource> {
  return new ReadableStream({
    start(controller) {
      controller.enqueue(bytes)
      controller.close()
    },
  })
}

async function deflate(bytes: Uint8Array<ArrayBuffer>): Promise<Uint8Array> {
  const packed = await new Response(
    streamOf(bytes).pipeThrough(new CompressionStream('deflate-raw'))
  ).arrayBuffer()
  return new Uint8Array(packed)
}

/**
 * Unpacks a deflate stream, refusing to hold more than `cap` bytes. The cap is the point: a few kilobytes
 * of hostile base64 can unpack to gigabytes, and the reader has no reason to find that out the hard way.
 * Anything corrupt fails the same way as anything oversized.
 */
async function inflate(bytes: Uint8Array<ArrayBuffer>, cap: number): Promise<Uint8Array | null> {
  const reader = streamOf(bytes).pipeThrough(new DecompressionStream('deflate-raw')).getReader()
  const chunks: Uint8Array[] = []
  let held = 0

  try {
    for (;;) {
      const { done, value } = await reader.read()
      if (done) break
      held += value.byteLength
      if (held > cap) {
        await reader.cancel()
        return null
      }
      chunks.push(value)
    }
  } catch {
    return null
  }

  const out = new Uint8Array(held)
  let at = 0
  for (const chunk of chunks) {
    out.set(chunk, at)
    at += chunk.byteLength
  }
  return out
}

function toBase64Url(bytes: Uint8Array): string {
  let raw = ''
  for (const byte of bytes) raw += String.fromCharCode(byte)
  return btoa(raw).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '')
}

function fromBase64Url(code: string): Uint8Array<ArrayBuffer> | null {
  if (!/^[A-Za-z0-9\-_]+$/.test(code)) return null
  try {
    const raw = atob(code.replace(/-/g, '+').replace(/_/g, '/'))
    const bytes = new Uint8Array(raw.length)
    for (let i = 0; i < raw.length; i++) bytes[i] = raw.charCodeAt(i)
    return bytes
  } catch {
    return null
  }
}

/**
 * The whole world as a string short enough to put in a URL. The layers go in raw and deflate does the
 * compressing: a world is mostly long stretches of the same few materials, which is exactly what it is good
 * at, and it beat a hand-rolled run-length pass by three times on the volcano.
 *
 * Counters, momentum and burning are left out. A shared world arrives as the thing that was built rather
 * than mid-reaction, which is the more useful thing to receive as well as the shorter one to send.
 */
async function encodeLayers(grid: Grid, withHeat: boolean, airCurrents: boolean): Promise<string> {
  const cells = grid.width * grid.height
  const payload = new Uint8Array(payloadBytes(cells, withHeat))
  const view = new DataView(payload.buffer)

  payload[0] = VERSION
  view.setUint16(1, grid.width, true)
  view.setUint16(3, grid.height, true)
  payload[5] = (withHeat ? HAS_HEAT : 0) | (airCurrents ? HAS_AIR : 0)
  payload.set(grid.material.subarray(0, cells), HEADER_BYTES)

  if (withHeat) {
    const heatAt = HEADER_BYTES + cells
    for (let cell = 0; cell < cells; cell++) {
      const material = asMaterial(grid.material[cell])
      const held = grid.temperature[cell]
      payload[heatAt + cell] =
        held === asPlacedTemperature(material) ? AS_PLACED : toLevel(material, held)
    }
  }

  return toBase64Url(await deflate(payload))
}

export type Snapshot = {
  code: string
  /** True when the heat had to be dropped to fit, so the caller can say so rather than pretend. */
  heatDropped: boolean
}

/**
 * The world as a string short enough to put in a URL. The layers go in raw and deflate does the compressing:
 * a world is mostly long stretches of the same few materials, which is what it is good at, and it beat a
 * hand-rolled run-length pass three to one.
 *
 * A world too detailed to fit is sent without its temperatures rather than refused. Heat is the layer that
 * dominates a hot world and the one the sim rebuilds on its own — anything warmed by lava warms straight back
 * up once the world runs — so it is the right thing to drop under pressure.
 *
 * Counters, momentum and burning are always left out. A shared world arrives as the thing that was built
 * rather than mid-reaction, which is the more useful thing to receive as well as the shorter one to send.
 */
export async function encodeSnapshot(grid: Grid, airCurrents: boolean): Promise<Snapshot> {
  const withHeat = await encodeLayers(grid, true, airCurrents)
  if (withHeat.length <= SNAPSHOT_MAX_CHARS) return { code: withHeat, heatDropped: false }

  return { code: await encodeLayers(grid, false, airCurrents), heatDropped: true }
}

/**
 * Reads a snapshot into the world, or refuses it and leaves the world untouched. Everything here arrives
 * from a URL somebody else wrote, so nothing is cast and every field is checked: an unknown material id
 * would index past the palette, and the wrong number of bytes would leave half a world behind.
 */
export async function decodeSnapshot(code: string, grid: Grid): Promise<SnapshotResult> {
  if (!snapshotsSupported()) return { ok: false, refusal: SnapshotRefusal.unsupported }
  if (code.length === 0) return { ok: false, refusal: SnapshotRefusal.malformed }
  if (code.length > SNAPSHOT_MAX_CHARS) return { ok: false, refusal: SnapshotRefusal.tooLong }

  const packed = fromBase64Url(code)
  if (packed === null) return { ok: false, refusal: SnapshotRefusal.malformed }

  const cells = grid.width * grid.height
  const expected = payloadBytes(cells, true)
  // Room for a header from a world somewhat larger than this one, so a snapshot of a different size can say
  // so instead of reading as corrupt. Still a hard bound: this is what stands between the reader and a few
  // kilobytes of base64 that wanted to unpack into gigabytes.
  const payload = await inflate(packed, expected * 4)
  if (payload === null || payload.byteLength < HEADER_BYTES) {
    return { ok: false, refusal: SnapshotRefusal.malformed }
  }

  if (payload[0] !== VERSION) return { ok: false, refusal: SnapshotRefusal.version }

  const view = new DataView(payload.buffer, payload.byteOffset, payload.byteLength)
  if (view.getUint16(1, true) !== grid.width || view.getUint16(3, true) !== grid.height) {
    return { ok: false, refusal: SnapshotRefusal.size }
  }
  const carriesHeat = (payload[5] & HAS_HEAT) === HAS_HEAT
  if (payload.byteLength !== payloadBytes(cells, carriesHeat)) {
    return { ok: false, refusal: SnapshotRefusal.malformed }
  }

  for (let cell = 0; cell < cells; cell++) {
    if (payload[HEADER_BYTES + cell] >= MATERIALS.length) {
      return { ok: false, refusal: SnapshotRefusal.malformed }
    }
  }

  // Nothing above has touched the world, so a refusal costs the reader the world they were looking at.
  clearGrid(grid)

  const heatAt = HEADER_BYTES + cells
  for (let cell = 0; cell < cells; cell++) {
    const material = payload[HEADER_BYTES + cell]
    if (material !== MaterialId.empty) placeMaterial(grid, cell, asMaterial(material))

    if (!carriesHeat) continue
    const level = payload[heatAt + cell]
    if (level !== AS_PLACED) {
      grid.temperature[cell] = Math.max(
        TEMPERATURE_LIMITS.floor,
        Math.min(TEMPERATURE_LIMITS.ceiling, fromLevel(level))
      )
      markHotRow(grid, cell)
    }
  }

  // Links written before air existed have the bit clear, and they were built in a world with no air at all,
  // so reading a missing flag as "off" is the honest answer rather than a default.
  return { ok: true, airCurrents: (payload[5] & HAS_AIR) !== 0 }
}
