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

  it('melts ice that gets warm', () => {
    const grid = createGrid(5, 5)
    const ice = put(grid, 1, 1, MaterialId.ice)
    grid.temperature[ice] = 40

    simulateHeat(grid)

    expect(grid.material[ice]).toBe(MaterialId.water)
  })

  it('boils water into steam', () => {
    const grid = createGrid(5, 5)
    const water = put(grid, 1, 1, MaterialId.water)
    grid.temperature[water] = 400

    simulateHeat(grid)

    expect(grid.material[water]).toBe(MaterialId.steam)
  })

  it('leaves steam as steam however cold it gets, so it drifts instead of collapsing in place', () => {
    const grid = createGrid(5, 5)
    const steam = put(grid, 3, 3, MaterialId.steam)
    grid.temperature[steam] = 10

    heatFor(grid, 400)

    // Condensation is the lifetime clock's job. Doing it by temperature made water on lava flicker
    // between the two states in the same cell forever.
    expect(grid.material[steam]).toBe(MaterialId.steam)
  })

  it('keeps ice frozen at room temperature', () => {
    const grid = createGrid(9, 9)
    const ice = put(grid, 4, 4, MaterialId.ice)

    heatFor(grid, 600)

    expect(grid.material[ice]).toBe(MaterialId.ice)
    expect(grid.temperature[ice]).toBeLessThan(MATERIALS[MaterialId.ice].hot?.at ?? 0)
  })

  it('freezes water only when something cryogenic gets hold of it', () => {
    const grid = createGrid(9, 9)
    const water = put(grid, 4, 5, MaterialId.water)
    grid.temperature[water] = -80

    simulateHeat(grid)

    expect(grid.material[water]).toBe(MaterialId.ice)
  })

  it('leaves water beside ice for the frost rule to convert, not the heat pass', () => {
    const grid = createGrid(9, 9)
    put(grid, 4, 4, MaterialId.ice)
    const water = put(grid, 4, 5, MaterialId.water)

    heatFor(grid, 600)

    // The heat pass chills it, but a growing ice mass crashing the pool's temperature snap-froze the
    // whole thing in a second, so conversion belongs to the contact rule in reactions.ts.
    expect(grid.material[water]).toBe(MaterialId.water)
    expect(grid.temperature[water]).toBeLessThan(AMBIENT_TEMPERATURE)
  })

  it('melts ice against a flame', () => {
    const grid = createGrid(9, 9)
    const ice = put(grid, 4, 4, MaterialId.ice)
    put(grid, 4, 3, MaterialId.fire)

    heatFor(grid, 200)

    expect(grid.material[ice]).not.toBe(MaterialId.ice)
  })

  it('bills the hottest neighbour for the heat a boil consumed', () => {
    const grid = createGrid(5, 5)
    const lava = put(grid, 2, 3, MaterialId.lava)
    const water = put(grid, 2, 2, MaterialId.water)
    grid.temperature[water] = 400
    const lavaBefore = grid.temperature[lava]

    simulateHeat(grid)

    expect(grid.material[water]).toBe(MaterialId.steam)
    expect(grid.temperature[lava]).toBeLessThan(lavaBefore)
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

describe('explosives in the heat pass', () => {
  it('sets a charge off instead of letting it burn', () => {
    const grid = createGrid(41, 41)
    const charge = put(grid, 20, 20, MaterialId.tnt)
    const neighbour = put(grid, 24, 20, MaterialId.sand)
    const { explodes } = MATERIALS[MaterialId.tnt]
    grid.temperature[charge] = (explodes?.at ?? 0) + 10

    simulateHeat(grid)

    expect(grid.material[charge]).toBe(explodes?.into)
    expect(grid.velocity.get(neighbour)).toBeDefined()
  })

  it('runs a trail of gunpowder along itself', () => {
    const grid = createGrid(41, 41)
    const trail = [22, 23, 24, 25, 26].map((x) => put(grid, x, 20, MaterialId.gunpowder))
    const { explodes } = MATERIALS[MaterialId.gunpowder]
    grid.temperature[trail[0]] = (explodes?.at ?? 0) + 10

    heatFor(grid, 12)

    // Each grain's own pulse is what lights the next one, so the whole trail goes.
    expect(trail.every((cell) => grid.material[cell] !== MaterialId.gunpowder)).toBe(true)
  })

  it('lets a pocket of gas go off with a bang, not a candle', () => {
    const grid = createGrid(41, 41)
    for (let x = 18; x <= 22; x++) put(grid, x, 20, MaterialId.methane)
    const bystander = put(grid, 26, 20, MaterialId.sand)
    const { ignite } = MATERIALS[MaterialId.methane]
    grid.temperature[cellIndex(grid, 20, 20)] = (ignite?.at ?? 0) + 20

    heatFor(grid, 4)

    expect(grid.velocity.size).toBeGreaterThan(0)
    expect(grid.velocity.get(bystander)?.vx ?? 0).toBeGreaterThanOrEqual(0)
  })
})
