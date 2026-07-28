import { describe, it, expect } from 'vitest'
import { Grid, MaterialId } from '../pixel-world.types'
import { AMBIENT_TEMPERATURE } from '../data'
import { cellIndex, createGrid, placeMaterial } from './grid'
import { createRng } from './rng'
import { step } from './step'
import { push } from './kinetic'

function set(grid: Grid, x: number, y: number, material: MaterialId): void {
  placeMaterial(grid, cellIndex(grid, x, y), material)
}

function at(grid: Grid, x: number, y: number): number {
  return grid.material[cellIndex(grid, x, y)]
}

function count(grid: Grid, material: MaterialId): number {
  return grid.material.reduce((total, cell) => (cell === material ? total + 1 : total), 0)
}

function run(grid: Grid, ticks: number, seed = 1234): void {
  const rng = createRng(seed)
  for (let tick = 0; tick < ticks; tick++) step(grid, rng, tick)
}

/** Stone floor along the bottom row and stone walls down both sides. */
function withVessel(width: number, height: number): Grid {
  const grid = createGrid(width, height)
  for (let x = 0; x < width; x++) set(grid, x, height - 1, MaterialId.stone)
  for (let y = 0; y < height; y++) {
    set(grid, 0, y, MaterialId.stone)
    set(grid, width - 1, y, MaterialId.stone)
  }
  return grid
}

/** Topmost row holding `material` per column, or null for a column without any. */
function surfaceHeights(grid: Grid, material: MaterialId): (number | null)[] {
  return Array.from({ length: grid.width }, (_, x) => {
    for (let y = 0; y < grid.height; y++) if (at(grid, x, y) === material) return y
    return null
  })
}

describe('step', () => {
  it('reproduces a run exactly from the same seed', () => {
    const build = () => {
      const grid = withVessel(40, 30)
      for (let x = 5; x < 35; x++) {
        for (let y = 2; y < 8; y++)
          set(grid, x, y, x % 3 === 0 ? MaterialId.water : MaterialId.sand)
      }
      return grid
    }

    const first = build()
    const second = build()
    run(first, 200, 77)
    run(second, 200, 77)

    expect(Array.from(first.material)).toEqual(Array.from(second.material))
  })

  it('conserves every material — cells move, they are never created or destroyed', () => {
    const grid = withVessel(40, 30)
    for (let x = 4; x < 36; x++) {
      for (let y = 1; y < 12; y++) set(grid, x, y, y % 2 === 0 ? MaterialId.sand : MaterialId.water)
    }
    const before = {
      sand: count(grid, MaterialId.sand),
      water: count(grid, MaterialId.water),
      stone: count(grid, MaterialId.stone),
    }

    run(grid, 300)

    expect(count(grid, MaterialId.sand)).toBe(before.sand)
    expect(count(grid, MaterialId.water)).toBe(before.water)
    expect(count(grid, MaterialId.stone)).toBe(before.stone)
  })

  it('settles sand with nothing hanging in the air', () => {
    const grid = withVessel(30, 40)
    for (let y = 2; y < 20; y++) set(grid, 15, y, MaterialId.sand)

    run(grid, 400)

    for (let y = 0; y < grid.height; y++) {
      for (let x = 0; x < grid.width; x++) {
        if (at(grid, x, y) !== MaterialId.sand) continue
        const below = at(grid, x, y + 1)
        expect(below === MaterialId.sand || below === MaterialId.stone).toBe(true)
      }
    }
  })

  it('levels water across a vessel', () => {
    const grid = withVessel(40, 30)
    for (let x = 2; x < 8; x++) {
      for (let y = 4; y < 28; y++) set(grid, x, y, MaterialId.water)
    }

    run(grid, 1500)

    const surfaces = surfaceHeights(grid, MaterialId.water).filter(
      (height): height is number => height !== null
    )
    expect(Math.max(...surfaces) - Math.min(...surfaces)).toBeLessThanOrEqual(1)
  })

  it('packs a poured liquid solid, leaving no air trapped under water', () => {
    const grid = withVessel(40, 30)
    for (let x = 2; x < 8; x++) {
      for (let y = 4; y < 28; y++) set(grid, x, y, MaterialId.water)
    }

    run(grid, 1500)

    for (let y = 0; y < grid.height - 1; y++) {
      for (let x = 0; x < grid.width; x++) {
        if (at(grid, x, y) !== MaterialId.water) continue
        expect(at(grid, x, y + 1)).not.toBe(MaterialId.empty)
      }
    }
  })

  it('sinks sand through water', () => {
    const grid = withVessel(20, 30)
    for (let x = 1; x < 19; x++) {
      for (let y = 10; y < 29; y++) set(grid, x, y, MaterialId.water)
    }
    for (let x = 8; x < 12; x++) set(grid, x, 2, MaterialId.sand)

    run(grid, 600)

    // Every grain ends below the water surface in its own column.
    const waterRows = surfaceHeights(grid, MaterialId.water)
    expect(count(grid, MaterialId.sand)).toBe(4)
    expect(waterRows.filter((row) => row !== null).length).toBeGreaterThan(10)
    for (let x = 0; x < grid.width; x++) {
      for (let y = 0; y < grid.height; y++) {
        if (at(grid, x, y) !== MaterialId.sand) continue
        const waterTop = waterRows[x]
        if (waterTop !== null) expect(y).toBeGreaterThan(waterTop)
      }
    }
  })

  it('sinks sand through water more slowly than it drops through air', () => {
    const depth = 20

    // A sealed tank, so the medium can't drain sideways and leave the grain falling through air.
    const ticksToFall = (medium: MaterialId) => {
      const height = depth + 4
      const grid = withVessel(9, height)
      for (let x = 1; x < 8; x++) {
        for (let y = 3; y < height - 1; y++) set(grid, x, y, medium)
      }
      set(grid, 4, 2, MaterialId.sand)

      const bottom = height - 2
      const rng = createRng(4242)
      for (let tick = 0; tick < 2000; tick++) {
        step(grid, rng, tick)
        for (let x = 1; x < 8; x++) if (at(grid, x, bottom) === MaterialId.sand) return tick
      }
      return Infinity
    }

    const throughAir = ticksToFall(MaterialId.empty)
    const throughWater = ticksToFall(MaterialId.water)

    expect(throughAir).toBeLessThan(Infinity)
    expect(throughWater).toBeLessThan(Infinity)
    // Water's drag is 0.65, so sinking should take roughly 1/(1-0.65) as long. Assert the direction
    // and a conservative factor rather than an exact count.
    expect(throughWater).toBeGreaterThan(throughAir * 2)
  })

  it('seeps a liquid into a heap of ash instead of plunging through it', () => {
    const settleTime = (bed: MaterialId) => {
      const grid = withVessel(9, 24)
      for (let x = 1; x < 8; x++) {
        for (let y = 14; y < 23; y++) set(grid, x, y, bed)
      }
      set(grid, 4, 12, MaterialId.water)

      const rng = createRng(808)
      for (let tick = 0; tick < 4000; tick++) {
        step(grid, rng, tick)
        if (at(grid, 4, 22) === MaterialId.water) return tick
      }
      return Infinity
    }

    const throughAir = settleTime(MaterialId.empty)
    const throughAsh = settleTime(MaterialId.ash)

    expect(throughAir).toBeLessThan(Infinity)
    expect(throughAsh).toBeLessThan(Infinity)
    // Ash has drag, so the drop soaks down through the heap rather than swapping straight past it.
    expect(throughAsh).toBeGreaterThan(throughAir * 2)
  })

  it('lifts a gas to the ceiling', () => {
    const grid = withVessel(12, 20)
    set(grid, 6, 17, MaterialId.methane)

    run(grid, 60)

    expect(at(grid, 6, 17)).toBe(MaterialId.empty)
    expect(surfaceHeights(grid, MaterialId.methane).some((row) => row === 0)).toBe(true)
  })

  it('floats a bubble up through water', () => {
    const grid = withVessel(12, 20)
    for (let x = 1; x < 11; x++) {
      for (let y = 4; y < 19; y++) set(grid, x, y, MaterialId.water)
    }
    set(grid, 6, 17, MaterialId.methane)

    run(grid, 60)

    const bubble = surfaceHeights(grid, MaterialId.methane).find((row) => row !== null)
    expect(bubble).toBeLessThan(5)
  })

  it('never lets a gas sink', () => {
    const grid = withVessel(9, 12)
    set(grid, 4, 2, MaterialId.smoke)

    run(grid, 100)

    for (let y = 3; y < 12; y++) expect(at(grid, 4, y)).not.toBe(MaterialId.smoke)
  })

  it('keeps a flame on its fuel instead of drifting off it', () => {
    const grid = withVessel(9, 12)
    set(grid, 4, 9, MaterialId.wood)
    set(grid, 4, 8, MaterialId.fire)

    run(grid, 60)

    expect(at(grid, 4, 8)).toBe(MaterialId.fire)
  })

  it('lets a flame rise once its fuel is gone', () => {
    const grid = withVessel(9, 12)
    set(grid, 4, 8, MaterialId.fire)

    run(grid, 60)

    expect(at(grid, 4, 8)).toBe(MaterialId.empty)
  })

  it('carries a cell temperature and burn timer along with the material', () => {
    const grid = withVessel(9, 12)
    const start = cellIndex(grid, 4, 2)
    set(grid, 4, 2, MaterialId.sand)
    grid.temperature[start] = 640
    grid.burn[start] = 25

    run(grid, 40)

    const landed = cellIndex(grid, 4, 10)
    expect(at(grid, 4, 10)).toBe(MaterialId.sand)
    expect(grid.temperature[landed]).toBe(640)
    expect(grid.burn[landed]).toBe(25)
    expect(grid.temperature[start]).toBe(AMBIENT_TEMPERATURE)
  })

  it('wakes the rows a hot cell moves between', () => {
    const grid = withVessel(9, 12)
    const start = cellIndex(grid, 4, 4)
    set(grid, 4, 4, MaterialId.sand)
    grid.temperature[start] = 900
    grid.hotRows.fill(0)

    run(grid, 1)

    expect(grid.hotRows[4]).toBe(1)
    expect(grid.hotRows[5]).toBe(1)
  })

  it('leaves the rows asleep when a cold cell moves', () => {
    const grid = withVessel(9, 12)
    set(grid, 4, 4, MaterialId.sand)
    grid.hotRows.fill(0)

    run(grid, 1)

    expect(grid.hotRows.every((row) => row === 0)).toBe(true)
  })

  it('never displaces static material', () => {
    const grid = createGrid(10, 10)
    for (let x = 0; x < 10; x++) set(grid, x, 5, MaterialId.stone)
    set(grid, 4, 1, MaterialId.sand)
    set(grid, 6, 1, MaterialId.water)

    run(grid, 200)

    for (let x = 0; x < 10; x++) expect(at(grid, x, 5)).toBe(MaterialId.stone)
    expect(count(grid, MaterialId.stone)).toBe(10)
    for (let y = 6; y < 10; y++) {
      for (let x = 0; x < 10; x++) expect(at(grid, x, y)).toBe(MaterialId.empty)
    }
  })

  it('builds a pile centred on where it fell, without drifting sideways', () => {
    const grid = withVessel(41, 30)
    for (let y = 1; y < 20; y++) set(grid, 20, y, MaterialId.sand)

    run(grid, 600)

    let weighted = 0
    let grains = 0
    for (let y = 0; y < grid.height; y++) {
      for (let x = 0; x < grid.width; x++) {
        if (at(grid, x, y) !== MaterialId.sand) continue
        weighted += x
        grains++
      }
    }
    expect(Math.abs(weighted / grains - 20)).toBeLessThan(1)
  })
})

/** How wide the material's footprint is along one row — a heap's angle, measured. */
function footprint(grid: Grid, material: MaterialId, row: number): number {
  let leftmost = grid.width
  let rightmost = -1
  for (let x = 0; x < grid.width; x++) {
    if (at(grid, x, row) !== material) continue
    leftmost = Math.min(leftmost, x)
    rightmost = Math.max(rightmost, x)
  }
  return rightmost < 0 ? 0 : rightmost - leftmost + 1
}

describe('a springy powder', () => {
  it('hands itself to the kinetic pass while nothing is under it', () => {
    const grid = createGrid(9, 9)
    const cell = cellIndex(grid, 4, 4)
    set(grid, 4, 4, MaterialId.rubber)

    step(grid, createRng(1), 0)

    // Falling a grain at a time reaches the floor with no speed to rebound from, so a dropped ball of
    // rubber just sat there instead of bouncing.
    expect(grid.velocity.has(cell)).toBe(true)
    expect(grid.material[cell]).toBe(MaterialId.rubber)
  })

  it('takes a whole lump into the air, not a cell at a time', () => {
    const grid = createGrid(15, 15)
    for (let x = 0; x < 15; x++) set(grid, x, 14, MaterialId.stone)
    for (let y = 5; y < 9; y++) {
      for (let x = 6; x < 9; x++) set(grid, x, y, MaterialId.rubber)
    }

    step(grid, createRng(1), 0)

    // Cells in a lump hold each other up, so only its bottom edge is unsupported. Taking one row per
    // tick made a painted ball dribble downward instead of dropping and bouncing.
    expect(grid.velocity.size).toBe(12)
  })

  it('is left alone once it has landed', () => {
    const grid = createGrid(9, 9)
    for (let x = 0; x < 9; x++) set(grid, x, 8, MaterialId.stone)
    const cell = cellIndex(grid, 4, 7)
    set(grid, 4, 7, MaterialId.rubber)

    step(grid, createRng(1), 0)

    expect(grid.velocity.has(cell)).toBe(false)
  })

  it('leaves an ordinary powder to fall as a grain', () => {
    const grid = createGrid(9, 9)
    set(grid, 4, 4, MaterialId.sand)

    step(grid, createRng(1), 0)

    expect(grid.velocity.size).toBe(0)
    expect(at(grid, 4, 5)).toBe(MaterialId.sand)
  })
})

describe('cells in flight', () => {
  it('are left to the kinetic pass', () => {
    const grid = createGrid(9, 9)
    const cell = cellIndex(grid, 4, 4)
    set(grid, 4, 4, MaterialId.sand)
    push(grid, cell, 0, -3)

    step(grid, createRng(1), 0)

    // Gravity is part of kinetic motion, so a cell moved by both passes falls twice as fast as it flew.
    expect(grid.material[cell]).toBe(MaterialId.sand)
  })

  it('fall as usual once they are back out of the map', () => {
    const grid = createGrid(9, 9)
    set(grid, 4, 4, MaterialId.sand)

    step(grid, createRng(1), 0)

    expect(at(grid, 4, 5)).toBe(MaterialId.sand)
  })
})

describe('heaps', () => {
  it('piles gravel steeper than sand', () => {
    const heapWidth = (material: MaterialId) => {
      const grid = withVessel(61, 40)
      const rng = createRng(808)
      // Pour a fixed number of grains onto one spot and let the heap settle. Pouring until the vessel
      // fills just measures the width of the vessel.
      let poured = 0
      for (let tick = 0; tick < 4000; tick++) {
        if (poured < 220 && tick % 4 === 0 && at(grid, 30, 2) === MaterialId.empty) {
          set(grid, 30, 2, material)
          poured++
        }
        step(grid, rng, tick)
      }
      return footprint(grid, material, 38)
    }

    const sand = heapWidth(MaterialId.sand)
    const gravel = heapWidth(MaterialId.gravel)

    expect(gravel).toBeGreaterThan(0)
    expect(gravel).toBeLessThan(sand)
  })

  it('creeps honey instead of letting it flow out flat', () => {
    const puddleWidth = (material: MaterialId) => {
      const grid = withVessel(41, 20)
      for (let y = 10; y < 18; y++) set(grid, 20, y, material)

      run(grid, 60)
      return footprint(grid, material, 18)
    }

    expect(puddleWidth(MaterialId.honey)).toBeLessThan(puddleWidth(MaterialId.water))
  })
})

describe('heavy gas', () => {
  it('pours chlorine downward instead of letting it rise', () => {
    const grid = withVessel(12, 20)
    set(grid, 6, 3, MaterialId.chlorine)

    run(grid, 120)

    let lowest = -1
    for (let y = 0; y < grid.height; y++) {
      for (let x = 0; x < grid.width; x++) {
        if (at(grid, x, y) === MaterialId.chlorine) lowest = Math.max(lowest, y)
      }
    }
    expect(lowest).toBeGreaterThan(3)
  })

  it('leaves a ragged cloud rather than a level puddle', () => {
    const surfaceSpread = (material: MaterialId) => {
      const grid = withVessel(41, 24)
      for (let x = 12; x < 29; x++) {
        for (let y = 4; y < 10; y++) set(grid, x, y, material)
      }

      run(grid, 600)

      const tops = surfaceHeights(grid, material).filter((row): row is number => row !== null)
      return Math.max(...tops) - Math.min(...tops)
    }

    // Water levels: its surface is flat to within a cell. A gas has no surface tension to speak of, so
    // its top edge stays uneven — falling every tick and then levelling made chlorine read as a liquid.
    expect(surfaceSpread(MaterialId.water)).toBeLessThanOrEqual(1)
    expect(surfaceSpread(MaterialId.chlorine)).toBeGreaterThan(3)
  })

  it('still floats chlorine on top of water', () => {
    const grid = withVessel(12, 20)
    for (let x = 1; x < 11; x++) {
      for (let y = 12; y < 19; y++) set(grid, x, y, MaterialId.water)
    }
    set(grid, 6, 3, MaterialId.chlorine)

    run(grid, 200)

    expect(count(grid, MaterialId.chlorine)).toBe(1)
    for (let x = 0; x < grid.width; x++) {
      for (let y = 1; y < grid.height; y++) {
        if (at(grid, x, y) !== MaterialId.chlorine) continue
        // Denser than air so it sank this far, lighter than water so it rides on top rather than under.
        expect(at(grid, x, y - 1)).not.toBe(MaterialId.water)
      }
    }
  })
})

describe('a gas in a draught', () => {
  /** Where a puff of smoke ends up after drifting down a sealed corridor in a flow of `airX`. */
  function driftedTo(airX: number): number {
    const grid = createGrid(81, 21)
    for (let x = 0; x < grid.width; x++) {
      set(grid, x, 8, MaterialId.stone)
      set(grid, x, 12, MaterialId.stone)
    }
    const start = 40
    set(grid, start, 10, MaterialId.smoke)
    grid.airX.fill(airX)

    const rng = createRng(1)
    for (let tick = 0; tick < 20; tick++) step(grid, rng, tick)

    // It rises to the top of the corridor as well as drifting, so look at every open row.
    for (let y = 9; y <= 11; y++) {
      for (let x = 0; x < grid.width; x++) {
        if (at(grid, x, y) === MaterialId.smoke) return x
      }
    }
    return -1
  }

  it('leans the way the air is going instead of drifting at random', () => {
    // The cheap half of the air coupling, and the one that reads best: a plume bends downwind a cell at a
    // time, without the flow ever having to be strong enough to throw anything. Compared against the same
    // seed blowing the other way, because a random walk on its own wanders in both directions.
    const downwind = driftedTo(4)
    const upwind = driftedTo(-4)

    expect(downwind).toBeGreaterThan(upwind)
  })
})

describe('a liquid sliding sideways', () => {
  /** Cells whose material changes per tick, once a scene has had long enough to settle. */
  function churnPerTick(build: (grid: Grid) => void, settle: number, ticks: number): number {
    const grid = createGrid(160, 120)
    for (let x = 0; x < grid.width; x++) {
      set(grid, x, grid.height - 1, MaterialId.stone)
    }
    build(grid)
    const rng = createRng(1)
    for (let tick = 0; tick < settle; tick++) step(grid, rng, tick)

    let previous = grid.material.slice()
    let changed = 0
    for (let tick = settle; tick < settle + ticks; tick++) {
      step(grid, rng, tick)
      for (let i = 0; i < grid.material.length; i++) {
        if (grid.material[i] !== previous[i]) changed++
      }
      previous = grid.material.slice()
    }
    return changed / ticks
  }

  it('does not shove a lighter solid out of the way', () => {
    // The complaint this guards: dirt and sand resting on lava jumped about as if they were alive. Density
    // decides who sinks through whom, which is a rule about gravity, and the sideways move was using it too.
    // Lava is denser than dirt, so a pool shoved the dirt above it left and right forever.
    //
    // A sealed tank of lava with one grain of dirt in it. The grain rises, because lava is heavier and
    // displaces it upward, and then it has lava on both sides with nowhere left to go.
    const churn = churnPerTick(
      (grid) => {
        for (let y = 90; y < grid.height; y++) {
          set(grid, 40, y, MaterialId.stone)
          set(grid, 120, y, MaterialId.stone)
        }
        for (let y = 100; y < grid.height - 1; y++) {
          for (let x = 41; x < 120; x++) set(grid, x, y, MaterialId.lava)
        }
        set(grid, 80, grid.height - 2, MaterialId.dirt)
      },
      400,
      40
    )

    expect(churn).toBe(0)
  })

  it('still lets a poured column find its level across a wide floor', () => {
    // The other half, and the reason two earlier attempts at the jitter were thrown away: sliding sideways
    // into open space is how a pool levels itself, so the rule above has to leave that alone. A vessel only
    // forty cells wide is too small to catch a pool that gives up part-way, so this one is wide.
    const grid = createGrid(200, 90)
    for (let x = 0; x < grid.width; x++) set(grid, x, grid.height - 1, MaterialId.stone)
    for (let y = 10; y < grid.height - 1; y++) {
      for (let x = 90; x < 110; x++) set(grid, x, y, MaterialId.water)
    }

    const rng = createRng(1)
    for (let tick = 0; tick < 2000; tick++) step(grid, rng, tick)

    const surfaces: number[] = []
    for (let x = 0; x < grid.width; x++) {
      for (let y = 0; y < grid.height; y++) {
        if (at(grid, x, y) === MaterialId.water) {
          surfaces.push(y)
          break
        }
      }
    }
    expect(surfaces.length).toBe(grid.width)
    expect(Math.max(...surfaces) - Math.min(...surfaces)).toBeLessThanOrEqual(3)
  })
})
