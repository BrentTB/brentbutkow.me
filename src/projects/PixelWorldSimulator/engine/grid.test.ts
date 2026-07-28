import { describe, it, expect } from 'vitest'
import { MaterialId } from '../pixel-world.types'
import { AMBIENT_TEMPERATURE } from '../data'
import { createRng } from './rng'
import { tickWorld } from './tick'
import {
  asMaterial,
  cellIndex,
  clearGrid,
  createGrid,
  inBounds,
  markHotRow,
  markHotRowBand,
  placeMaterial,
  refreshCell,
  swapCells,
  transformCell,
} from './grid'
import { MATERIALS } from './materials'

describe('grid', () => {
  it('allocates one cell per position', () => {
    const grid = createGrid(7, 4)
    expect(grid.material).toHaveLength(28)
    expect(grid.moved).toHaveLength(28)
    expect(grid.data).toHaveLength(28)
    expect(grid.burn).toHaveLength(28)
    expect(grid.temperature).toHaveLength(28)
    expect(grid.temperatureNext).toHaveLength(28)
    expect(grid.material.every((cell) => cell === MaterialId.empty)).toBe(true)
  })

  it('starts every cell at room temperature with nothing awake', () => {
    const grid = createGrid(7, 4)
    expect(grid.temperature.every((heat) => heat === AMBIENT_TEMPERATURE)).toBe(true)
    expect(grid.temperatureNext.every((heat) => heat === AMBIENT_TEMPERATURE)).toBe(true)
    expect(grid.hotRows).toHaveLength(4)
    expect(grid.hotRows.every((row) => row === 0)).toBe(true)
  })

  it('indexes row-major', () => {
    const grid = createGrid(10, 5)
    expect(cellIndex(grid, 0, 0)).toBe(0)
    expect(cellIndex(grid, 3, 0)).toBe(3)
    expect(cellIndex(grid, 3, 2)).toBe(23)
  })

  it('bounds-checks every edge', () => {
    const grid = createGrid(4, 3)
    expect(inBounds(grid, 0, 0)).toBe(true)
    expect(inBounds(grid, 3, 2)).toBe(true)
    expect(inBounds(grid, -1, 0)).toBe(false)
    expect(inBounds(grid, 0, -1)).toBe(false)
    expect(inBounds(grid, 4, 0)).toBe(false)
    expect(inBounds(grid, 0, 3)).toBe(false)
  })

  it('clears every layer together', () => {
    const grid = createGrid(4, 4)
    grid.material.fill(MaterialId.sand)
    grid.moved.fill(1)
    grid.data.fill(9)
    grid.burn.fill(3)
    grid.temperature.fill(800)
    grid.hotRows.fill(1)

    clearGrid(grid)

    expect(grid.material.every((cell) => cell === MaterialId.empty)).toBe(true)
    expect(grid.moved.every((flag) => flag === 0)).toBe(true)
    expect(grid.data.every((value) => value === 0)).toBe(true)
    expect(grid.burn.every((value) => value === 0)).toBe(true)
    expect(grid.temperature.every((heat) => heat === AMBIENT_TEMPERATURE)).toBe(true)
    expect(grid.hotRows.every((row) => row === 0)).toBe(true)
  })
})

describe('placeMaterial', () => {
  it('gives a fresh cell its own starting temperature', () => {
    const grid = createGrid(5, 5)
    const cell = cellIndex(grid, 2, 2)

    placeMaterial(grid, cell, MaterialId.lava)

    expect(grid.temperature[cell]).toBe(MATERIALS[MaterialId.lava].startTemperature)
  })

  it('starts a gas with its full lifetime and acid with its full charges', () => {
    const grid = createGrid(5, 5)
    const gas = cellIndex(grid, 1, 1)
    const drop = cellIndex(grid, 3, 3)

    placeMaterial(grid, gas, MaterialId.smoke)
    placeMaterial(grid, drop, MaterialId.acid)

    expect(grid.data[gas]).toBe(MATERIALS[MaterialId.smoke].lifetime)
    expect(grid.data[drop]).toBe(MATERIALS[MaterialId.acid].uses)
  })

  it('gives a fresh creature its starting energy', () => {
    const grid = createGrid(5, 5)
    const cell = cellIndex(grid, 2, 2)

    placeMaterial(grid, cell, MaterialId.fish)

    // Energy shares the `data` byte with gas lifetimes and acid charges: a creature placed with zero in
    // there is a creature that dies on the tick it was painted.
    expect(grid.data[cell]).toBe(MATERIALS[MaterialId.fish].life?.startEnergy)
  })

  it('puts a plain material at room temperature with no counter', () => {
    const grid = createGrid(5, 5)
    const cell = cellIndex(grid, 2, 2)

    placeMaterial(grid, cell, MaterialId.stone)

    expect(grid.temperature[cell]).toBe(AMBIENT_TEMPERATURE)
    expect(grid.data[cell]).toBe(0)
  })

  it('puts out a cell it paints over', () => {
    const grid = createGrid(5, 5)
    const cell = cellIndex(grid, 2, 2)
    grid.burn[cell] = 50

    placeMaterial(grid, cell, MaterialId.stone)

    expect(grid.burn[cell]).toBe(0)
  })

  it('wakes the row it painted and the rows either side', () => {
    const grid = createGrid(5, 5)

    placeMaterial(grid, cellIndex(grid, 2, 2), MaterialId.lava)

    expect(Array.from(grid.hotRows)).toEqual([0, 1, 1, 1, 0])
  })
})

describe('transformCell', () => {
  it('keeps the heat that caused the change', () => {
    const grid = createGrid(5, 5)
    const cell = cellIndex(grid, 2, 2)
    placeMaterial(grid, cell, MaterialId.water)
    grid.temperature[cell] = 400

    transformCell(grid, cell, MaterialId.steam)

    expect(grid.material[cell]).toBe(MaterialId.steam)
    expect(grid.temperature[cell]).toBe(400)
  })

  it('resets the counters to the new material', () => {
    const grid = createGrid(5, 5)
    const cell = cellIndex(grid, 2, 2)
    grid.burn[cell] = 40

    transformCell(grid, cell, MaterialId.steam)

    expect(grid.data[cell]).toBe(MATERIALS[MaterialId.steam].lifetime)
    expect(grid.burn[cell]).toBe(0)
  })
})

describe('velocity layer', () => {
  it('starts empty and is emptied by a clear', () => {
    const grid = createGrid(5, 5)
    const cell = cellIndex(grid, 2, 2)
    expect(grid.velocity.size).toBe(0)

    placeMaterial(grid, cell, MaterialId.sand)
    grid.velocity.set(cell, { vx: 1, vy: -1, ox: 0, oy: 0 })
    clearGrid(grid)

    // Debris left in the map would keep flying through the world you just wiped.
    expect(grid.velocity.size).toBe(0)
  })
})

describe('ant heading layer', () => {
  it('starts empty and is emptied by a clear', () => {
    const grid = createGrid(5, 5)
    const cell = cellIndex(grid, 2, 2)
    expect(grid.heading.size).toBe(0)

    placeMaterial(grid, cell, MaterialId.ant)
    grid.heading.set(cell, { hx: 1, hy: 0 })
    clearGrid(grid)

    // A heading left pointing at a wiped cell would steer a ghost ant on the next world.
    expect(grid.heading.size).toBe(0)
  })
})

describe('swapCells', () => {
  it('carries counters and heat with the material', () => {
    const grid = createGrid(5, 5)
    const from = cellIndex(grid, 2, 2)
    const to = cellIndex(grid, 2, 3)
    placeMaterial(grid, from, MaterialId.lava)
    placeMaterial(grid, to, MaterialId.water)

    swapCells(grid, from, to)

    expect(grid.material[to]).toBe(MaterialId.lava)
    expect(grid.temperature[to]).toBe(MATERIALS[MaterialId.lava].startTemperature)
    expect(grid.material[from]).toBe(MaterialId.water)
  })

  it('wakes both rows when either end carries heat', () => {
    const grid = createGrid(5, 5)
    const from = cellIndex(grid, 2, 1)
    const to = cellIndex(grid, 2, 3)
    placeMaterial(grid, from, MaterialId.lava)
    grid.hotRows.fill(0)

    swapCells(grid, from, to)

    expect(grid.hotRows[1]).toBe(1)
    expect(grid.hotRows[3]).toBe(1)
  })
})

describe('refreshCell', () => {
  it('winds the counter back up to full', () => {
    const grid = createGrid(5, 5)
    const cell = cellIndex(grid, 2, 2)
    placeMaterial(grid, cell, MaterialId.spark)
    grid.data[cell] = 2

    refreshCell(grid, cell, MaterialId.spark)

    expect(grid.data[cell]).toBe(MATERIALS[MaterialId.spark].lifetime)
  })

  it('leaves heat and fire where they were', () => {
    const grid = createGrid(5, 5)
    const cell = cellIndex(grid, 2, 2)
    placeMaterial(grid, cell, MaterialId.wood)
    grid.temperature[cell] = 300
    grid.burn[cell] = 9

    refreshCell(grid, cell, MaterialId.wood)

    expect(grid.temperature[cell]).toBe(300)
    expect(grid.burn[cell]).toBe(9)
  })
})

describe('markHotRow', () => {
  it('clamps at the top and bottom rows', () => {
    const grid = createGrid(4, 3)

    markHotRow(grid, cellIndex(grid, 1, 0))
    expect(Array.from(grid.hotRows)).toEqual([1, 1, 0])

    grid.hotRows.fill(0)
    markHotRow(grid, cellIndex(grid, 1, 2))
    expect(Array.from(grid.hotRows)).toEqual([0, 1, 1])
  })
})

describe('markHotRowBand', () => {
  it('wakes the band and a row either side of it, the same as marking each row by hand', () => {
    // A blast heats hundreds of cells that land in a couple of dozen rows, so waking per cell did the same
    // work hundreds of times over. Waking the band has to leave the heat pass with exactly the same rows
    // awake, or heat would be skipped in the row a blast reached.
    const grid = createGrid(4, 10)
    const perCell = createGrid(4, 10)

    markHotRowBand(grid, 4, 6)
    for (let row = 4; row <= 6; row++) markHotRow(perCell, cellIndex(perCell, 0, row))

    expect(Array.from(grid.hotRows)).toEqual(Array.from(perCell.hotRows))
    expect(Array.from(grid.hotRows)).toEqual([0, 0, 0, 1, 1, 1, 1, 1, 0, 0])
  })

  it('clamps at the top and bottom rather than writing past the grid', () => {
    const grid = createGrid(4, 3)

    markHotRowBand(grid, -8, 40)

    expect(Array.from(grid.hotRows)).toEqual([1, 1, 1])
  })

  it('leaves a world alone where the band is off the grid entirely', () => {
    const grid = createGrid(4, 3)

    markHotRowBand(grid, 20, 24)

    expect(Array.from(grid.hotRows)).toEqual([0, 0, 0])
  })
})

describe('asMaterial', () => {
  it('hands back every id unchanged', () => {
    // The single spot where the sim admits its typed arrays hold MaterialId bytes. If this ever starts
    // mapping or clamping, every read in the engine quietly changes meaning.
    for (const material of MATERIALS) {
      expect(asMaterial(material.id)).toBe(material.id)
    }
  })
})

describe('clearGrid and the chunk flags', () => {
  it('wakes everything, so a wiped world can be drawn into again', () => {
    const grid = createGrid(96, 96)
    for (let x = 0; x < grid.width; x++) {
      placeMaterial(grid, cellIndex(grid, x, grid.height - 1), MaterialId.stone)
    }
    const rng = createRng(1)
    for (let tick = 0; tick < 100; tick++) tickWorld(grid, rng, tick)
    // It has gone quiet, which is the state a clear has to undo.
    expect(grid.awakeChunks.some((flag) => flag === 0)).toBe(true)

    clearGrid(grid)

    // A cleared world has no last tick to have been quiet during, so nothing may still be asleep.
    expect(grid.awakeChunks.every((flag) => flag === 1)).toBe(true)
  })
})

describe('the air field on a grid', () => {
  it('starts still and is wiped along with everything else', () => {
    const grid = createGrid(64, 64)
    expect(grid.airX.every((speed) => speed === 0)).toBe(true)
    expect(grid.airY.every((speed) => speed === 0)).toBe(true)

    grid.airX[cellIndex(grid, 10, 10)] = 5
    grid.airY[cellIndex(grid, 10, 10)] = -5
    clearGrid(grid)

    // A wiped world has no weather either.
    expect(grid.airX.every((speed) => speed === 0)).toBe(true)
    expect(grid.airY.every((speed) => speed === 0)).toBe(true)
  })
})
