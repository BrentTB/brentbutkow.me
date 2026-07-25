import { describe, it, expect } from 'vitest'
import { Grid, MaterialId } from '../pixel-world.types'
import { stampCircle } from './brush'
import { cellIndex, createGrid, placeMaterial } from './grid'
import { MATERIALS } from './materials'
import { createRng } from './rng'
import { applyReactions } from './reactions'
import { tickWorld } from './tick'

function put(grid: Grid, x: number, y: number, material: MaterialId): number {
  const index = cellIndex(grid, x, y)
  placeMaterial(grid, index, material)
  return index
}

function react(grid: Grid, ticks: number, seed = 7): void {
  const rng = createRng(seed)
  for (let tick = 0; tick < ticks; tick++) applyReactions(grid, rng)
}

function count(grid: Grid, material: MaterialId): number {
  return grid.material.reduce((total, cell) => (cell === material ? total + 1 : total), 0)
}

describe('acid', () => {
  it('eats a neighbour it touches', () => {
    const grid = createGrid(5, 5)
    put(grid, 2, 2, MaterialId.acid)
    const sand = put(grid, 2, 3, MaterialId.sand)

    react(grid, 200)

    expect(grid.material[sand]).toBe(MaterialId.empty)
  })

  it('leaves glass alone, whatever it is sitting in', () => {
    const grid = createGrid(5, 5)
    const acid = put(grid, 2, 2, MaterialId.acid)
    const glass = put(grid, 2, 3, MaterialId.glass)
    put(grid, 1, 2, MaterialId.glass)
    put(grid, 3, 2, MaterialId.glass)
    put(grid, 2, 1, MaterialId.glass)

    react(grid, 1000)

    expect(grid.material[glass]).toBe(MaterialId.glass)
    expect(grid.material[acid]).toBe(MaterialId.acid)
  })

  it('corrodes stone, but far slower than it eats sand', () => {
    const eatTime = (target: MaterialId) => {
      const grid = createGrid(5, 5)
      const cell = put(grid, 2, 3, target)
      put(grid, 2, 2, MaterialId.acid)

      const rng = createRng(31)
      for (let tick = 0; tick < 20_000; tick++) {
        applyReactions(grid, rng)
        if (grid.material[cell] === MaterialId.empty) return tick
      }
      return Infinity
    }

    const stone = eatTime(MaterialId.stone)
    const sand = eatTime(MaterialId.sand)

    expect(stone).toBeLessThan(Infinity)
    expect(stone).toBeGreaterThan(sand * 2)
  })

  it('spends one charge per cell it eats', () => {
    const grid = createGrid(5, 5)
    const acid = put(grid, 2, 2, MaterialId.acid)
    put(grid, 2, 3, MaterialId.sand)
    const charges = grid.data[acid]

    react(grid, 200)

    expect(grid.data[acid]).toBe(charges - 1)
  })

  it('digs down through sand until its charges run out', () => {
    const uses = MATERIALS[MaterialId.acid].uses ?? 0
    const grid = createGrid(20, 30)
    for (let x = 0; x < 20; x++) {
      for (let y = 4; y < 30; y++) put(grid, x, y, MaterialId.sand)
    }
    put(grid, 10, 3, MaterialId.acid)
    const sandBefore = count(grid, MaterialId.sand)

    // The full tick, because a drop only reaches fresh sand by sinking into the hole it just made.
    const rng = createRng(11)
    for (let tick = 0; tick < 3000; tick++) tickWorld(grid, rng, tick)

    expect(count(grid, MaterialId.acid)).toBe(0)
    const eaten = sandBefore - count(grid, MaterialId.sand)
    expect(eaten).toBe(uses)
  })
})

describe('frost', () => {
  it('creeps into the water a cube of ice is touching', () => {
    const grid = createGrid(12, 12)
    put(grid, 6, 6, MaterialId.ice)
    for (let x = 1; x < 11; x++) {
      for (let y = 7; y < 11; y++) put(grid, x, y, MaterialId.water)
    }

    react(grid, 1200)

    expect(count(grid, MaterialId.ice)).toBeGreaterThan(1)
  })

  it('creeps rather than snapping the pool solid', () => {
    const grid = createGrid(20, 20)
    put(grid, 10, 9, MaterialId.ice)
    for (let x = 0; x < 20; x++) {
      for (let y = 10; y < 20; y++) put(grid, x, y, MaterialId.water)
    }
    const pool = count(grid, MaterialId.water)

    // One second of play at 60 Hz.
    react(grid, 60)

    expect(count(grid, MaterialId.ice)).toBeLessThan(pool / 10)
  })

  it('catches a drop that is only touching for a moment', () => {
    const grid = createGrid(9, 9)
    put(grid, 4, 4, MaterialId.ice)
    const drop = cellIndex(grid, 4, 5)
    placeMaterial(grid, drop, MaterialId.water)

    // A single tick of contact, the way a falling drop gets. A low per-tick chance never caught this.
    const rng = createRng(5)
    applyReactions(grid, rng)

    expect(grid.material[drop]).toBe(MaterialId.ice)
  })

  it('rests between freezes, so one cube cannot run away with a pool', () => {
    const grid = createGrid(9, 9)
    const ice = cellIndex(grid, 4, 4)
    put(grid, 4, 4, MaterialId.ice)
    for (const [x, y] of [
      [4, 3],
      [3, 4],
      [5, 4],
      [4, 5],
    ]) {
      put(grid, x, y, MaterialId.water)
    }

    const rng = createRng(5)
    applyReactions(grid, rng)
    const afterFirst = count(grid, MaterialId.ice)
    applyReactions(grid, rng)
    applyReactions(grid, rng)

    expect(afterFirst).toBe(2)
    expect(count(grid, MaterialId.ice)).toBe(2)
    expect(grid.data[ice]).toBeGreaterThan(0)
  })

  it('gives each cell its own rest length, so the sheet cannot freeze in lockstep', () => {
    // Several cubes freeze in the same pass, so every rest here was handed out on the same tick. A
    // shared cooldown makes them identical, and identical cooldowns wake the sheet together — which is
    // what advanced the ice in pulses instead of a creep.
    const grid = createGrid(40, 8)
    for (let x = 2; x < 38; x += 3) {
      put(grid, x, 3, MaterialId.ice)
      put(grid, x, 4, MaterialId.water)
    }

    applyReactions(grid, createRng(17))

    const rests = new Set<number>()
    for (let index = 0; index < grid.material.length; index++) {
      if (grid.material[index] === MaterialId.ice && grid.data[index] > 0)
        rests.add(grid.data[index])
    }

    expect(rests.size).toBeGreaterThan(2)
  })

  it('leaves ice alone with nothing to freeze', () => {
    const grid = createGrid(9, 9)
    const ice = put(grid, 4, 4, MaterialId.ice)

    react(grid, 500)

    expect(count(grid, MaterialId.ice)).toBe(1)
    expect(grid.material[ice]).toBe(MaterialId.ice)
  })
})

describe('vines', () => {
  const floodedPool = (size: number, seed: MaterialId) => {
    const grid = createGrid(size, size)
    for (let x = 0; x < size; x++) {
      for (let y = 0; y < size; y++) put(grid, x, y, MaterialId.water)
    }
    put(grid, size >> 1, size >> 1, seed)
    return grid
  }

  it('keeps growing long past the point a plant runs out', () => {
    const budget = MATERIALS[MaterialId.plant].uses ?? 0
    const vines = floodedPool(30, MaterialId.vine)
    const plants = floodedPool(30, MaterialId.plant)

    react(vines, 6000)
    react(plants, 6000)

    expect(count(plants, MaterialId.plant)).toBeLessThanOrEqual(budget + 1)
    expect(count(vines, MaterialId.vine)).toBeGreaterThan((budget + 1) * 4)
  })

  it('grows from a painted blob, not just from a lone seed', () => {
    const grid = createGrid(40, 40)
    for (let x = 0; x < 40; x++) {
      for (let y = 0; y < 40; y++) put(grid, x, y, MaterialId.water)
    }
    // What a brush stroke actually leaves: a disc whose cells are all surrounded by their own kind.
    stampCircle(grid, 20, 20, 5, MaterialId.vine)
    const painted = count(grid, MaterialId.vine)

    react(grid, 4000, 13)

    // Testing crowding on the grower as well as the target made painted vine completely inert.
    expect(count(grid, MaterialId.vine)).toBeGreaterThan(painted * 3)
  })

  it('leaves water in the gaps instead of filling solid', () => {
    const grid = floodedPool(30, MaterialId.vine)

    react(grid, 12000)

    // Growth has run itself out by now, and it should still be a tangle rather than a green block.
    const filled = count(grid, MaterialId.vine) / (30 * 30)
    expect(filled).toBeGreaterThan(0.2)
    expect(filled).toBeLessThan(0.75)
    expect(count(grid, MaterialId.water)).toBeGreaterThan(0)
  })

  it('never thickens into a solid mass', () => {
    const grid = floodedPool(30, MaterialId.vine)

    react(grid, 12000)

    // Growth from a single seed can wander anywhere, but it can never close up: a filled 3x3 means the
    // middle cell took eight vine neighbours, which the crowding rule exists to refuse.
    const isVine = (x: number, y: number) =>
      grid.material[cellIndex(grid, x, y)] === MaterialId.vine
    let solidBlocks = 0
    for (let x = 1; x < 29; x++) {
      for (let y = 1; y < 29; y++) {
        let filled = 0
        for (let dx = -1; dx <= 1; dx++) {
          for (let dy = -1; dy <= 1; dy++) if (isVine(x + dx, y + dy)) filled++
        }
        if (filled === 9) solidBlocks++
      }
    }

    expect(solidBlocks).toBe(0)
  })

  it('needs water and will not creep through air', () => {
    const grid = createGrid(9, 9)
    put(grid, 4, 4, MaterialId.vine)

    react(grid, 2000)

    expect(count(grid, MaterialId.vine)).toBe(1)
  })

  it('carries on once fresh water arrives', () => {
    const grid = createGrid(20, 12)
    put(grid, 10, 6, MaterialId.vine)
    react(grid, 500)
    expect(count(grid, MaterialId.vine)).toBe(1)

    for (let x = 8; x < 13; x++) {
      for (let y = 3; y < 6; y++) put(grid, x, y, MaterialId.water)
    }
    react(grid, 2000)

    expect(count(grid, MaterialId.vine)).toBeGreaterThan(1)
  })
})

describe('plants', () => {
  it('grows into adjacent water', () => {
    const grid = createGrid(7, 7)
    put(grid, 3, 4, MaterialId.plant)
    for (let y = 0; y < 4; y++) put(grid, 3, y, MaterialId.water)

    react(grid, 500)

    expect(count(grid, MaterialId.plant)).toBeGreaterThan(1)
  })

  it('usually takes a drop that is only touching for a single tick', () => {
    // One tick of contact is one roll of the growth chance, so this is a claim about the rate: across
    // independent attempts a decent share have to land. At the old 0.09 chance fewer than two of
    // twenty would, which is why the gap under a plant felt like a wall no matter how long you poured.
    const attempts = 20
    let caught = 0

    for (let seed = 1; seed <= attempts; seed++) {
      const grid = createGrid(9, 12)
      put(grid, 4, 4, MaterialId.plant)
      const drop = cellIndex(grid, 4, 5)
      placeMaterial(grid, drop, MaterialId.water)

      applyReactions(grid, createRng(seed))
      if (grid.material[drop] === MaterialId.plant) caught++
    }

    expect(caught).toBeGreaterThan(attempts / 3)
  })

  it('spreads a visible vine through a pool, not a couple of cells', () => {
    const uses = MATERIALS[MaterialId.plant].uses ?? 0
    const grid = createGrid(30, 30)
    for (let x = 0; x < 30; x++) {
      for (let y = 0; y < 29; y++) put(grid, x, y, MaterialId.water)
    }
    put(grid, 15, 29, MaterialId.plant)

    react(grid, 3000)

    // One seedling should spend most of its budget rather than stalling after a few steps.
    expect(count(grid, MaterialId.plant)).toBeGreaterThan(uses / 2)
  })

  it('spends a bounded budget, so a seedling cannot eat an ocean', () => {
    const uses = MATERIALS[MaterialId.plant].uses ?? 0
    const grid = createGrid(30, 30)
    for (let x = 0; x < 30; x++) {
      for (let y = 0; y < 29; y++) put(grid, x, y, MaterialId.water)
    }
    put(grid, 15, 29, MaterialId.plant)

    react(grid, 6000)

    expect(count(grid, MaterialId.plant)).toBeLessThanOrEqual(uses + 1)
  })

  it('grows downward when the water is below it', () => {
    const grid = createGrid(9, 12)
    put(grid, 4, 4, MaterialId.plant)
    for (let y = 5; y < 11; y++) put(grid, 4, y, MaterialId.water)

    react(grid, 400)

    expect(grid.material[cellIndex(grid, 4, 5)]).toBe(MaterialId.plant)
  })

  it('reaches into every direction rather than only up', () => {
    // Across seeds, because one vine's worth of budget is short enough that a single run can happen to
    // wander only upward. A strict up-first scan grew flat-bottomed blobs every time.
    const seeds = 6
    let grewDownward = 0
    let grewUpward = 0

    for (let seed = 1; seed <= seeds; seed++) {
      const grid = createGrid(21, 21)
      for (let x = 0; x < 21; x++) {
        for (let y = 0; y < 21; y++) put(grid, x, y, MaterialId.water)
      }
      put(grid, 10, 10, MaterialId.plant)

      react(grid, 4000, seed)

      const rows = new Set<number>()
      for (let x = 0; x < 21; x++) {
        for (let y = 0; y < 21; y++) {
          if (grid.material[cellIndex(grid, x, y)] === MaterialId.plant) rows.add(y)
        }
      }
      if (Math.max(...rows) > 10) grewDownward++
      if (Math.min(...rows) < 10) grewUpward++
    }

    expect(grewDownward).toBeGreaterThan(seeds / 2)
    expect(grewUpward).toBeGreaterThan(seeds / 2)
  })

  it('leaves a ragged edge rather than a smooth disc', () => {
    const grid = createGrid(31, 31)
    for (let x = 0; x < 31; x++) {
      for (let y = 0; y < 31; y++) put(grid, x, y, MaterialId.water)
    }
    put(grid, 15, 15, MaterialId.plant)

    react(grid, 6000)

    // Row widths differ across the growth: a fixed step cost with one tip grew the same length every
    // time and came out suspiciously round.
    const widths: number[] = []
    for (let y = 0; y < 31; y++) {
      let cells = 0
      for (let x = 0; x < 31; x++)
        if (grid.material[cellIndex(grid, x, y)] === MaterialId.plant) cells++
      if (cells > 0) widths.push(cells)
    }

    expect(widths.length).toBeGreaterThan(2)
    expect(new Set(widths).size).toBeGreaterThan(1)
  })

  it('ignores water it is not touching', () => {
    const grid = createGrid(7, 7)
    put(grid, 1, 1, MaterialId.plant)
    put(grid, 5, 5, MaterialId.water)

    react(grid, 500)

    expect(count(grid, MaterialId.plant)).toBe(1)
    expect(grid.material[cellIndex(grid, 5, 5)]).toBe(MaterialId.water)
  })
})
