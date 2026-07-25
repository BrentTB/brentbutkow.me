import { describe, it, expect } from 'vitest'
import { Grid, MaterialId } from '../pixel-world.types'
import { cellIndex, createGrid, placeMaterial } from './grid'
import { MATERIALS } from './materials'
import { simulateLife } from './life'
import { createRng } from './rng'

/** A tank of water with a stone floor, which is where most of the food chain lives. */
function tank(width = 21, height = 21): Grid {
  const grid = createGrid(width, height)
  for (let y = 2; y < height - 1; y++) {
    for (let x = 1; x < width - 1; x++) placeMaterial(grid, cellIndex(grid, x, y), MaterialId.water)
  }
  for (let x = 0; x < width; x++)
    placeMaterial(grid, cellIndex(grid, x, height - 1), MaterialId.stone)
  return grid
}

function put(grid: Grid, x: number, y: number, material: MaterialId): number {
  const index = cellIndex(grid, x, y)
  placeMaterial(grid, index, material)
  return index
}

function count(grid: Grid, material: MaterialId): number {
  let total = 0
  for (const cell of grid.material) if (cell === material) total++
  return total
}

function run(grid: Grid, ticks: number, seed = 4): void {
  const rng = createRng(seed)
  for (let tick = 0; tick < ticks; tick++) simulateLife(grid, rng)
}

describe('algae', () => {
  it('spreads through the water it is in', () => {
    const grid = tank()
    put(grid, 10, 10, MaterialId.algae)

    run(grid, 600)

    // It eats nothing: the energy comes from light, which is what makes it the bottom of the chain.
    expect(count(grid, MaterialId.algae)).toBeGreaterThan(1)
  })

  it('will not spread into dry air', () => {
    const grid = createGrid(21, 21)
    for (let x = 0; x < 21; x++) placeMaterial(grid, cellIndex(grid, x, 20), MaterialId.stone)
    put(grid, 10, 19, MaterialId.algae)

    run(grid, 300)

    expect(count(grid, MaterialId.algae)).toBeLessThanOrEqual(1)
  })
})

describe('a fish', () => {
  it('grazes algae down without ever finishing it off', () => {
    const grid = tank()
    put(grid, 10, 10, MaterialId.fish)
    const bed = put(grid, 10, 11, MaterialId.algae)
    const before = grid.data[bed]

    // Eating is a bite on a rate, not a swallow every tick: living food loses energy and keeps a reserve,
    // which is what stops a grazer stripping a tank faster than it can grow back.
    run(grid, 400)

    expect(count(grid, MaterialId.algae)).toBe(1)
    expect(grid.data[cellIndex(grid, 10, 11)]).toBeLessThan(before)
  })

  it('eats a whole cell of something that is not alive', () => {
    const grid = createGrid(21, 21)
    for (let x = 0; x < 21; x++) placeMaterial(grid, cellIndex(grid, x, 18), MaterialId.stone)
    put(grid, 10, 17, MaterialId.bug)
    put(grid, 11, 17, MaterialId.meat)

    run(grid, 400)

    // A carcass has no reserve to keep: it goes entirely, leaving the eater's own medium behind.
    expect(count(grid, MaterialId.meat)).toBe(0)
    expect(grid.material[cellIndex(grid, 11, 17)]).toBe(MaterialId.empty)
  })

  it('is better off for having eaten than a fish with nothing to eat', () => {
    /** Total energy held by fish, whichever cells they have swum to. */
    const fishEnergy = (grid: Grid) => {
      let total = 0
      for (let i = 0; i < grid.material.length; i++) {
        if (grid.material[i] === MaterialId.fish) total += grid.data[i]
      }
      return total
    }

    const fed = tank()
    put(fed, 10, 10, MaterialId.fish)
    for (let x = 4; x < 17; x += 2) put(fed, x, 18, MaterialId.algae)

    const hungry = tank()
    put(hungry, 10, 10, MaterialId.fish)

    run(fed, 400)
    run(hungry, 400)

    expect(fishEnergy(fed)).toBeGreaterThan(fishEnergy(hungry))
  })

  it('swims about inside the water', () => {
    const grid = tank()
    put(grid, 10, 10, MaterialId.fish)

    run(grid, 60)

    expect(grid.material[cellIndex(grid, 10, 10)]).not.toBe(MaterialId.fish)
    expect(count(grid, MaterialId.fish)).toBe(1)
  })

  it('never leaves the water on its own', () => {
    const grid = tank()
    put(grid, 10, 10, MaterialId.fish)

    run(grid, 200)

    for (let x = 0; x < grid.width; x++) {
      for (let y = 0; y < 2; y++) {
        expect(grid.material[cellIndex(grid, x, y)]).not.toBe(MaterialId.fish)
      }
    }
  })

  it('drowns in the air and leaves meat behind', () => {
    const grid = createGrid(21, 21)
    for (let x = 0; x < 21; x++) placeMaterial(grid, cellIndex(grid, x, 20), MaterialId.stone)
    put(grid, 10, 19, MaterialId.fish)

    run(grid, 200)

    expect(count(grid, MaterialId.fish)).toBe(0)
    expect(count(grid, MaterialId.meat)).toBe(1)
  })

  it('breeds while there is food to keep it fed', () => {
    const grid = tank(31, 31)
    put(grid, 15, 15, MaterialId.fish)
    for (let x = 3; x < 28; x += 2) put(grid, x, 28, MaterialId.algae)

    // Splitting is rate-limited as well as energy-limited, so it happens while a fish is grazing well
    // rather than the instant it fills up. Without the rate a stocked tank went from four fish to a
    // hundred before the pasture could answer, and then everything starved.
    run(grid, 3000)

    expect(count(grid, MaterialId.fish)).toBeGreaterThan(1)
  })

  it('does not breed on an empty stomach', () => {
    const grid = tank(31, 31)
    put(grid, 15, 15, MaterialId.fish)

    run(grid, 1500)

    expect(count(grid, MaterialId.fish)).toBeLessThanOrEqual(1)
  })

  it('splits its energy with what it spawns rather than doubling it', () => {
    const grid = tank(31, 31)
    const parent = put(grid, 15, 15, MaterialId.fish)
    const full = MATERIALS[MaterialId.fish].life?.breedAt ?? 255
    grid.data[parent] = full

    run(grid, 1)

    let total = 0
    for (let i = 0; i < grid.material.length; i++) {
      if (grid.material[i] === MaterialId.fish) total += grid.data[i]
    }
    // Free energy on every birth is how a tank turns solid with fish in ten seconds.
    expect(total).toBeLessThanOrEqual(full)
  })
})

describe('dead algae', () => {
  it('leaves nothing behind, because a weed is not a carcass', () => {
    const grid = createGrid(21, 21)
    for (let x = 0; x < 21; x++) placeMaterial(grid, cellIndex(grid, x, 20), MaterialId.stone)
    put(grid, 10, 19, MaterialId.algae)

    run(grid, 300)

    expect(count(grid, MaterialId.algae)).toBe(0)
    expect(count(grid, MaterialId.meat)).toBe(0)
  })
})

describe('a bug', () => {
  it('walks on the ground rather than falling through it or floating off', () => {
    const grid = createGrid(21, 21)
    for (let x = 0; x < 21; x++) placeMaterial(grid, cellIndex(grid, x, 18), MaterialId.stone)
    put(grid, 10, 17, MaterialId.bug)

    run(grid, 80)

    let row = -1
    for (let y = 0; y < grid.height; y++) {
      for (let x = 0; x < grid.width; x++) {
        if (grid.material[cellIndex(grid, x, y)] === MaterialId.bug) row = y
      }
    }
    expect(row).toBe(17)
  })

  it('eats a plant it walks into', () => {
    const grid = createGrid(21, 21)
    for (let x = 0; x < 21; x++) placeMaterial(grid, cellIndex(grid, x, 18), MaterialId.stone)
    put(grid, 10, 17, MaterialId.bug)
    put(grid, 11, 17, MaterialId.plant)

    run(grid, 300)

    expect(count(grid, MaterialId.plant)).toBe(0)
  })
})

describe('a worm', () => {
  it('burrows through dirt and eats it as it goes', () => {
    const grid = createGrid(21, 21)
    for (let y = 10; y < 21; y++) {
      for (let x = 0; x < 21; x++) placeMaterial(grid, cellIndex(grid, x, y), MaterialId.dirt)
    }
    const dirtBefore = count(grid, MaterialId.dirt)
    put(grid, 10, 15, MaterialId.worm)

    run(grid, 60)

    expect(count(grid, MaterialId.dirt)).toBeLessThan(dirtBefore)
    expect(count(grid, MaterialId.worm)).toBeGreaterThanOrEqual(1)
  })
})

describe('a bird', () => {
  it('closes on a bug it can see rather than drifting', () => {
    const grid = createGrid(31, 31)
    for (let x = 0; x < 31; x++) placeMaterial(grid, cellIndex(grid, x, 30), MaterialId.stone)
    put(grid, 5, 8, MaterialId.bird)
    const prey = { x: 13, y: 29 }
    put(grid, prey.x, prey.y, MaterialId.bug)

    const distance = () => {
      for (let y = 0; y < grid.height; y++) {
        for (let x = 0; x < grid.width; x++) {
          if (grid.material[cellIndex(grid, x, y)] !== MaterialId.bird) continue
          return Math.abs(x - prey.x) + Math.abs(y - prey.y)
        }
      }
      return -1
    }

    const before = distance()
    run(grid, 60)

    // Its sight is what makes it read as hunting; without the bias it wanders and starves.
    const after = distance()
    expect(after === -1 || after < before).toBe(true)
  })

  it('takes worms out of the topsoil', () => {
    const grid = createGrid(31, 21)
    // One row of soil, so the worms cannot burrow below the reach of something in the air. Deeper soil is
    // a worm's shelter, which is a fair outcome and not what this is testing.
    for (let x = 0; x < 31; x++) placeMaterial(grid, cellIndex(grid, x, 20), MaterialId.dirt)
    for (let x = 6; x < 26; x += 3) put(grid, x, 20, MaterialId.worm)
    const before = count(grid, MaterialId.worm)
    put(grid, 15, 19, MaterialId.bird)

    run(grid, 600)

    // A bird that ignores worms starves next to its dinner, which is exactly what was happening.
    expect(count(grid, MaterialId.worm)).toBeLessThan(before)
  })

  it('starves when there is nothing to hunt', () => {
    const grid = createGrid(31, 31)
    for (let x = 0; x < 31; x++) placeMaterial(grid, cellIndex(grid, x, 30), MaterialId.stone)
    put(grid, 15, 10, MaterialId.bird)

    // Flying is expensive. On its old metabolism a bird could hang over an empty world indefinitely.
    run(grid, 1500)

    expect(count(grid, MaterialId.bird)).toBe(0)
  })
})

describe('anything out of its element', () => {
  it('falls instead of hanging in the air', () => {
    const grid = createGrid(21, 21)
    for (let x = 0; x < 21; x++) placeMaterial(grid, cellIndex(grid, x, 20), MaterialId.stone)
    put(grid, 10, 4, MaterialId.fish)

    // Short: out of water it is on a three-a-tick clock, and a dead fish is meat rather than a fish.
    run(grid, 20)

    // A stranded creature standing perfectly still read as a solid block rather than something in trouble.
    let row = -1
    for (let y = 0; y < grid.height; y++) {
      for (let x = 0; x < grid.width; x++) {
        if (grid.material[cellIndex(grid, x, y)] === MaterialId.fish) row = y
      }
    }
    expect(row).toBeGreaterThan(4)
  })

  it('thrashes about while it is dying', () => {
    const grid = createGrid(21, 21)
    for (let x = 0; x < 21; x++) placeMaterial(grid, cellIndex(grid, x, 18), MaterialId.stone)
    put(grid, 10, 17, MaterialId.fish)

    run(grid, 40)

    // Sideways, on the floor it landed on: a fish out of water flops.
    expect(grid.material[cellIndex(grid, 10, 17)]).not.toBe(MaterialId.fish)
  })
})

describe('a slime', () => {
  it('eats the other creatures it reaches', () => {
    const grid = tank(31, 31)
    put(grid, 15, 15, MaterialId.slime)
    put(grid, 16, 15, MaterialId.fish)

    // An animal has no reserve: bites take it down and then it is gone.
    run(grid, 600)

    expect(count(grid, MaterialId.fish)).toBe(0)
  })

  it('cannot fly, whatever it can walk through', () => {
    const grid = createGrid(21, 21)
    for (let x = 0; x < 21; x++) placeMaterial(grid, cellIndex(grid, x, 20), MaterialId.stone)
    put(grid, 10, 10, MaterialId.slime)

    run(grid, 200)

    let row = -1
    for (let y = 0; y < grid.height; y++) {
      for (let x = 0; x < grid.width; x++) {
        if (grid.material[cellIndex(grid, x, y)] === MaterialId.slime) row = y
      }
    }
    // At home anywhere it can fit is not the same as flying, and one strolling up through open air looked
    // absurd. It has to end up on the floor.
    expect(row).toBe(19)
  })

  it('is at home in water and in the air alike', () => {
    const wet = tank(21, 21)
    put(wet, 10, 10, MaterialId.slime)
    const dry = createGrid(21, 21)
    for (let x = 0; x < 21; x++) placeMaterial(dry, cellIndex(dry, x, 20), MaterialId.stone)
    put(dry, 10, 19, MaterialId.slime)

    run(wet, 300)
    run(dry, 300)

    expect(count(wet, MaterialId.slime)).toBeGreaterThanOrEqual(1)
    expect(count(dry, MaterialId.slime)).toBeGreaterThanOrEqual(1)
  })
})

describe('the food chain', () => {
  it('closes: a fish with nothing to eat becomes meat, and a bug will eat that', () => {
    const grid = tank()
    put(grid, 10, 10, MaterialId.fish)

    run(grid, 3000)

    expect(count(grid, MaterialId.fish)).toBe(0)
    expect(count(grid, MaterialId.meat)).toBe(1)
  })

  it('leaves a corpse for every species', () => {
    for (const material of MATERIALS) {
      if (material.life === undefined) continue
      expect(MATERIALS[material.life.corpse]).toBeDefined()
      expect(MATERIALS[material.life.corpse].life).toBeUndefined()
    }
  })

  it('replays identically from the same seed', () => {
    const build = () => {
      const grid = tank(31, 31)
      put(grid, 10, 10, MaterialId.algae)
      put(grid, 20, 12, MaterialId.fish)
      put(grid, 15, 18, MaterialId.slime)
      run(grid, 200, 9)
      return [...grid.material]
    }

    expect(build()).toEqual(build())
  })
})
