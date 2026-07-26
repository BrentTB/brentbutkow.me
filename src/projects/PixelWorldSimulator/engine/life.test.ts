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
  for (let tick = 0; tick < ticks; tick++) {
    // The material pass clears this between ticks; on its own, the life pass has to do it itself.
    grid.moved.fill(0)
    simulateLife(grid, rng, tick)
  }
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
    /** Energy held by every algae cell in a world. */
    const cropEnergy = (grid: Grid) => {
      let total = 0
      for (let i = 0; i < grid.material.length; i++) {
        if (grid.material[i] === MaterialId.algae) total += grid.data[i]
      }
      return total
    }

    const grazed = tank()
    put(grazed, 10, 10, MaterialId.fish)
    put(grazed, 10, 11, MaterialId.algae)

    const spared = tank()
    put(spared, 10, 11, MaterialId.algae)

    // Eating is a bite on a rate, not a swallow every tick: living food loses energy and keeps a reserve,
    // which is what stops a grazer stripping a tank faster than it can grow back.
    run(grazed, 400)
    run(spared, 400)

    expect(count(grazed, MaterialId.algae)).toBeGreaterThanOrEqual(1)
    expect(cropEnergy(grazed)).toBeLessThan(cropEnergy(spared))
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
    // Hunters look around every few ticks rather than every tick, so closing the distance takes a moment.
    run(grid, 300)

    // Its sight is what makes it read as hunting; without the bias it wanders and starves.
    const after = distance()
    expect(after === -1 || after < before).toBe(true)
  })

  it('finds a bank of worms and lives off it', () => {
    const grid = createGrid(160, 100)
    for (let y = 70; y < 100; y++) {
      for (let x = 0; x < 160; x++) placeMaterial(grid, cellIndex(grid, x, y), MaterialId.dirt)
    }
    for (let i = 0; i < 20; i++) put(grid, 20 + i * 6, 72, MaterialId.worm)
    for (let i = 0; i < 6; i++) put(grid, 30 + i * 20, 60, MaterialId.bird)

    run(grid, 1800)

    // A bird's whole diet on land is worms, and it starves in about 1700 ticks without one: still being here
    // means the hunt works, sight and all.
    expect(count(grid, MaterialId.bird)).toBeGreaterThanOrEqual(6)
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

    // Flying is expensive: about 1700 ticks of it on a full tank, so give it time to run out. On its old
    // metabolism a bird could hang over an empty world indefinitely.
    run(grid, 2200)

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
    run(grid, 1200)

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

describe('a crowd', () => {
  it('stays where it was put instead of sliding across the world', () => {
    const grid = createGrid(120, 80)
    for (let x = 0; x < 120; x++) placeMaterial(grid, cellIndex(grid, x, 79), MaterialId.stone)
    // A solid blob, the way a big brush puts them down.
    for (let y = 30; y < 45; y++) {
      for (let x = 50; x < 70; x++) put(grid, x, y, MaterialId.bird)
    }

    const centre = () => {
      let total = 0
      let seen = 0
      for (let i = 0; i < grid.material.length; i++) {
        if (grid.material[i] !== MaterialId.bird) continue
        total += i % grid.width
        seen++
      }
      return seen === 0 ? -1 : total / seen
    }

    const before = centre()
    run(grid, 600)

    // Crowded creatures used to drift: one stepping into a cell the scan had not reached yet took a second
    // turn in the same tick, and a blob of birds slid steadily left across an empty world.
    expect(Math.abs(centre() - before)).toBeLessThan(4)
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

/** A stone floor with open air above it: the surface an ant crawls along and builds out from. */
function ground(width = 30, height = 12): Grid {
  const grid = createGrid(width, height)
  for (let x = 0; x < width; x++)
    placeMaterial(grid, cellIndex(grid, x, height - 1), MaterialId.stone)
  return grid
}

/** Places an ant and points it, so a test does not ride on which way it happens to set off. */
function ant(grid: Grid, x: number, y: number, hx: number, hy: number): number {
  const index = put(grid, x, y, MaterialId.ant)
  grid.heading.set(index, { hx, hy })
  return index
}

describe('the ant', () => {
  it('trails a line of whatever it is standing on', () => {
    // A wood shelf to walk out along: the ant should draw its trail in wood, not some fixed material, so
    // an ant on wood makes wood and an ant on stone makes stone.
    const grid = ground(30, 14)
    for (let x = 4; x < 26; x++) placeMaterial(grid, cellIndex(grid, x, 10), MaterialId.wood)
    const startWood = count(grid, MaterialId.wood)
    ant(grid, 15, 9, 1, 0)

    run(grid, 200, 3)

    // There is more wood than the shelf started with, and no vine at all: it built in the wood it walked.
    expect(count(grid, MaterialId.wood)).toBeGreaterThan(startWood)
    expect(count(grid, MaterialId.vine)).toBe(0)
  })

  it('bores down into a plank rather than only pacing its top', () => {
    // A thick block of wood on a floor, an ant set on top and pointed down. It should tunnel into the body
    // of the wood, not sit on the surface — so open tunnel appears well below where it started. Without
    // the ability to burrow, an ant cannot enter solid wood at all and this stays zero.
    const grid = createGrid(20, 20)
    for (let x = 0; x < grid.width; x++)
      placeMaterial(grid, cellIndex(grid, x, 19), MaterialId.stone)
    for (let y = 6; y < 19; y++) {
      for (let x = 3; x < 17; x++) placeMaterial(grid, cellIndex(grid, x, y), MaterialId.wood)
    }
    const startY = 5
    ant(grid, 10, startY, 0, 1)

    run(grid, 300, 2)

    // The deepest tunnel opened inside the block: an empty cell that used to be wood, well below the top.
    let deepest = startY
    for (let y = 7; y < 19; y++) {
      for (let x = 3; x < 17; x++) {
        if (grid.material[cellIndex(grid, x, y)] === MaterialId.empty)
          deepest = Math.max(deepest, y)
      }
    }
    expect(deepest).toBeGreaterThan(startY + 4)
  })

  it('only builds where it can grip, not out in mid-air', () => {
    // A lone ant floating in empty space with nothing under it: it drops rather than laying trail into
    // the void, so nothing gets built up here.
    const grid = createGrid(16, 16)
    ant(grid, 8, 2, 1, 0)

    run(grid, 40, 1)

    expect(count(grid, MaterialId.vine)).toBe(0)
  })

  it('falls to a surface when set down in open air', () => {
    const grid = ground(20, 22)
    ant(grid, 10, 2, 1, 0)

    run(grid, 150, 1)

    // Nothing of the ant is left hanging near the top: gravity brought it down to the ground to crawl.
    for (let y = 0; y < 4; y++) {
      for (let x = 0; x < grid.width; x++) {
        expect(grid.material[cellIndex(grid, x, y)]).not.toBe(MaterialId.ant)
      }
    }
  })

  it('survives out in the open, where a creature bound to one medium would strand', () => {
    const grid = ground(20, 12)
    ant(grid, 10, 10, 1, 0)

    run(grid, 150, 1)

    expect(count(grid, MaterialId.ant)).toBe(1)
  })

  it('dies into the corpse its material declares, and clears its heading when it goes', () => {
    const corpse = MATERIALS[MaterialId.ant].life?.corpse
    const grid = ground(12, 8)
    const index = ant(grid, 6, 6, 1, 0)
    // On its last legs.
    grid.data[index] = 1

    run(grid, 200, 1)

    expect(count(grid, MaterialId.ant)).toBe(0)
    expect(count(grid, corpse ?? MaterialId.meat)).toBeGreaterThan(0)
    // No stray heading is left pointing at a cell that is no longer an ant.
    expect(grid.heading.size).toBe(0)
  })

  it('keeps one heading per living ant, and no more', () => {
    const grid = ground(40, 14)
    for (let x = 8; x <= 20; x += 3) ant(grid, x, 12, 1, 0)

    run(grid, 200, 3)

    expect(grid.heading.size).toBe(count(grid, MaterialId.ant))
  })

  it('replays identically from the same seed', () => {
    const build = () => {
      const grid = ground(40, 14)
      for (let x = 8; x <= 20; x += 3) ant(grid, x, 12, 1, 0)
      run(grid, 200, 6)
      return [...grid.material]
    }

    expect(build()).toEqual(build())
  })
})
