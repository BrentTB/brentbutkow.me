import { describe, it, expect } from 'vitest'
import { Grid, MaterialId } from '../pixel-world.types'
import { AMBIENT_TEMPERATURE, SNAPSHOT_MAX_CHARS, TEMPERATURE_LIMITS } from '../data'
import { cellIndex, createGrid, placeMaterial } from './grid'
import { MATERIALS } from './materials'
import { createRng } from './rng'
import { Preset, loadPreset } from './presets'
import { tickWorld } from './tick'
import {
  SnapshotRefusal,
  TEMPERATURE_QUANTUM,
  VERSION,
  decodeSnapshot,
  encodeSnapshot,
  snapshotsSupported,
} from './snapshot'

function put(grid: Grid, x: number, y: number, material: MaterialId): void {
  placeMaterial(grid, cellIndex(grid, x, y), material)
}

/** A world with something of everything in it: a floor, a pool, a wall and a creature. */
function builtWorld(width = 60, height = 40): Grid {
  const grid = createGrid(width, height)
  for (let x = 0; x < width; x++) {
    put(grid, x, height - 1, MaterialId.stone)
    put(grid, x, height - 2, MaterialId.dirt)
  }
  for (let x = 4; x < 20; x++) put(grid, x, height - 3, MaterialId.water)
  for (let y = 10; y < height - 2; y++) put(grid, 30, y, MaterialId.wood)
  put(grid, 40, height - 3, MaterialId.lava)
  put(grid, 45, height - 3, MaterialId.bug)
  return grid
}

describe('encodeSnapshot / decodeSnapshot', () => {
  it('brings a world back exactly as it was drawn', async () => {
    const built = builtWorld()
    const { code } = await encodeSnapshot(built, true)

    const loaded = createGrid(built.width, built.height)
    expect(await decodeSnapshot(code, loaded)).toEqual({ ok: true, airCurrents: true })

    expect([...loaded.material]).toEqual([...built.material])
  })

  it('carries the heat a material holds on its own, without spending bytes on it', async () => {
    const built = builtWorld()
    const { code } = await encodeSnapshot(built, true)
    const loaded = createGrid(built.width, built.height)

    await decodeSnapshot(code, loaded)

    const lava = cellIndex(built, 40, built.height - 3)
    expect(loaded.material[lava]).toBe(MaterialId.lava)
    expect(loaded.temperature[lava]).toBe(MATERIALS[MaterialId.lava].startTemperature)
  })

  it('carries heat somebody applied by hand, to within a step of the stored scale', async () => {
    const built = builtWorld()
    const warmed = cellIndex(built, 10, 20)
    put(built, 10, 20, MaterialId.stone)
    built.temperature[warmed] = 640

    const loaded = createGrid(built.width, built.height)
    await decodeSnapshot((await encodeSnapshot(built, true)).code, loaded)

    // Stored as a level rather than a degree, which halves the layer. A step is finer than the tint shows.
    expect(Math.abs(loaded.temperature[warmed] - 640)).toBeLessThanOrEqual(TEMPERATURE_QUANTUM)
    // And the row is awake, or the heat pass would skip past the warmth it just loaded.
    expect(loaded.hotRows[20]).toBe(1)
  })

  it('keeps every material on its own side of every threshold across a round-trip', async () => {
    // A rounding error eight degrees wide must not make a shared world ignite, melt or freeze the moment it
    // loads: that reads as a broken link rather than as lost precision. Every material with a threshold, at a
    // degree either side of it, must decode back onto the side it was drawn on — not just the two whose
    // nearest level happens to round the safe way.
    const risingKeys = ['hot', 'ignite', 'explodes'] as const

    for (const material of MATERIALS) {
      const triggers: { at: number; onRising: boolean }[] = []
      for (const key of risingKeys) {
        const trigger = material[key]
        if (trigger !== undefined) triggers.push({ at: trigger.at, onRising: true })
      }
      if (material.cold !== undefined) triggers.push({ at: material.cold.at, onRising: false })

      for (const { at, onRising } of triggers) {
        for (const held of [at - 1, at, at + 1]) {
          if (held <= TEMPERATURE_LIMITS.floor || held >= TEMPERATURE_LIMITS.ceiling) continue

          const grid = createGrid(4, 4)
          const cell = cellIndex(grid, 1, 1)
          placeMaterial(grid, cell, material.id)
          grid.temperature[cell] = held

          const loaded = createGrid(4, 4)
          expect(await decodeSnapshot((await encodeSnapshot(grid, true)).code, loaded)).toEqual({
            ok: true,
            airCurrents: true,
          })

          const back = loaded.temperature[cell]
          const liveFired = onRising ? held >= at : held <= at
          const loadedFired = onRising ? back >= at : back <= at
          expect(loadedFired, `${material.label} at ${held}° across ${at}°`).toBe(liveFired)
        }
      }
    }
  })

  it('keeps a cell that was already past a threshold past it', async () => {
    const built = builtWorld()
    const rock = cellIndex(built, 16, 20)
    put(built, 16, 20, MaterialId.stone)
    const melts = MATERIALS[MaterialId.stone].hot?.at ?? 0
    built.temperature[rock] = melts + 4

    const loaded = createGrid(built.width, built.height)
    await decodeSnapshot((await encodeSnapshot(built, true)).code, loaded)

    expect(loaded.temperature[rock]).toBeGreaterThanOrEqual(melts)
  })

  it('gives a creature its energy back, so a shared world is not full of things about to die', async () => {
    const built = builtWorld()
    const bug = cellIndex(built, 45, built.height - 3)

    const loaded = createGrid(built.width, built.height)
    await decodeSnapshot((await encodeSnapshot(built, true)).code, loaded)

    expect(loaded.data[bug]).toBe(MATERIALS[MaterialId.bug].life?.startEnergy)
  })

  it('stays short for a world with big plain areas', async () => {
    // Ninety thousand cells of nothing, in a few hundred characters: an empty world is one repeated byte
    // and one repeated temperature, which is what compression is for.
    const empty = createGrid(400, 225)

    expect((await encodeSnapshot(empty, true)).code.length).toBeLessThan(600)
  })

  it('fits a whole preset into a link', async () => {
    for (const preset of Object.values(Preset)) {
      const grid = createGrid(400, 225)
      loadPreset(grid, preset, createRng(7))

      // The cap the UI refuses past; a ready-made world has to come in well under it.
      expect((await encodeSnapshot(grid, true)).code.length).toBeLessThan(SNAPSHOT_MAX_CHARS)
    }
  })

  it(
    'still fits a world that has been left running, not just a fresh one',
    { timeout: 60_000 },
    async () => {
      // The case the first cap got wrong. A volcano scatters debris across ground that started as clean stone,
      // so a lived-in world compresses far worse than the one that was loaded.
      const grid = createGrid(400, 225)
      const rng = createRng(7)
      loadPreset(grid, Preset.volcano, rng)
      for (let tick = 0; tick < 400; tick++) tickWorld(grid, rng, tick)

      expect((await encodeSnapshot(grid, true)).code.length).toBeLessThan(SNAPSHOT_MAX_CHARS)
    }
  )

  it('drops the heat rather than the link when a world will not otherwise fit', async () => {
    // A plain stone slab costs almost nothing; a different temperature in every cell costs everything, since
    // there is no pattern in it to compress. Heat is the layer the sim rebuilds around any source anyway, so
    // it is the right one to lose under pressure.
    const grid = createGrid(400, 225)
    const rng = createRng(11)
    for (let cell = 0; cell < 400 * 225; cell++) {
      placeMaterial(grid, cell, MaterialId.stone)
      grid.temperature[cell] = Math.floor(rng.next() * 1400)
    }

    const sent = await encodeSnapshot(grid, true)

    expect(sent.heatDropped).toBe(true)
    expect(sent.code.length).toBeLessThan(SNAPSHOT_MAX_CHARS)

    // The world still arrives; only its warmth is missing.
    const loaded = createGrid(400, 225)
    expect(await decodeSnapshot(sent.code, loaded)).toEqual({ ok: true, airCurrents: true })
    expect(loaded.material[0]).toBe(MaterialId.stone)
    expect(loaded.temperature[0]).toBe(AMBIENT_TEMPERATURE)
  })

  it('keeps the heat when a world fits with it', async () => {
    const grid = createGrid(400, 225)
    loadPreset(grid, Preset.volcano, createRng(7))

    expect((await encodeSnapshot(grid, true)).heatDropped).toBe(false)
  })

  it('leaves room for the worlds people actually build', () => {
    // Measured: a randomly scribbled world is about 15,000 characters, and a running volcano about 11,000
    // now its heat is stored as levels. A cap under that refuses the worlds most worth sending.
    expect(SNAPSHOT_MAX_CHARS).toBeGreaterThan(20_000)
  })

  it('round-trips every preset cell for cell', async () => {
    for (const preset of Object.values(Preset)) {
      const built = createGrid(400, 225)
      loadPreset(built, preset, createRng(3))
      const loaded = createGrid(400, 225)

      expect(await decodeSnapshot((await encodeSnapshot(built, true)).code, loaded)).toEqual({
        ok: true,
        airCurrents: true,
      })
      expect([...loaded.material]).toEqual([...built.material])
    }
  })

  it('clears whatever was in the world before it loads', async () => {
    const built = createGrid(40, 30)
    const loaded = builtWorld(40, 30)

    await decodeSnapshot((await encodeSnapshot(built, true)).code, loaded)

    expect([...loaded.material].every((cell) => cell === MaterialId.empty)).toBe(true)
    expect(loaded.velocity.size).toBe(0)
  })
})

describe('decodeSnapshot on input nobody should trust', () => {
  const WIDTH = 60
  const HEIGHT = 40
  const HEADER_BYTES = 6

  function target(): Grid {
    return createGrid(WIDTH, HEIGHT)
  }

  /** A payload the decoder would accept, for a test to then break one field of. */
  function goodPayload(width = WIDTH, height = HEIGHT): Uint8Array {
    const cells = width * height
    const payload = new Uint8Array(HEADER_BYTES + cells * 2)
    const view = new DataView(payload.buffer)
    payload[0] = VERSION
    view.setUint16(1, width, true)
    view.setUint16(3, height, true)
    payload[5] = 1
    // Every temperature reads "as placed", the sentinel a fresh world encodes to.
    payload.fill(255, HEADER_BYTES + cells)
    return payload
  }

  /** Packs raw bytes the way the encoder does, so a test can hand the decoder anything at all. */
  async function codeFor(payload: Uint8Array): Promise<string> {
    const source = new ReadableStream({
      start(controller) {
        controller.enqueue(payload)
        controller.close()
      },
    })
    const packed = await new Response(
      source.pipeThrough(new CompressionStream('deflate-raw'))
    ).arrayBuffer()
    let raw = ''
    for (const byte of new Uint8Array(packed)) raw += String.fromCharCode(byte)
    return btoa(raw).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '')
  }

  it('accepts the payload the other tests break, so they are breaking something that worked', async () => {
    // Only the heat bit set, which is what every link written before air existed looks like. Those worlds
    // were built without it, so reading the missing flag as "off" replays them as they were.
    expect(await decodeSnapshot(await codeFor(goodPayload()), target())).toEqual({
      ok: true,
      airCurrents: false,
    })
  })

  it('refuses a string that is not base64 at all', async () => {
    expect(await decodeSnapshot('not a snapshot!!', target())).toEqual({
      ok: false,
      refusal: SnapshotRefusal.malformed,
    })
  })

  it('refuses an empty string', async () => {
    expect((await decodeSnapshot('', target())).ok).toBe(false)
  })

  it('refuses base64 that is not a compressed stream', async () => {
    expect(await decodeSnapshot('aGVsbG8gd29ybGQ', target())).toEqual({
      ok: false,
      refusal: SnapshotRefusal.malformed,
    })
  })

  it('refuses a world of different dimensions rather than stretching it', async () => {
    const { code: small } = await encodeSnapshot(createGrid(20, 20), true)

    expect(await decodeSnapshot(small, target())).toEqual({
      ok: false,
      refusal: SnapshotRefusal.size,
    })
  })

  it('refuses a version it cannot read', async () => {
    const payload = goodPayload()
    payload[0] = 99

    expect(await decodeSnapshot(await codeFor(payload), target())).toEqual({
      ok: false,
      refusal: SnapshotRefusal.version,
    })
  })

  it('refuses a world written before the material ids were renumbered', async () => {
    // Removing the turbine shifted every id above it down by one, so a version-1 world decodes into different
    // materials entirely. Lowering `VERSION` back to 1 would look like it rescued those links and would in fact
    // scramble them, which is why this pins the floor rather than only the mismatch above it.
    expect(VERSION).toBeGreaterThan(1)

    const payload = goodPayload()
    payload[0] = 1

    expect(await decodeSnapshot(await codeFor(payload), target())).toEqual({
      ok: false,
      refusal: SnapshotRefusal.version,
    })
  })

  it('refuses a material id that is not in the palette', async () => {
    const payload = goodPayload()
    // A cell claiming to hold material 250 would index past the palette on the very first read.
    payload[HEADER_BYTES + 12] = 250

    expect(await decodeSnapshot(await codeFor(payload), target())).toEqual({
      ok: false,
      refusal: SnapshotRefusal.malformed,
    })
  })

  it('refuses a payload with the right header but too few cells to fill a world', async () => {
    const short = goodPayload().slice(0, HEADER_BYTES + 40)

    expect(await decodeSnapshot(await codeFor(short), target())).toEqual({
      ok: false,
      refusal: SnapshotRefusal.malformed,
    })
  })

  it('refuses a code longer than the cap without unpacking it', async () => {
    const overlong = 'A'.repeat(SNAPSHOT_MAX_CHARS + 1)

    expect(await decodeSnapshot(overlong, target())).toEqual({
      ok: false,
      refusal: SnapshotRefusal.tooLong,
    })
  })

  it('refuses a small code that unpacks into an enormous one', async () => {
    // A few hundred characters of base64 can hold megabytes of zeroes. The reader stops counting at the
    // size of one world rather than finding out how big this one wanted to be.
    const bomb = await codeFor(new Uint8Array(4_000_000))
    expect(bomb.length).toBeLessThan(SNAPSHOT_MAX_CHARS)

    expect(await decodeSnapshot(bomb, target())).toEqual({
      ok: false,
      refusal: SnapshotRefusal.malformed,
    })
  })

  it('refuses a truncated code', async () => {
    const { code } = await encodeSnapshot(builtWorld(), true)

    expect((await decodeSnapshot(code.slice(0, 12), target())).ok).toBe(false)
  })

  it('leaves the world it was given untouched when it refuses', async () => {
    const grid = builtWorld()
    const before = [...grid.material]

    await decodeSnapshot((await encodeSnapshot(createGrid(10, 10), true)).code, grid)

    expect([...grid.material]).toEqual(before)
    expect(grid.temperature[cellIndex(grid, 0, 0)]).toBe(AMBIENT_TEMPERATURE)
  })

  it('holds a wild temperature to what the world allows', async () => {
    const built = builtWorld()
    const cell = cellIndex(built, 10, 20)
    put(built, 10, 20, MaterialId.stone)
    built.temperature[cell] = 30000

    const loaded = createGrid(built.width, built.height)
    await decodeSnapshot((await encodeSnapshot(built, true)).code, loaded)

    // An Int16 holds 32,000°, which is not a temperature any world should come back with.
    expect(loaded.temperature[cell]).toBe(TEMPERATURE_LIMITS.ceiling)
  })
})

describe('snapshotsSupported', () => {
  it('is true where the compression streams are', () => {
    expect(snapshotsSupported()).toBe(true)
  })

  it('refuses a link rather than throwing where they are missing', async () => {
    const streams = globalThis.DecompressionStream
    // @ts-expect-error — standing in for a browser that has never had the API.
    delete globalThis.DecompressionStream

    expect(snapshotsSupported()).toBe(false)
    expect(await decodeSnapshot('anything', createGrid(60, 40))).toEqual({
      ok: false,
      refusal: SnapshotRefusal.unsupported,
    })

    globalThis.DecompressionStream = streams
  })
})

describe('a link carries the air setting', () => {
  /** A blank world the same size as `builtWorld`, ready to receive one. */
  function blank(): Grid {
    return createGrid(60, 40)
  }

  it('brings back whichever way the sender had it', async () => {
    const built = builtWorld()

    const withAir = await encodeSnapshot(built, true)
    const withoutAir = await encodeSnapshot(built, false)

    // Air changes what a world does, not just how it looks, so a link that dropped this would replay into
    // something the sender never saw.
    expect(await decodeSnapshot(withAir.code, blank())).toEqual({ ok: true, airCurrents: true })
    expect(await decodeSnapshot(withoutAir.code, blank())).toEqual({
      ok: true,
      airCurrents: false,
    })
  })

  it('still brings the world itself back either way', async () => {
    const built = builtWorld()
    const { code } = await encodeSnapshot(built, false)
    const loaded = blank()

    expect((await decodeSnapshot(code, loaded)).ok).toBe(true)
    expect([...loaded.material]).toEqual([...built.material])
  })
})
