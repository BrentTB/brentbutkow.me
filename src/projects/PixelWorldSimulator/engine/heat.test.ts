import { describe, it, expect } from 'vitest'
import { Grid, MaterialId } from '../pixel-world.types'
import { AMBIENT_TEMPERATURE } from '../data'
import { cellIndex, createGrid, placeMaterial } from './grid'
import { MATERIALS } from './materials'
import { simulateHeat } from './heat'

function put(grid: Grid, x: number, y: number, material: MaterialId): number {
  const index = cellIndex(grid, x, y)
  placeMaterial(grid, index, material)
  return index
}

function heatFor(grid: Grid, ticks: number): void {
  for (let tick = 0; tick < ticks; tick++) simulateHeat(grid)
}

/** A block of one material, so diffusion has somewhere to spread through. */
function slab(width: number, height: number, material: MaterialId): Grid {
  const grid = createGrid(width, height)
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) put(grid, x, y, material)
  }
  return grid
}

describe('simulateHeat', () => {
  it('spreads heat from a hot cell into its neighbours', () => {
    const grid = slab(9, 9, MaterialId.stone)
    const middle = cellIndex(grid, 4, 4)
    grid.temperature[middle] = 900

    heatFor(grid, 10)

    expect(grid.temperature[cellIndex(grid, 4, 5)]).toBeGreaterThan(AMBIENT_TEMPERATURE)
    expect(grid.temperature[cellIndex(grid, 5, 4)]).toBeGreaterThan(AMBIENT_TEMPERATURE)
    expect(grid.temperature[middle]).toBeLessThan(900)
  })

  it('spreads heat symmetrically, so the double buffer is doing its job', () => {
    const grid = slab(11, 11, MaterialId.stone)
    grid.temperature[cellIndex(grid, 5, 5)] = 900

    heatFor(grid, 6)

    const up = grid.temperature[cellIndex(grid, 5, 3)]
    expect(grid.temperature[cellIndex(grid, 5, 7)]).toBe(up)
    expect(grid.temperature[cellIndex(grid, 3, 5)]).toBe(up)
    expect(grid.temperature[cellIndex(grid, 7, 5)]).toBe(up)
  })

  it('lets a warm world drift back to room temperature', () => {
    const grid = slab(5, 5, MaterialId.stone)
    grid.temperature.fill(300)

    heatFor(grid, 2000)

    expect(grid.temperature[cellIndex(grid, 2, 2)]).toBe(AMBIENT_TEMPERATURE)
  })

  it('keeps lava molten on its own', () => {
    const grid = createGrid(5, 5)
    const lava = put(grid, 2, 2, MaterialId.lava)

    heatFor(grid, 200)

    expect(grid.material[lava]).toBe(MaterialId.lava)
    expect(grid.temperature[lava]).toBeGreaterThan(MATERIALS[MaterialId.lava].cold?.at ?? 0)
  })

  it('melts ice that gets warm and freezes water that gets cold', () => {
    const grid = createGrid(5, 5)
    const ice = put(grid, 1, 1, MaterialId.ice)
    const water = put(grid, 3, 3, MaterialId.water)
    grid.temperature[ice] = 40
    grid.temperature[water] = -40

    simulateHeat(grid)

    expect(grid.material[ice]).toBe(MaterialId.water)
    expect(grid.material[water]).toBe(MaterialId.ice)
  })

  it('boils water into steam and condenses steam back into water', () => {
    const grid = createGrid(5, 5)
    const water = put(grid, 1, 1, MaterialId.water)
    const steam = put(grid, 3, 3, MaterialId.steam)
    grid.temperature[water] = 400
    grid.temperature[steam] = 10

    simulateHeat(grid)

    expect(grid.material[water]).toBe(MaterialId.steam)
    expect(grid.material[steam]).toBe(MaterialId.water)
  })

  it('does not flicker steam and water against each other at the boiling point', () => {
    const grid = createGrid(5, 5)
    const cell = put(grid, 2, 2, MaterialId.water)
    grid.temperature[cell] = 101

    heatFor(grid, 400)

    // It boils, then the steam cools past its condensation point and settles as water again.
    expect(grid.material[cell]).toBe(MaterialId.water)
    expect(grid.temperature[cell]).toBeLessThan(MATERIALS[MaterialId.steam].cold?.at ?? 0)
  })

  it('melts sand into glass under lava heat', () => {
    const grid = createGrid(5, 5)
    const sand = put(grid, 2, 2, MaterialId.sand)
    grid.temperature[sand] = 1500

    simulateHeat(grid)

    expect(grid.material[sand]).toBe(MaterialId.glass)
  })

  it('sets fuel alight once it is hot enough, and only once', () => {
    const grid = createGrid(5, 5)
    const wood = put(grid, 2, 2, MaterialId.wood)
    grid.temperature[wood] = 900

    simulateHeat(grid)
    const litFor = grid.burn[wood]
    expect(litFor).toBe(MATERIALS[MaterialId.wood].ignite?.ticks)

    grid.burn[wood] -= 5
    simulateHeat(grid)
    expect(grid.burn[wood]).toBe(litFor - 5)
  })

  it('leaves cold fuel alone', () => {
    const grid = createGrid(5, 5)
    const wood = put(grid, 2, 2, MaterialId.wood)

    heatFor(grid, 100)

    expect(grid.burn[wood]).toBe(0)
    expect(grid.material[wood]).toBe(MaterialId.wood)
  })
})
