import { describe, it, expect } from 'vitest'
import { Grid, MaterialId } from '../pixel-world.types'
import { cellIndex, createGrid, placeMaterial } from './grid'
import { MATERIALS } from './materials'
import { createRng } from './rng'
import { advanceTimers } from './timers'

function put(grid: Grid, x: number, y: number, material: MaterialId): number {
  const index = cellIndex(grid, x, y)
  placeMaterial(grid, index, material)
  return index
}

function runTimers(grid: Grid, ticks: number, seed = 99): void {
  const rng = createRng(seed)
  for (let tick = 0; tick < ticks; tick++) advanceTimers(grid, rng)
}

const woodBurn = MATERIALS[MaterialId.wood].ignite?.ticks ?? 0
const smokeLife = MATERIALS[MaterialId.smoke].lifetime ?? 0

describe('advanceTimers', () => {
  it('burns a lit cell down into its residue', () => {
    const grid = createGrid(5, 5)
    const wood = put(grid, 2, 2, MaterialId.wood)
    grid.burn[wood] = woodBurn

    runTimers(grid, woodBurn - 1)
    expect(grid.material[wood]).toBe(MaterialId.wood)

    runTimers(grid, 1)
    expect(grid.material[wood]).toBe(MaterialId.ash)
    expect(grid.burn[wood]).toBe(0)
  })

  it('throws flames off a burning cell, so it reads as alight', () => {
    const grid = createGrid(9, 9)
    const wood = put(grid, 4, 6, MaterialId.wood)
    grid.burn[wood] = woodBurn

    runTimers(grid, 40)

    const flames = grid.material.reduce(
      (total, cell) => (cell === MaterialId.fire ? total + 1 : total),
      0
    )
    expect(flames).toBeGreaterThan(0)
  })

  it('vents into air only, never over something solid', () => {
    const grid = createGrid(5, 5)
    const wood = put(grid, 2, 2, MaterialId.wood)
    for (const [x, y] of [
      [2, 1],
      [1, 1],
      [3, 1],
      [1, 2],
      [3, 2],
    ]) {
      put(grid, x, y, MaterialId.stone)
    }
    grid.burn[wood] = woodBurn

    runTimers(grid, 200)

    expect(grid.material.some((cell) => cell === MaterialId.fire)).toBe(false)
  })

  it('puffs smoke into the air above a fire', () => {
    const grid = createGrid(5, 5)
    const wood = put(grid, 2, 3, MaterialId.wood)
    grid.burn[wood] = woodBurn

    runTimers(grid, 60)

    expect(grid.material[cellIndex(grid, 2, 2)]).toBe(MaterialId.smoke)
  })

  it('leaves the cell above a fire alone when it is already occupied', () => {
    const grid = createGrid(5, 5)
    const wood = put(grid, 2, 3, MaterialId.wood)
    put(grid, 2, 2, MaterialId.stone)
    grid.burn[wood] = woodBurn

    runTimers(grid, 60)

    expect(grid.material[cellIndex(grid, 2, 2)]).toBe(MaterialId.stone)
  })

  it('fades smoke away when its lifetime runs out', () => {
    const grid = createGrid(5, 5)
    const smoke = put(grid, 2, 2, MaterialId.smoke)
    expect(grid.data[smoke]).toBe(smokeLife)

    runTimers(grid, smokeLife)

    expect(grid.material[smoke]).toBe(MaterialId.empty)
  })

  it('condenses steam into water when its lifetime runs out', () => {
    const grid = createGrid(5, 5)
    const steam = put(grid, 2, 2, MaterialId.steam)

    runTimers(grid, MATERIALS[MaterialId.steam].lifetime ?? 0)

    expect(grid.material[steam]).toBe(MaterialId.water)
  })

  it('leaves materials without a clock untouched', () => {
    const grid = createGrid(5, 5)
    const stone = put(grid, 2, 2, MaterialId.stone)

    runTimers(grid, 500)

    expect(grid.material[stone]).toBe(MaterialId.stone)
    expect(grid.data[stone]).toBe(0)
  })

  it('spends a plant growth budget on nothing, since that is the reaction pass', () => {
    const grid = createGrid(5, 5)
    const plant = put(grid, 2, 2, MaterialId.plant)
    const budget = grid.data[plant]

    runTimers(grid, 100)

    expect(grid.data[plant]).toBe(budget)
  })
})
