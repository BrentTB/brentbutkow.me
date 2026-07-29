import { describe, it, expect } from 'vitest'
import { Grid, MaterialBehavior, MaterialId } from '../pixel-world.types'
import { stampCircle } from './brush'
import { cellIndex, createGrid, placeMaterial } from './grid'
import { MATERIALS } from './materials'
import { createRng } from './rng'
import { WILD_PRODUCTS, applyReactions } from './reactions'
import { step } from './step'
import { tickWorld } from './tick'
import { onCI } from '../test-env'

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

// Heavy deterministic soaks skip on CI and run locally.
const itSlow = it.skipIf(onCI)

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

  itSlow('keeps growing long past the point a plant runs out', () => {
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

describe('chlorine', () => {
  it('bleaches out plants and vines', () => {
    const grid = createGrid(9, 9)
    put(grid, 4, 4, MaterialId.chlorine)
    const plant = put(grid, 4, 5, MaterialId.plant)
    const vine = put(grid, 3, 4, MaterialId.vine)

    react(grid, 2000)

    expect(grid.material[plant]).toBe(MaterialId.ash)
    expect(grid.material[vine]).toBe(MaterialId.ash)
  })

  it('dissolves into water, leaving brine', () => {
    const grid = createGrid(9, 9)
    put(grid, 4, 4, MaterialId.chlorine)
    put(grid, 4, 5, MaterialId.water)

    react(grid, 2000)

    expect(count(grid, MaterialId.chlorine)).toBe(0)
    expect(count(grid, MaterialId.saltWater)).toBe(1)
  })

  it('kills a creature it touches, leaving the carcass that creature leaves', () => {
    const grid = createGrid(9, 9)
    put(grid, 4, 4, MaterialId.chlorine)
    const bug = put(grid, 4, 5, MaterialId.bug)

    // Long enough for the gas to land a roll, short enough that the carcass has not rotted away after.
    react(grid, 60)

    // Gas is how you clear a world of life without setting fire to it, and a bug dies into meat.
    expect(grid.material[bug]).toBe(MATERIALS[MaterialId.bug].life?.corpse)
  })

  it('leaves nothing behind of a creature whose corpse is nothing', () => {
    const grid = createGrid(9, 9)
    put(grid, 4, 4, MaterialId.chlorine)
    const algae = put(grid, 4, 5, MaterialId.algae)

    react(grid, 2000)

    // A weed is not a carcass: bleaching a bed of algae clears it rather than filling the tank with meat.
    expect(grid.material[algae]).toBe(MaterialId.empty)
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

describe('salt', () => {
  it('dissolves into brine', () => {
    const grid = createGrid(9, 9)
    put(grid, 4, 4, MaterialId.salt)
    put(grid, 4, 5, MaterialId.water)

    react(grid, 200)

    expect(count(grid, MaterialId.salt)).toBe(0)
    expect(count(grid, MaterialId.saltWater)).toBe(1)
  })

  it('kills what fresh water grows', () => {
    const grid = createGrid(9, 9)
    put(grid, 4, 4, MaterialId.saltWater)
    const plant = put(grid, 4, 5, MaterialId.plant)
    const vine = put(grid, 3, 4, MaterialId.vine)

    react(grid, 2000)

    expect(grid.material[plant]).toBe(MaterialId.ash)
    expect(grid.material[vine]).toBe(MaterialId.ash)
  })
})

describe('wet ground', () => {
  it('turns loose ground into mud', () => {
    const grid = createGrid(9, 9)
    const dirt = put(grid, 4, 4, MaterialId.dirt)
    put(grid, 4, 5, MaterialId.water)

    react(grid, 200)

    expect(grid.material[dirt]).toBe(MaterialId.mud)
  })

  it('sprouts a seed', () => {
    const grid = createGrid(9, 9)
    const seed = put(grid, 4, 4, MaterialId.seed)
    put(grid, 4, 5, MaterialId.mud)

    react(grid, 500)

    expect(grid.material[seed]).toBe(MaterialId.plant)
  })
})

describe('snow', () => {
  it('packs into ice under a deep enough drift', () => {
    const grid = createGrid(9, 20)
    for (let y = 6; y < 19; y++) put(grid, 4, y, MaterialId.snow)

    react(grid, 4000)

    expect(count(grid, MaterialId.ice)).toBeGreaterThan(0)
  })

  it('leaves a shallow dusting alone', () => {
    const grid = createGrid(9, 9)
    put(grid, 4, 7, MaterialId.snow)

    react(grid, 4000)

    expect(count(grid, MaterialId.ice)).toBe(0)
  })
})

describe('sponge', () => {
  it('soaks up touching water', () => {
    const grid = createGrid(9, 9)
    const sponge = put(grid, 4, 4, MaterialId.sponge)
    put(grid, 4, 5, MaterialId.water)
    put(grid, 3, 4, MaterialId.water)

    react(grid, 200)

    expect(count(grid, MaterialId.water)).toBe(0)
    expect(grid.data[sponge]).toBe(2)
  })

  it('gives the water back when heated, and then stays empty', () => {
    const grid = createGrid(9, 9)
    const sponge = put(grid, 4, 4, MaterialId.sponge)
    grid.data[sponge] = 3
    grid.temperature[sponge] = 200

    react(grid, 200)

    // A hot sponge that also drinks oscillates: empties, drinks a drop back, wrings it out again.
    expect(grid.data[sponge]).toBe(0)
    expect(count(grid, MaterialId.water)).toBe(3)
  })

  it('wicks water into the dry middle of a block', () => {
    const capacity = MATERIALS[MaterialId.sponge].absorbs ?? 0
    const grid = createGrid(20, 20)
    // A tank, so the water stays put instead of draining to the floor, with a solid 5x5 block in it.
    for (let x = 0; x < 20; x++) put(grid, x, 19, MaterialId.stone)
    for (let y = 0; y < 20; y++) {
      put(grid, 0, y, MaterialId.stone)
      put(grid, 19, y, MaterialId.stone)
    }
    for (let x = 1; x < 19; x++) {
      for (let y = 8; y < 19; y++) put(grid, x, y, MaterialId.water)
    }
    for (let x = 5; x < 10; x++) {
      for (let y = 10; y < 15; y++) put(grid, x, y, MaterialId.sponge)
    }

    const rng = createRng(5)
    for (let tick = 0; tick < 6000; tick++) tickWorld(grid, rng, tick)

    let held = 0
    let wetCells = 0
    for (let index = 0; index < grid.material.length; index++) {
      if (grid.material[index] !== MaterialId.sponge || grid.data[index] === 0) continue
      held += grid.data[index]
      wetCells++
    }

    // Without wicking, only the column touching the pool ever gets wet, so a thick block holds no more
    // than a thin one. The middle has to draw from the wet edge.
    expect(wetCells).toBeGreaterThan(5)
    expect(held).toBeGreaterThan(capacity * 5)
  })

  it('holds no more than its capacity', () => {
    const capacity = MATERIALS[MaterialId.sponge].absorbs ?? 0
    const grid = createGrid(11, 11)
    const sponge = put(grid, 5, 5, MaterialId.sponge)
    for (let x = 0; x < 11; x++) {
      for (let y = 0; y < 11; y++) {
        if (grid.material[cellIndex(grid, x, y)] === MaterialId.empty) {
          put(grid, x, y, MaterialId.water)
        }
      }
    }

    // The full tick, so fresh water keeps flowing in against the sponge as it drinks.
    const rng = createRng(5)
    for (let tick = 0; tick < 4000; tick++) tickWorld(grid, rng, tick)

    expect(grid.data[sponge]).toBe(capacity)
  })
})

describe('source', () => {
  it('remembers the first material fed to it and keeps producing it', () => {
    const grid = createGrid(12, 12)
    const tap = put(grid, 6, 3, MaterialId.source)
    put(grid, 6, 4, MaterialId.water)

    react(grid, 400)

    expect(grid.data[tap]).toBe(MaterialId.water)
    expect(count(grid, MaterialId.water)).toBeGreaterThan(3)
  })

  it('keeps producing once its own output has hemmed it in', () => {
    const grid = createGrid(30, 30)
    put(grid, 15, 15, MaterialId.source)
    // Ringed by the very thing it makes, which used to stall it: every neighbour was taken.
    for (const [x, y] of [
      [15, 14],
      [14, 15],
      [16, 15],
      [15, 16],
    ]) {
      put(grid, x, y, MaterialId.water)
    }
    const before = count(grid, MaterialId.water)

    react(grid, 400)

    expect(count(grid, MaterialId.water)).toBeGreaterThan(before)
  })

  it('teaches the whole block from one fed cell', () => {
    const grid = createGrid(30, 30)
    for (let x = 0; x < 5; x++) {
      for (let y = 0; y < 5; y++) put(grid, 10 + x, 10 + y, MaterialId.source)
    }
    // Fed at one corner only. The middle of the block touches nothing but more source.
    put(grid, 10, 9, MaterialId.water)

    react(grid, 200)

    expect(grid.data[cellIndex(grid, 12, 12)]).toBe(MaterialId.water)
  })

  it('scales output with the area of a block, not its perimeter', () => {
    const produced = (side: number) => {
      const grid = createGrid(80, 80)
      const left = 40 - (side >> 1)
      for (let x = 0; x < side; x++) {
        for (let y = 0; y < side; y++) put(grid, left + x, 40 + y, MaterialId.source)
      }
      put(grid, left, 39, MaterialId.water)

      const rng = createRng(5)
      for (let tick = 0; tick < 30; tick++) applyReactions(grid, rng)

      // Sweep the output away every tick, so space is never what limits the count.
      let total = 0
      for (let tick = 0; tick < 200; tick++) {
        applyReactions(grid, rng)
        for (let index = 0; index < grid.material.length; index++) {
          if (grid.material[index] !== MaterialId.water) continue
          grid.material[index] = MaterialId.empty
          total++
        }
      }
      return total
    }

    // Doubling the side should roughly quadruple the output. It used to peak at 2x2 and then fall away,
    // because only cells that could learn what to make — the outline — ever produced anything.
    expect(produced(4)).toBeGreaterThan(produced(2) * 3)
    expect(produced(8)).toBeGreaterThan(produced(4) * 3)
  })

  it('will not shove its output through a wall', () => {
    const grid = createGrid(20, 20)
    const tap = put(grid, 10, 10, MaterialId.source)
    put(grid, 10, 9, MaterialId.water)
    react(grid, 1)
    expect(grid.data[tap]).toBe(MaterialId.water)

    // Boxed in by stone on every side, with the water it was fed cleared away.
    for (const [x, y] of [
      [10, 9],
      [9, 10],
      [11, 10],
      [10, 11],
    ]) {
      put(grid, x, y, MaterialId.stone)
    }
    react(grid, 400)

    expect(count(grid, MaterialId.water)).toBe(0)
  })

  it('produces nothing until something is fed to it', () => {
    const grid = createGrid(12, 12)
    const tap = put(grid, 6, 3, MaterialId.source)

    react(grid, 600)

    expect(grid.data[tap]).toBe(MaterialId.empty)
    expect(count(grid, MaterialId.source)).toBe(1)
  })

  it('keeps producing what it was fed even after that material is gone', () => {
    const grid = createGrid(12, 12)
    const tap = put(grid, 6, 3, MaterialId.source)
    put(grid, 6, 4, MaterialId.lava)
    react(grid, 1)
    expect(grid.data[tap]).toBe(MaterialId.lava)

    for (let index = 0; index < grid.material.length; index++) {
      if (grid.material[index] !== MaterialId.source) placeMaterial(grid, index, MaterialId.empty)
    }
    react(grid, 200)

    expect(count(grid, MaterialId.lava)).toBeGreaterThan(0)
  })
})

describe('void', () => {
  it('eats whatever touches it', () => {
    const grid = createGrid(9, 9)
    put(grid, 4, 4, MaterialId.void)
    put(grid, 4, 5, MaterialId.stone)
    put(grid, 3, 4, MaterialId.water)

    react(grid, 200)

    expect(count(grid, MaterialId.stone)).toBe(0)
    expect(count(grid, MaterialId.water)).toBe(0)
    expect(count(grid, MaterialId.void)).toBe(1)
  })

  it('will not eat another void', () => {
    const grid = createGrid(9, 9)
    put(grid, 4, 4, MaterialId.void)
    put(grid, 4, 5, MaterialId.void)

    react(grid, 500)

    expect(count(grid, MaterialId.void)).toBe(2)
  })
})

describe('nitrogen', () => {
  it('freezes the water it touches and boils away doing it', () => {
    const grid = createGrid(5, 5)
    const coolant = put(grid, 2, 2, MaterialId.nitrogen)
    const drop = put(grid, 2, 3, MaterialId.water)

    react(grid, 40)

    expect(grid.material[drop]).toBe(MaterialId.ice)
    expect(grid.material[coolant]).toBe(MaterialId.empty)
  })

  it('gives the new ice its own temperature, not the water it came from', () => {
    const grid = createGrid(5, 5)
    put(grid, 2, 2, MaterialId.nitrogen)
    const drop = put(grid, 2, 3, MaterialId.water)

    react(grid, 40)

    // Inheriting the water's warmth would put the ice straight back over its own melting point.
    expect(grid.temperature[drop]).toBe(MATERIALS[MaterialId.ice].startTemperature)
  })

  it('freezes brine as well as fresh water', () => {
    const grid = createGrid(5, 5)
    put(grid, 2, 2, MaterialId.nitrogen)
    const brine = put(grid, 2, 3, MaterialId.saltWater)

    react(grid, 80)

    expect(grid.material[brine]).toBe(MaterialId.ice)
  })

  it('boils off its surface, so a buried cell outlasts a lone drop', () => {
    const ticksToVanish = (build: (grid: Grid) => number) => {
      const grid = createGrid(9, 9)
      const watched = build(grid)
      const rng = createRng(11)

      for (let tick = 1; tick <= 4000; tick++) {
        applyReactions(grid, rng)
        if (grid.material[watched] === MaterialId.empty) return tick
      }
      return Infinity
    }

    const lone = ticksToVanish((grid) => put(grid, 4, 4, MaterialId.nitrogen))
    const buried = ticksToVanish((grid) => {
      for (let y = 2; y <= 6; y++) {
        for (let x = 2; x <= 6; x++) put(grid, x, y, MaterialId.nitrogen)
      }
      return cellIndex(grid, 4, 4)
    })

    expect(lone).toBeLessThan(Infinity)
    // Exposure scales the chance, so the middle of a puddle keeps itself cold until the surface has
    // worked its way down to it.
    expect(buried).toBeGreaterThan(lone)
  })
})

describe('spark', () => {
  it('travels one cell a tick whichever way it goes', () => {
    // A spark writes itself into a neighbour, so the scan can meet it again further along and carry it
    // a second time — a hop with the scan direction covered two cells in one tick. Enough seeds to
    // catch it: the double hop needs the spark to go with the scan and then win a second roll.
    for (let seed = 1; seed <= 200; seed++) {
      const grid = createGrid(20, 5)
      for (let x = 0; x < 20; x++) put(grid, x, 2, MaterialId.metal)
      put(grid, 9, 2, MaterialId.spark)

      react(grid, 1, seed)

      const at = grid.material.indexOf(MaterialId.spark)
      const steps = Math.abs((at % grid.width) - 9) + Math.abs(Math.floor(at / grid.width) - 2)
      expect(steps).toBeLessThanOrEqual(1)
    }
  })

  it('runs along a wire without eating it', () => {
    const grid = createGrid(20, 5)
    for (let x = 1; x < 19; x++) put(grid, x, 2, MaterialId.metal)
    const wireBefore = count(grid, MaterialId.metal)
    const start = put(grid, 1, 2, MaterialId.spark)

    react(grid, 12)

    // The spark swaps along the wire rather than converting it, so the wire survives whole apart from
    // the one cell the spark is standing in. Where it has wandered to is up to the rng.
    expect(count(grid, MaterialId.spark)).toBe(1)
    expect(count(grid, MaterialId.metal)).toBe(wireBefore - 1)
    expect(
      grid.material[start] === MaterialId.metal || grid.material[start] === MaterialId.spark
    ).toBe(true)
  })

  it('runs through water as readily as metal', () => {
    const grid = createGrid(11, 5)
    for (let x = 1; x < 10; x++) put(grid, x, 2, MaterialId.water)
    put(grid, 1, 2, MaterialId.spark)

    // Watched tick by tick, because the spark wanders and may be back where it started by the end.
    const rng = createRng(7)
    let travelled = false
    for (let tick = 0; tick < 20; tick++) {
      applyReactions(grid, rng)
      if (grid.material[cellIndex(grid, 1, 2)] !== MaterialId.spark) travelled = true
    }

    // A live wire in a puddle is the accident the spec asks for; water conducts.
    expect(travelled).toBe(true)
    expect(count(grid, MaterialId.spark)).toBe(1)
  })

  it('will not cross something that does not conduct', () => {
    const grid = createGrid(11, 5)
    put(grid, 2, 2, MaterialId.spark)
    put(grid, 3, 2, MaterialId.rubber)
    put(grid, 4, 2, MaterialId.metal)

    react(grid, 40)

    expect(grid.material[cellIndex(grid, 4, 2)]).toBe(MaterialId.metal)
  })

  it('leaves the wire hot behind it, hot enough to light what the wire touches', () => {
    const grid = createGrid(24, 6)
    for (let x = 1; x < 23; x++) put(grid, x, 2, MaterialId.metal)
    for (let x = 1; x < 23; x++) put(grid, x, 3, MaterialId.wood)
    put(grid, 2, 2, MaterialId.spark)

    // The full tick, because it is the heat pass that carries the wire's warmth into the plank.
    const rng = createRng(9)
    for (let tick = 0; tick < 400; tick++) tickWorld(grid, rng, tick)

    // Resistive heating: without it a spark only warmed whatever it happened to be beside, so running
    // one down a bar never lit anything.
    const lit = grid.burn.some((ticks) => ticks > 0)
    expect(lit || count(grid, MaterialId.ash) > 0).toBe(true)
  })

  it('sets off a pocket of methane', () => {
    const grid = createGrid(9, 9)
    put(grid, 4, 4, MaterialId.spark)
    const gas = put(grid, 4, 5, MaterialId.methane)

    react(grid, 2)

    expect(grid.material[gas]).toBe(MaterialId.fire)
  })
})

describe('plants on land', () => {
  it('shoot into wet soil, not only into water', () => {
    const grid = createGrid(15, 15)
    for (let x = 0; x < 15; x++) {
      for (let y = 10; y < 15; y++) placeMaterial(grid, cellIndex(grid, x, y), MaterialId.mud)
    }
    placeMaterial(grid, cellIndex(grid, 7, 9), MaterialId.plant)

    const rng = createRng(3)
    for (let tick = 0; tick < 200; tick++) applyReactions(grid, rng)

    // Growing only into water meant every plant lived in a pond and dry land had no vegetation at all, so
    // anything that grazes starved on the bank.
    let plants = 0
    for (const cell of grid.material) if (cell === MaterialId.plant) plants++
    expect(plants).toBeGreaterThan(1)
  })
})

describe('the devices', () => {
  /** A world with a floor, and whatever the case needs put into it. */
  function world(build: (grid: Grid) => void): Grid {
    const grid = createGrid(81, 81)
    for (let x = 0; x < grid.width; x++) {
      placeMaterial(grid, cellIndex(grid, x, grid.height - 1), MaterialId.stone)
    }
    build(grid)
    return grid
  }

  describe('a black hole', () => {
    it('pulls loose things inward', () => {
      const grid = world((g) => {
        placeMaterial(g, cellIndex(g, 40, 40), MaterialId.blackHole)
        placeMaterial(g, cellIndex(g, 52, 40), MaterialId.sand)
      })

      applyReactions(grid, createRng(1))

      expect(grid.velocity.get(cellIndex(grid, 52, 40))?.vx ?? 0).toBeLessThan(0)
    })

    it('eats what reaches it, so things stop orbiting forever', () => {
      // A puller that only pulls leaves everything in orbit: the kinetic map never empties and nothing ever
      // settles, which is the shape of the performance problem the explosion work went in to fix.
      const grid = world((g) => {
        placeMaterial(g, cellIndex(g, 40, 40), MaterialId.blackHole)
        for (const at of [
          cellIndex(g, 39, 40),
          cellIndex(g, 41, 40),
          cellIndex(g, 40, 39),
          cellIndex(g, 40, 41),
        ]) {
          placeMaterial(g, at, MaterialId.sand)
        }
      })

      const rng = createRng(1)
      for (let tick = 0; tick < 60; tick++) applyReactions(grid, rng)

      for (const at of [
        cellIndex(grid, 39, 40),
        cellIndex(grid, 41, 40),
        cellIndex(grid, 40, 39),
        cellIndex(grid, 40, 41),
      ]) {
        expect(grid.material[at]).toBe(MaterialId.empty)
      }
    })
  })

  describe('a turbine', () => {
    it('writes a rotation into the air rather than blowing it outward', () => {
      const grid = world((g) => placeMaterial(g, cellIndex(g, 40, 40), MaterialId.turbine))

      applyReactions(grid, createRng(1))

      // Directly above the turbine the flow runs sideways, not up: that is what makes a circle.
      const above = cellIndex(grid, 40, 34)
      expect(Math.abs(grid.airX[above])).toBeGreaterThan(Math.abs(grid.airY[above]))
      // And on the far side it runs the other way.
      const below = cellIndex(grid, 40, 46)
      expect(Math.sign(grid.airX[above])).not.toBe(Math.sign(grid.airX[below]))
    })
  })

  describe('what a turbine can stir', () => {
    /** Mean distance of `material` from the middle, with a turbine there and without. */
    function spread(material: MaterialId, withTurbine: boolean, ticks: number): number {
      const grid = createGrid(121, 121)
      for (let x = 0; x < grid.width; x++) {
        placeMaterial(grid, cellIndex(grid, x, grid.height - 1), MaterialId.stone)
      }
      if (withTurbine) placeMaterial(grid, cellIndex(grid, 60, 60), MaterialId.turbine)
      for (let y = 50; y < 71; y += 2) {
        for (let x = 45; x < 76; x += 2) {
          if (x === 60 && y === 60) continue
          placeMaterial(grid, cellIndex(grid, x, y), material)
        }
      }

      const rng = createRng(1)
      for (let tick = 0; tick < ticks; tick++) tickWorld(grid, rng, tick)

      // Where it ended up, not whether it left: water spreads and fish swim on their own, so the honest signal
      // is how much further from the middle the whole lot sits.
      let total = 0
      let n = 0
      for (let i = 0; i < grid.material.length; i++) {
        if (grid.material[i] !== material) continue
        total += Math.hypot((i % grid.width) - 60, Math.floor(i / grid.width) - 60)
        n++
      }
      return n === 0 ? 0 : total / n
    }

    it('reaches liquids, gases and creatures, not only loose powder', () => {
      // The complaint this guards: a turbine had no effect at all on any of the three. Liquids and creatures
      // were excluded from what the flow may carry, and a rising gas leaned only when it was already blocked,
      // which for a plume is almost never. Measured, water and fish did not move a single cell.
      //
      // A gas is measured inside its own lifetime, or there is nothing left to look at.
      for (const [material, ticks] of [
        [MaterialId.sand, 200],
        [MaterialId.water, 200],
        [MaterialId.fish, 200],
        [MaterialId.smoke, 40],
      ] as const) {
        expect(spread(material, true, ticks)).toBeGreaterThan(spread(material, false, ticks))
      }
    })
  })

  describe('a wild source', () => {
    it('pours out more than one kind of thing', () => {
      const grid = world((g) => placeMaterial(g, cellIndex(g, 40, 20), MaterialId.randomSource))

      const rng = createRng(3)
      const seen = new Set<number>()
      for (let tick = 0; tick < 600; tick++) {
        applyReactions(grid, rng)
        step(grid, rng, tick)
      }
      for (let i = 0; i < grid.material.length; i++) {
        const id = grid.material[i]
        if (id !== MaterialId.empty && id !== MaterialId.stone && id !== MaterialId.randomSource) {
          seen.add(id)
        }
      }

      expect(seen.size).toBeGreaterThan(2)
    })

    it('never has a solid on its list of products, which would wall it in', () => {
      // The lesson the volcano's vent taught: a source with no open cell in reach simply goes quiet. Asserted
      // against the list rather than against the world, because a poured liquid is free to become a solid
      // afterwards — lava cools to stone, and that is the sim working rather than the source misbehaving.
      for (const product of WILD_PRODUCTS) {
        const { behavior, life } = MATERIALS[product]
        expect(behavior).not.toBe(MaterialBehavior.static)
        // Nothing alive either: a source of creatures is a population explosion rather than a surprise.
        expect(life).toBeUndefined()
      }
    })
  })
})

describe('pollen landing', () => {
  it('sprouts into a seed on wet ground', () => {
    // Being light is a property, not a purpose. This is what makes carrying it somewhere worth doing.
    const grid = createGrid(41, 41)
    const ground = cellIndex(grid, 20, 30)
    placeMaterial(grid, ground, MaterialId.mud)
    placeMaterial(grid, cellIndex(grid, 20, 29), MaterialId.pollen)

    const rng = createRng(2)
    for (let tick = 0; tick < 200; tick++) applyReactions(grid, rng)

    expect(grid.material[ground]).toBe(MaterialId.seed)
  })

  it('does nothing on dry ground, so where a draught drops it matters', () => {
    const grid = createGrid(41, 41)
    const ground = cellIndex(grid, 20, 30)
    placeMaterial(grid, ground, MaterialId.sand)
    placeMaterial(grid, cellIndex(grid, 20, 29), MaterialId.pollen)

    const rng = createRng(2)
    for (let tick = 0; tick < 200; tick++) applyReactions(grid, rng)

    expect(grid.material[ground]).toBe(MaterialId.sand)
  })
})

describe('corruption', () => {
  /** A slab of stone with one cell of corruption in the middle of it. */
  function infected(width = 61, height = 61): Grid {
    const grid = createGrid(width, height)
    for (let y = 10; y < height - 10; y++) {
      for (let x = 10; x < width - 10; x++)
        placeMaterial(grid, cellIndex(grid, x, y), MaterialId.stone)
    }
    placeMaterial(grid, cellIndex(grid, 30, 30), MaterialId.corruption)
    return grid
  }

  function count(grid: Grid, material: MaterialId): number {
    let n = 0
    for (const id of grid.material) if (id === material) n++
    return n
  }

  it('eats a world if nobody stops it', () => {
    const grid = infected()
    const rng = createRng(1)
    for (let tick = 0; tick < 3000; tick++) applyReactions(grid, rng)

    expect(count(grid, MaterialId.corruption)).toBeGreaterThan(50)
  })

  it('creeps unevenly rather than as a growing disc', () => {
    // A smooth expanding circle is the shape every version of this rule produces first, and it always reads as
    // a bug. The crowding rule is what keeps the edge ragged.
    const grid = infected()
    const rng = createRng(1)
    for (let tick = 0; tick < 3000; tick++) applyReactions(grid, rng)

    // A solid disc would fill nearly every cell inside its own radius. A creeping tangle leaves holes.
    let reach = 0
    let taken = 0
    for (let i = 0; i < grid.material.length; i++) {
      if (grid.material[i] !== MaterialId.corruption) continue
      taken++
      reach = Math.max(reach, Math.hypot((i % grid.width) - 30, Math.floor(i / grid.width) - 30))
    }
    const disc = Math.PI * reach * reach
    expect(taken).toBeLessThan(disc * 0.6)
  })

  it('cannot cross fire, so a firebreak actually holds', () => {
    // The weakness has to be usable, not theoretical. A wall it could not cross would make it a non-threat;
    // nothing stopping it would make it a timer.
    const grid = createGrid(61, 61)
    for (let y = 20; y < 41; y++) {
      for (let x = 20; x < 41; x++) placeMaterial(grid, cellIndex(grid, x, y), MaterialId.stone)
    }
    // A ring of flame around one cell of it.
    placeMaterial(grid, cellIndex(grid, 30, 30), MaterialId.corruption)
    for (const [dx, dy] of [
      [-1, -1],
      [0, -1],
      [1, -1],
      [-1, 0],
      [1, 0],
      [-1, 1],
      [0, 1],
      [1, 1],
    ]) {
      placeMaterial(grid, cellIndex(grid, 30 + dx, 30 + dy), MaterialId.fire)
    }

    const rng = createRng(1)
    for (let tick = 0; tick < 400; tick++) applyReactions(grid, rng)

    expect(count(grid, MaterialId.corruption)).toBe(1)
  })

  it('burns back to ash rather than to whatever it ate', () => {
    // Remembering what a cell used to be needs a byte per cell, and `data` has none spare.
    expect(MATERIALS[MaterialId.corruption].ignite?.into).toBe(MaterialId.ash)
  })

  it('turns a creature it touches into slime rather than into more of itself', () => {
    // A creature becoming wall reads as the wall eating it. A creature becoming a slime that then crawls off
    // on its own reads as the creature being turned, which is the more alarming of the two.
    const grid = createGrid(61, 61)
    for (let y = 20; y < 41; y++) {
      for (let x = 20; x < 41; x++) placeMaterial(grid, cellIndex(grid, x, y), MaterialId.water)
    }
    for (const [at, creature] of [
      [28, MaterialId.fish],
      [30, MaterialId.bug],
      [32, MaterialId.worm],
      [34, MaterialId.bird],
    ] as const) {
      placeMaterial(grid, cellIndex(grid, at, 30), creature)
      placeMaterial(grid, cellIndex(grid, at, 31), MaterialId.corruption)
    }

    const rng = createRng(4)
    for (let tick = 0; tick < 600; tick++) applyReactions(grid, rng)

    expect(count(grid, MaterialId.slime)).toBeGreaterThan(0)
    for (const creature of [MaterialId.fish, MaterialId.bug, MaterialId.worm, MaterialId.bird]) {
      expect(count(grid, creature)).toBe(0)
    }
    // The swatch says so, and the swatch is the only place a visitor is told. Tied together here so that
    // editing one side without the other fails rather than shipping a promise the rule stopped keeping.
    expect(MATERIALS[MaterialId.corruption].blurb).toContain('slime')
  })

  it('leaves the slime it made alone, and goes around it', () => {
    // Slime is what corruption makes of a creature, so it does not then turn on its own. Costing it nothing is
    // what makes that affordable: the spread travels the ground and the water either way, so a slime it skips
    // is one cell it goes around rather than a hole in its advance.
    const grid = createGrid(41, 41)
    for (let y = 10; y < 31; y++) {
      for (let x = 10; x < 31; x++) placeMaterial(grid, cellIndex(grid, x, y), MaterialId.stone)
    }
    // A slime wall straight across the slab, with the corruption starting on one side of it.
    for (let y = 10; y < 31; y++) placeMaterial(grid, cellIndex(grid, 20, y), MaterialId.slime)
    const slimes = count(grid, MaterialId.slime)
    placeMaterial(grid, cellIndex(grid, 14, 20), MaterialId.corruption)

    const rng = createRng(4)
    for (let tick = 0; tick < 3000; tick++) applyReactions(grid, rng)

    // Every slime still standing, and the stone around it taken.
    expect(count(grid, MaterialId.slime)).toBe(slimes)
    expect(count(grid, MaterialId.corruption)).toBeGreaterThan(20)
  })
})
