import { describe, expect, it } from 'vitest'
import { Grid, MaterialId } from '../pixel-world.types'
import { cellIndex, createGrid, markHotRow, placeMaterial } from './grid'
import { createRng } from './rng'
import { tickWorld } from './tick'
import { CHUNK_SIZE, isCellAwake, wakeAllChunks, wakeChunk } from './chunks'

describe('wakeChunk', () => {
  function sleeping(width = 96, height = 96): Grid {
    const grid = createGrid(width, height)
    grid.awakeChunks.fill(0)
    grid.awakeChunksNext.fill(0)
    return grid
  }

  it('wakes the ring around a cell, so a change cannot reach a sleeping chunk', () => {
    const grid = sleeping()
    const middle = CHUNK_SIZE * 3 + 2
    wakeChunk(grid, cellIndex(grid, middle, middle))

    // Anything within one cell of the change is awake, whichever chunk it belongs to. That is the whole
    // safety argument: a cell only ever reacts to something it is touching.
    for (const [dx, dy] of [
      [0, 0],
      [-1, 0],
      [1, 0],
      [0, -1],
      [0, 1],
    ]) {
      expect(isCellAwake(grid, middle + dx, middle + dy)).toBe(true)
    }
    expect(isCellAwake(grid, middle + CHUNK_SIZE * 2, middle)).toBe(false)
  })

  it('clamps at the edges instead of wrapping to the far side', () => {
    const grid = sleeping()
    wakeChunk(grid, cellIndex(grid, 0, 0))

    expect(isCellAwake(grid, 0, 0)).toBe(true)
    expect(isCellAwake(grid, grid.width - 1, grid.height - 1)).toBe(false)
  })

  it('wakes for this tick as well as the next, so later passes in the tick see it', () => {
    const grid = sleeping()
    wakeChunk(grid, cellIndex(grid, 40, 40))

    const chunk = Math.floor(40 / CHUNK_SIZE) * grid.chunkColumns + Math.floor(40 / CHUNK_SIZE)
    expect(grid.awakeChunks[chunk]).toBe(1)
    expect(grid.awakeChunksNext[chunk]).toBe(1)
  })
})

/**
 * The test that makes sleeping safe to have at all: **nothing deep inside a sleeping region may change.**
 *
 * Comparing a sleeping run against an all-awake run cell for cell cannot work — skipping a cell also skips
 * its random roll, so the two rng streams desynchronise and the worlds diverge for a reason that is not a
 * bug. This checks the sleep decision itself instead. Run a world until it quietens, then give a copy of it
 * one tick with every chunk forced awake: any cell whose whole neighbourhood was asleep and which changed
 * anyway is a cell the real run had frozen.
 */
describe('a sleeping chunk holds nothing that would still move', () => {
  function clone(grid: Grid): Grid {
    return {
      ...grid,
      material: grid.material.slice(),
      moved: grid.moved.slice(),
      data: grid.data.slice(),
      burn: grid.burn.slice(),
      temperature: grid.temperature.slice(),
      temperatureNext: grid.temperatureNext.slice(),
      hotRows: grid.hotRows.slice(),
      hotRowsNext: grid.hotRowsNext.slice(),
      awakeChunks: grid.awakeChunks.slice(),
      awakeChunksNext: grid.awakeChunksNext.slice(),
      velocity: new Map([...grid.velocity].map(([at, motion]) => [at, { ...motion }])),
      heading: new Map([...grid.heading].map(([at, heading]) => [at, { ...heading }])),
    }
  }

  /** Whether every cell touching this one sat in a sleeping chunk, so the real run visited none of them. */
  function buriedInSleep(grid: Grid, x: number, y: number): boolean {
    for (let dy = -1; dy <= 1; dy++) {
      for (let dx = -1; dx <= 1; dx++) {
        const nx = x + dx
        const ny = y + dy
        if (nx < 0 || nx >= grid.width || ny < 0 || ny >= grid.height) continue
        if (isCellAwake(grid, nx, ny)) return false
      }
    }
    return true
  }

  function frozenCells(build: (grid: Grid) => void, ticks: number): number {
    const grid = createGrid(160, 120)
    build(grid)
    const rng = createRng(1)
    for (let tick = 0; tick < ticks; tick++) tickWorld(grid, rng, tick)

    const settled = clone(grid)
    const forced = clone(grid)
    wakeAllChunks(forced)
    tickWorld(forced, createRng(ticks + 1), ticks)

    let frozen = 0
    for (let y = 0; y < grid.height; y++) {
      for (let x = 0; x < grid.width; x++) {
        if (!buriedInSleep(grid, x, y)) continue
        const at = cellIndex(grid, x, y)
        if (
          forced.material[at] !== settled.material[at] ||
          forced.data[at] !== settled.data[at] ||
          forced.burn[at] !== settled.burn[at]
        ) {
          frozen++
        }
      }
    }
    return frozen
  }

  it('with powders, liquids, fire, a heavy gas, life and acid all running', () => {
    const built = frozenCells((grid) => {
      for (let x = 0; x < grid.width; x++) {
        placeMaterial(grid, cellIndex(grid, x, grid.height - 1), MaterialId.stone)
      }
      for (let y = 100; y < grid.height - 1; y++) {
        for (let x = 0; x < 60; x++) placeMaterial(grid, cellIndex(grid, x, y), MaterialId.sand)
        for (let x = 70; x < 120; x++) placeMaterial(grid, cellIndex(grid, x, y), MaterialId.water)
      }
      // Sand sinking through water: the case a random drag roll can stall mid-descent.
      for (let y = 80; y < 90; y++) {
        for (let x = 80; x < 90; x++) placeMaterial(grid, cellIndex(grid, x, y), MaterialId.sand)
      }
      // A heavy gas, whose branch roll decides whether it moves at all.
      for (let y = 60; y < 70; y++) {
        for (let x = 120; x < 150; x++)
          placeMaterial(grid, cellIndex(grid, x, y), MaterialId.chlorine)
      }
      for (let x = 20; x < 50; x++) placeMaterial(grid, cellIndex(grid, x, 95), MaterialId.wood)
      grid.burn[cellIndex(grid, 20, 95)] = 40
      for (let x = 90; x < 100; x++) placeMaterial(grid, cellIndex(grid, x, 102), MaterialId.algae)
      placeMaterial(grid, cellIndex(grid, 95, 98), MaterialId.fish)
      for (let x = 130; x < 140; x++) placeMaterial(grid, cellIndex(grid, x, 90), MaterialId.gravel)
      for (let x = 5; x < 15; x++) placeMaterial(grid, cellIndex(grid, x, 60), MaterialId.acid)
    }, 400)

    expect(built).toBe(0)
  })

  it('after an explosion under a sand bed has settled', () => {
    const built = frozenCells((grid) => {
      for (let x = 0; x < grid.width; x++) {
        placeMaterial(grid, cellIndex(grid, x, grid.height - 1), MaterialId.stone)
      }
      for (let y = 70; y < 110; y++) {
        for (let x = 0; x < grid.width; x++)
          placeMaterial(grid, cellIndex(grid, x, y), MaterialId.sand)
      }
      for (let y = 110; y < grid.height - 1; y++) {
        for (let x = 70; x < 90; x++) placeMaterial(grid, cellIndex(grid, x, y), MaterialId.tnt)
      }
      grid.temperature[cellIndex(grid, 80, 115)] = 1200
    }, 400)

    expect(built).toBe(0)
  })
})

describe('a world that sleeps still finishes what it started', () => {
  /** A pool left alone until every chunk holding it has gone to sleep. */
  function settledPool(): Grid {
    const grid = createGrid(96, 96)
    for (let x = 0; x < grid.width; x++) {
      placeMaterial(grid, cellIndex(grid, x, grid.height - 1), MaterialId.stone)
    }
    for (let y = 30; y < grid.height - 1; y++) {
      for (let x = 0; x < grid.width; x++)
        placeMaterial(grid, cellIndex(grid, x, y), MaterialId.water)
    }
    const rng = createRng(1)
    for (let tick = 0; tick < 400; tick++) tickWorld(grid, rng, tick)
    return grid
  }

  function deepestSand(grid: Grid): number {
    let deepest = -1
    for (let y = 0; y < grid.height; y++) {
      for (let x = 0; x < grid.width; x++) {
        if (grid.material[cellIndex(grid, x, y)] === MaterialId.sand) deepest = Math.max(deepest, y)
      }
    }
    return deepest
  }

  it('sinks a grain dropped into still water all the way to the bottom', () => {
    // The sharp case for sleeping. The pool is already asleep, so the only thing keeping the grain's own
    // chunk awake is the grain moving — and drag stalls it at random. A stall writes nothing, so without
    // an explicit wake the chunk sleeps on a tick the grain lost and the grain hangs in the water forever.
    const grid = settledPool()
    let asleepBefore = 0
    for (const flag of grid.awakeChunks) if (flag === 0) asleepBefore++
    expect(asleepBefore).toBeGreaterThan(grid.awakeChunks.length / 2)

    placeMaterial(grid, cellIndex(grid, 48, 30), MaterialId.sand)

    const rng = createRng(9)
    for (let tick = 400; tick < 1400; tick++) tickWorld(grid, rng, tick)

    expect(deepestSand(grid)).toBe(grid.height - 2)
  })

  it('lets a void finish eating the wall around it', () => {
    // A reaction is a roll against neighbours that are not changing either, so nothing is written on a tick
    // the roll loses. A void walled into solid stone is the sharp case: everything here is static, so its own
    // eating is the only thing that ever wakes the chunk, and the first roll it lost would put it to sleep
    // with the wall still standing.
    const grid = createGrid(96, 96)
    for (let y = 40; y < 60; y++) {
      for (let x = 40; x < 60; x++) placeMaterial(grid, cellIndex(grid, x, y), MaterialId.stone)
    }
    const middle = cellIndex(grid, 50, 50)
    placeMaterial(grid, middle, MaterialId.void)

    const rng = createRng(5)
    for (let tick = 0; tick < 200; tick++) tickWorld(grid, rng, tick)

    // It can only ever reach its four neighbours, and given the ticks it should have cleared all of them.
    for (const at of [middle - 1, middle + 1, middle - grid.width, middle + grid.width]) {
      expect(grid.material[at]).toBe(MaterialId.empty)
    }
  })

  it('keeps a fish swimming after the pool around it has gone quiet', () => {
    // Everything a creature does is a roll, so a fish that happened to do nothing on one tick is not a fish
    // that has settled — and one quiet tick is all it takes for its chunk to sleep and strand it.
    const grid = createGrid(96, 96)
    for (let x = 0; x < grid.width; x++) {
      placeMaterial(grid, cellIndex(grid, x, grid.height - 1), MaterialId.stone)
    }
    for (let y = 30; y < grid.height - 1; y++) {
      for (let x = 0; x < grid.width; x++)
        placeMaterial(grid, cellIndex(grid, x, y), MaterialId.water)
    }
    const rng = createRng(1)
    for (let tick = 0; tick < 400; tick++) tickWorld(grid, rng, tick)

    placeMaterial(grid, cellIndex(grid, 48, 60), MaterialId.fish)
    for (let tick = 400; tick < 700; tick++) tickWorld(grid, rng, tick)

    function fishAt(): number {
      for (let i = 0; i < grid.material.length; i++) {
        if (grid.material[i] === MaterialId.fish) return i
      }
      return -1
    }

    // It has to still be moving in a window long after everything else stopped.
    let previous = fishAt()
    expect(previous).toBeGreaterThanOrEqual(0)
    let moves = 0
    for (let tick = 700; tick < 1100; tick++) {
      tickWorld(grid, rng, tick)
      const now = fishAt()
      if (now !== previous) moves++
      previous = now
    }
    expect(moves).toBeGreaterThan(0)
  })

  it('burns a lone lit cell all the way out', () => {
    // Catching fire and counting down are both direct writes to `burn`, which no chunk can see: heat travels
    // by row, and the flame's clock runs in the timer pass, which skips sleeping chunks. A plank lit at one
    // end used to stop burning part-way along.
    const grid = createGrid(96, 96)
    for (let y = 40; y < 60; y++) {
      for (let x = 40; x < 60; x++) placeMaterial(grid, cellIndex(grid, x, y), MaterialId.stone)
    }
    const plank = cellIndex(grid, 50, 50)
    placeMaterial(grid, plank, MaterialId.wood)
    grid.temperature[plank] = 900

    const rng = createRng(2)
    for (let tick = 0; tick < 900; tick++) tickWorld(grid, rng, tick)

    // It caught, burned down, and left what wood leaves behind rather than sitting there half alight.
    expect(grid.material[plank]).not.toBe(MaterialId.wood)
    expect(grid.burn[plank]).toBe(0)
  })

  it('burns down fuel that heat reached while its chunk was asleep', () => {
    // Heat travels by row, not by chunk, so a cell can cross its ignition point inside a chunk that is fast
    // asleep — which is exactly what `markHotRow` without a chunk wake looks like. The timer pass would never
    // see that the cell was alight, so it would sit there burning and never burn down.
    const grid = createGrid(96, 96)
    for (let y = 40; y < 60; y++) {
      for (let x = 40; x < 60; x++) placeMaterial(grid, cellIndex(grid, x, y), MaterialId.stone)
    }
    const fuel = cellIndex(grid, 50, 50)
    placeMaterial(grid, fuel, MaterialId.wood)

    const rng = createRng(2)
    for (let tick = 0; tick < 100; tick++) tickWorld(grid, rng, tick)
    expect(isCellAwake(grid, 50, 50)).toBe(false)

    // Heat arriving, the way the heat pass delivers it: the row wakes, the chunk does not.
    grid.temperature[fuel] = 900
    markHotRow(grid, fuel)

    for (let tick = 100; tick < 900; tick++) tickWorld(grid, rng, tick)

    expect(grid.material[fuel]).not.toBe(MaterialId.wood)
    expect(grid.burn[fuel]).toBe(0)
  })

  it('expires a gas sealed in where it cannot drift', () => {
    // The other clock. A gas that cannot move writes nothing by moving, so only its own countdown keeps its
    // chunk awake — walled in, it would otherwise hang there forever instead of fading.
    const grid = createGrid(96, 96)
    for (let y = 40; y < 60; y++) {
      for (let x = 40; x < 60; x++) placeMaterial(grid, cellIndex(grid, x, y), MaterialId.stone)
    }
    const pocket = cellIndex(grid, 50, 50)
    placeMaterial(grid, pocket, MaterialId.smoke)

    const rng = createRng(2)
    for (let tick = 0; tick < 900; tick++) tickWorld(grid, rng, tick)

    expect(grid.material[pocket]).not.toBe(MaterialId.smoke)
  })

  it('drains a sand column to the floor', () => {
    const grid = createGrid(96, 96)
    for (let x = 0; x < grid.width; x++) {
      placeMaterial(grid, cellIndex(grid, x, grid.height - 1), MaterialId.stone)
    }
    for (let y = 0; y < 20; y++) placeMaterial(grid, cellIndex(grid, 48, y), MaterialId.sand)

    const rng = createRng(1)
    for (let tick = 0; tick < 400; tick++) tickWorld(grid, rng, tick)

    for (let y = 0; y < 60; y++) {
      for (let x = 0; x < grid.width; x++) {
        expect(grid.material[cellIndex(grid, x, y)]).toBe(MaterialId.empty)
      }
    }
  })

  it('sinks a heavy gas down a shaft one cell wide', () => {
    // The same trap as the grain, for the one gas that picks what to try with a roll. Chlorine falls only
    // on a roll under 0.55 and rises on one over 0.85; in between it tries to spread, which a shaft this
    // narrow forbids. Nothing is written on those ticks and the stone walls never write anything either, so
    // the cell's own chunk would sleep on a lost roll and the gas would hang in mid-air forever.
    const grid = createGrid(96, 96)
    for (let y = 0; y < grid.height; y++) {
      placeMaterial(grid, cellIndex(grid, 41, y), MaterialId.stone)
      placeMaterial(grid, cellIndex(grid, 43, y), MaterialId.stone)
    }
    placeMaterial(grid, cellIndex(grid, 42, grid.height - 1), MaterialId.stone)
    placeMaterial(grid, cellIndex(grid, 42, 8), MaterialId.chlorine)

    const rng = createRng(4)
    for (let tick = 0; tick < 1200; tick++) tickWorld(grid, rng, tick)

    let deepest = -1
    for (let y = 0; y < grid.height; y++) {
      if (grid.material[cellIndex(grid, 42, y)] === MaterialId.chlorine) deepest = y
    }
    expect(deepest).toBe(grid.height - 2)
  })
})
