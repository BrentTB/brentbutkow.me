import { describe, it, expect } from 'vitest'
import { MaterialId } from '../pixel-world.types'
import { stampCircle, stampLine } from './brush'
import { cellIndex, createGrid } from './grid'
import { MATERIALS } from './materials'

describe('stampCircle', () => {
  it('paints a single cell at radius 0', () => {
    const grid = createGrid(9, 9)
    stampCircle(grid, 4, 4, 0, MaterialId.sand)

    expect(grid.material[cellIndex(grid, 4, 4)]).toBe(MaterialId.sand)
    expect(grid.material.filter((cell) => cell === MaterialId.sand).length).toBe(1)
    expect(grid.material.filter((cell) => cell !== MaterialId.empty).length).toBe(1)
  })

  it('paints a round blob, not a square', () => {
    const grid = createGrid(11, 11)
    stampCircle(grid, 5, 5, 3, MaterialId.stone)

    expect(grid.material[cellIndex(grid, 5, 2)]).toBe(MaterialId.stone)
    expect(grid.material[cellIndex(grid, 2, 5)]).toBe(MaterialId.stone)
    expect(grid.material[cellIndex(grid, 2, 2)]).toBe(MaterialId.empty)
  })

  it('clips at the edges instead of wrapping', () => {
    const grid = createGrid(8, 8)
    stampCircle(grid, 0, 0, 3, MaterialId.water)

    expect(grid.material[cellIndex(grid, 0, 0)]).toBe(MaterialId.water)
    for (let y = 0; y < 8; y++) expect(grid.material[cellIndex(grid, 7, y)]).toBe(MaterialId.empty)
  })

  it('flows around what it cannot paint over', () => {
    const grid = createGrid(9, 9)
    grid.material.fill(MaterialId.stone)
    stampCircle(grid, 4, 4, 2, MaterialId.water)

    expect(grid.material.every((cell) => cell === MaterialId.stone)).toBe(true)
  })

  it('paints something more solid over something looser', () => {
    const grid = createGrid(9, 9)
    grid.material.fill(MaterialId.water)
    stampCircle(grid, 4, 4, 1, MaterialId.sand)
    stampCircle(grid, 0, 0, 0, MaterialId.stone)

    expect(grid.material[cellIndex(grid, 4, 4)]).toBe(MaterialId.sand)
    expect(grid.material[cellIndex(grid, 0, 0)]).toBe(MaterialId.stone)
  })

  it('will not bury solid material under a powder', () => {
    const grid = createGrid(9, 9)
    grid.material.fill(MaterialId.stone)
    stampCircle(grid, 4, 4, 2, MaterialId.sand)

    expect(grid.material.every((cell) => cell === MaterialId.stone)).toBe(true)
  })

  it('sets fuel alight instead of failing to paint over it', () => {
    const grid = createGrid(9, 9)
    grid.material.fill(MaterialId.wood)
    stampCircle(grid, 4, 4, 1, MaterialId.fire)

    expect(grid.material[cellIndex(grid, 4, 4)]).toBe(MaterialId.wood)
    expect(grid.burn[cellIndex(grid, 4, 4)]).toBe(MATERIALS[MaterialId.wood].ignite?.ticks)
    expect(grid.burn[cellIndex(grid, 0, 0)]).toBe(0)
  })

  it('leaves an already-burning cell on the clock it started with', () => {
    const grid = createGrid(9, 9)
    grid.material.fill(MaterialId.wood)
    const plank = cellIndex(grid, 4, 4)

    stampCircle(grid, 4, 4, 0, MaterialId.fire)
    // Part-burned, as it would be a moment later.
    grid.burn[plank] = 5
    stampCircle(grid, 4, 4, 0, MaterialId.fire)

    // A held brush restamps the same cell every frame, and refreshing the countdown each time left
    // wood under it burning forever instead of turning to ash.
    expect(grid.burn[plank]).toBe(5)
  })

  it('paints flame into open air as a material', () => {
    const grid = createGrid(9, 9)
    stampCircle(grid, 4, 4, 0, MaterialId.fire)

    expect(grid.material[cellIndex(grid, 4, 4)]).toBe(MaterialId.fire)
  })

  it('sets a charge off with the fire brush, the same as lighting a plank', () => {
    const grid = createGrid(9, 9)
    grid.material.fill(MaterialId.tnt)

    stampCircle(grid, 4, 4, 1, MaterialId.fire)

    // A match you cannot touch off dynamite with is a strange match. Strictly above the threshold, not
    // level with it: diffusion takes a few degrees before the threshold is tested.
    const { explodes } = MATERIALS[MaterialId.tnt]
    expect(grid.temperature[cellIndex(grid, 4, 4)]).toBeGreaterThan(explodes?.at ?? Infinity)
    expect(grid.material[cellIndex(grid, 4, 4)]).toBe(MaterialId.tnt)
  })

  it('leaves material that cannot burn to the paint hierarchy', () => {
    const grid = createGrid(9, 9)
    grid.material.fill(MaterialId.stone)
    stampCircle(grid, 4, 4, 1, MaterialId.fire)

    expect(grid.material.every((cell) => cell === MaterialId.stone)).toBe(true)
    expect(grid.burn.every((cell) => cell === 0)).toBe(true)
  })

  it('restarts the clock of a cell drawn over twice', () => {
    // A second loop of spark across its own trail has to leave the whole trail expiring together;
    // the hierarchy blocks spark-over-spark, so without a refresh the older pass dies first and
    // punches a hole in the line.
    const grid = createGrid(9, 9)
    const { lifetime } = MATERIALS[MaterialId.spark]
    stampCircle(grid, 4, 4, 0, MaterialId.spark)
    grid.data[cellIndex(grid, 4, 4)] = 3

    stampCircle(grid, 4, 4, 0, MaterialId.spark)

    expect(grid.data[cellIndex(grid, 4, 4)]).toBe(lifetime)
  })

  it('leaves the heat of a cell drawn over twice alone', () => {
    // Refreshing a clock is not repainting: a puddle you draw water over again stays as hot as it was.
    const grid = createGrid(9, 9)
    stampCircle(grid, 4, 4, 0, MaterialId.water)
    grid.temperature[cellIndex(grid, 4, 4)] = 80

    stampCircle(grid, 4, 4, 0, MaterialId.water)

    expect(grid.temperature[cellIndex(grid, 4, 4)]).toBe(80)
  })

  it('erases by painting air', () => {
    const grid = createGrid(9, 9)
    grid.material.fill(MaterialId.sand)
    stampCircle(grid, 4, 4, 1, MaterialId.empty)

    expect(grid.material[cellIndex(grid, 4, 4)]).toBe(MaterialId.empty)
    expect(grid.material[cellIndex(grid, 0, 0)]).toBe(MaterialId.sand)
  })
})

describe('stampLine', () => {
  it('leaves no gaps along a fast diagonal drag', () => {
    const grid = createGrid(40, 40)
    stampLine(grid, 2, 2, 30, 20, 0, MaterialId.sand)

    // Every painted row between the endpoints has at least one cell — a dotted line fails here.
    for (let y = 2; y <= 20; y++) {
      const row = Array.from({ length: grid.width }, (_, x) => grid.material[cellIndex(grid, x, y)])
      expect(row.some((cell) => cell === MaterialId.sand)).toBe(true)
    }
  })

  it('matches a single circle when both samples land on the same cell', () => {
    const line = createGrid(15, 15)
    const circle = createGrid(15, 15)
    stampLine(line, 7, 7, 7, 7, 2, MaterialId.water)
    stampCircle(circle, 7, 7, 2, MaterialId.water)

    expect(Array.from(line.material)).toEqual(Array.from(circle.material))
  })
})
