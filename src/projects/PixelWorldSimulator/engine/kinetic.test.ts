import { describe, it, expect } from 'vitest'
import { Grid, MaterialId } from '../pixel-world.types'
import { cellIndex, createGrid, placeMaterial } from './grid'
import { GRID_HEIGHT, GRID_WIDTH } from '../data'
import { MAX_IN_FLIGHT, moveKinetic, push } from './kinetic'
import { MATERIALS } from './materials'
import { createRng } from './rng'
import { isCellAwake } from './chunks'
import { tickWorld } from './tick'

/** A world with a stone floor along the bottom row. */
function walledGrid(width = 21, height = 21): Grid {
  const grid = createGrid(width, height)
  for (let x = 0; x < width; x++)
    placeMaterial(grid, cellIndex(grid, x, height - 1), MaterialId.stone)
  return grid
}

/** Where the one cell of `material` currently is. */
function find(grid: Grid, material: MaterialId): { x: number; y: number } | null {
  for (let y = 0; y < grid.height; y++) {
    for (let x = 0; x < grid.width; x++) {
      if (grid.material[cellIndex(grid, x, y)] === material) return { x, y }
    }
  }
  return null
}

describe('push', () => {
  it('ignores empty cells, which have nothing to throw', () => {
    const grid = createGrid(9, 9)

    push(grid, cellIndex(grid, 4, 4), 3, -3)

    expect(grid.velocity.size).toBe(0)
  })

  it('compounds two impulses on the same cell', () => {
    const grid = createGrid(9, 9)
    const cell = cellIndex(grid, 4, 4)
    placeMaterial(grid, cell, MaterialId.sand)

    push(grid, cell, 2, 0)
    push(grid, cell, 1, -1)

    expect(grid.velocity.get(cell)).toMatchObject({ vx: 3, vy: -1 })
  })
})

describe('moveKinetic', () => {
  it('carries a cell along the direction it was thrown', () => {
    const rng = createRng(7)
    const grid = walledGrid()
    const start = cellIndex(grid, 4, 10)
    placeMaterial(grid, start, MaterialId.sand)

    push(grid, start, 3, 0)
    moveKinetic(grid, rng)

    const landed = find(grid, MaterialId.sand)
    expect(landed).not.toBeNull()
    expect(landed?.x).toBeGreaterThan(4)
  })

  it('arcs a thrown cell up and back down, handing it back once it lands', () => {
    const rng = createRng(7)
    const grid = walledGrid(21, 41)
    const start = cellIndex(grid, 10, 30)
    placeMaterial(grid, start, MaterialId.sand)
    push(grid, start, 0, -3)

    // Gravity is inside the kinetic pass, so one throw produces the whole arc without any other pass.
    let apex = 30
    for (let tick = 0; tick < 200 && grid.velocity.size > 0; tick++) {
      moveKinetic(grid, rng)
      apex = Math.min(apex, find(grid, MaterialId.sand)?.y ?? apex)
    }

    expect(apex).toBeLessThan(30)
    expect(find(grid, MaterialId.sand)?.y).toBe(grid.height - 2)
    expect(grid.velocity.size).toBe(0)
  })

  it('keeps a sub-cell drift moving instead of rounding it away', () => {
    const rng = createRng(7)
    const grid = walledGrid()
    const start = cellIndex(grid, 4, 4)
    placeMaterial(grid, start, MaterialId.sand)
    // Slower than one cell per tick sideways: it has to accumulate before it steps.
    push(grid, start, 0.6, -1)

    for (let tick = 0; tick < 4; tick++) moveKinetic(grid, rng)

    expect(find(grid, MaterialId.sand)?.x).toBeGreaterThan(4)
  })

  it('bounces rubber off the floor and leaves sand where it lands', () => {
    const rng = createRng(7)
    const bouncy = walledGrid()
    const rubber = cellIndex(bouncy, 5, 17)
    placeMaterial(bouncy, rubber, MaterialId.rubber)
    push(bouncy, rubber, 0, 4)

    const dull = walledGrid()
    const sand = cellIndex(dull, 5, 17)
    placeMaterial(dull, sand, MaterialId.sand)
    push(dull, sand, 0, 4)

    for (let tick = 0; tick < 3; tick++) {
      moveKinetic(bouncy, rng)
      moveKinetic(dull, rng)
    }

    // Rubber's restitution sends it back up off the floor; sand's thud leaves it where it landed.
    expect(bouncy.velocity.size).toBe(1)
    expect(dull.velocity.size).toBe(0)
  })

  it('reads the flying material after a diagonal slide, so a corner bounce still springs', () => {
    const rng = createRng(7)
    const grid = walledGrid(21, 21)
    const startY = grid.height - 2
    const start = cellIndex(grid, 5, startY)
    placeMaterial(grid, start, MaterialId.rubber)
    // Down and to the side into the floor: the down-diagonal is blocked, so the cell slides along the open
    // side and reflects its vertical speed. That bounce has to read rubber's restitution — not the empty
    // cell it just vacated by sliding, which thuds flat and never leaves the floor row.
    push(grid, start, 2, 3)

    let apex = startY
    for (let tick = 0; tick < 20 && grid.velocity.size > 0; tick++) {
      moveKinetic(grid, rng)
      apex = Math.min(apex, find(grid, MaterialId.rubber)?.y ?? apex)
    }

    expect(apex).toBeLessThan(startY)
  })

  it('drops a cell out of the map once it is barely moving and has landed', () => {
    const rng = createRng(7)
    const grid = walledGrid()
    const cell = cellIndex(grid, 4, grid.height - 2)
    placeMaterial(grid, cell, MaterialId.sand)
    push(grid, cell, 0.05, -0.05)

    moveKinetic(grid, rng)

    expect(grid.velocity.size).toBe(0)
  })

  it('keeps a thrown cell in flight while nothing is under it', () => {
    const rng = createRng(7)
    const grid = walledGrid()
    const cell = cellIndex(grid, 4, 4)
    placeMaterial(grid, cell, MaterialId.rubber)
    push(grid, cell, 0.05, -0.05)

    moveKinetic(grid, rng)

    // What keeps a whole arc going: dropping a cell at the top of its throw stops it in mid-air.
    expect(grid.velocity.size).toBe(1)
  })

  it('bounces thrown rubber down the world and lets it settle on the floor', () => {
    const rng = createRng(7)
    const grid = walledGrid(21, 41)
    const start = cellIndex(grid, 10, 6)
    placeMaterial(grid, start, MaterialId.rubber)
    push(grid, start, 0, 1)

    let bounces = 0
    let previous = 6
    for (let tick = 0; tick < 600 && grid.velocity.size > 0; tick++) {
      moveKinetic(grid, rng)
      const at = find(grid, MaterialId.rubber)?.y ?? previous
      if (at < previous) bounces++
      previous = at
    }

    expect(bounces).toBeGreaterThan(0)
    expect(find(grid, MaterialId.rubber)?.y).toBe(grid.height - 2)
    expect(grid.velocity.size).toBe(0)
  })

  it('rolls a bouncing cell off a slope instead of hopping on one spot', () => {
    const rng = createRng(7)
    const grid = createGrid(41, 41)
    // Ground that falls away to the right: the surface of column x sits one row lower than column x-1.
    for (let x = 6; x < 41; x++) {
      const surface = Math.min(40, 22 + (x - 6))
      for (let y = surface; y < 41; y++)
        placeMaterial(grid, cellIndex(grid, x, y), MaterialId.stone)
    }

    const start = cellIndex(grid, 8, 10)
    placeMaterial(grid, start, MaterialId.rubber)
    push(grid, start, 0, 1)

    let landedX = 8
    for (let tick = 0; tick < 400 && grid.velocity.size > 0; tick++) {
      moveKinetic(grid, rng)
      const at = find(grid, MaterialId.rubber)
      if (at) landedX = at.x
    }

    // A hillside used to reflect the ball straight back up, so it hopped on one spot until it ran out.
    expect(landedX).toBeGreaterThan(8)
  })

  it('sends a bounce sideways even on flat ground, so it does not trace one line', () => {
    const rng = createRng(3)
    const grid = walledGrid(41, 41)
    const start = cellIndex(grid, 20, 10)
    placeMaterial(grid, start, MaterialId.rubber)
    push(grid, start, 0, 3)

    for (let tick = 0; tick < 400 && grid.velocity.size > 0; tick++) moveKinetic(grid, rng)

    expect(find(grid, MaterialId.rubber)?.x).not.toBe(20)
  })

  it('forgets a cell that stopped existing', () => {
    const rng = createRng(7)
    const grid = walledGrid()
    const cell = cellIndex(grid, 4, 4)
    placeMaterial(grid, cell, MaterialId.sand)
    push(grid, cell, 0, -3)

    // Something ate it between ticks — acid, void, a flame, or the eraser.
    placeMaterial(grid, cell, MaterialId.empty)
    moveKinetic(grid, rng)

    expect(grid.velocity.size).toBe(0)
  })

  it('shatters glass hit hard enough, and leaves it alone otherwise', () => {
    const rng = createRng(7)
    const smashed = walledGrid()
    placeMaterial(smashed, cellIndex(smashed, 10, 10), MaterialId.glass)
    const hammer = cellIndex(smashed, 6, 10)
    placeMaterial(smashed, hammer, MaterialId.stone)
    push(smashed, hammer, 6, 0)

    const nudged = walledGrid()
    placeMaterial(nudged, cellIndex(nudged, 10, 10), MaterialId.glass)
    const tap = cellIndex(nudged, 9, 10)
    placeMaterial(nudged, tap, MaterialId.sand)
    push(nudged, tap, 0.6, 0)

    for (let tick = 0; tick < 3; tick++) {
      moveKinetic(smashed, rng)
      moveKinetic(nudged, rng)
    }

    expect(find(smashed, MaterialId.shard)).not.toBeNull()
    expect(find(nudged, MaterialId.glass)).not.toBeNull()
    expect(find(nudged, MaterialId.shard)).toBeNull()
  })

  it('lands on the same world whichever order the impulses were written in', () => {
    const forwardRng = createRng(7)
    const backwardRng = createRng(7)
    // Insertion order depends on which blast touched a cell first, so the pass sorts by index. Without
    // that, a replayed seed diverges from the world it is replaying.
    const forward = walledGrid()
    const backward = walledGrid()
    const cells = [
      { x: 6, y: 12 },
      { x: 8, y: 12 },
      { x: 10, y: 12 },
    ]

    for (const { x, y } of cells) {
      placeMaterial(forward, cellIndex(forward, x, y), MaterialId.sand)
      placeMaterial(backward, cellIndex(backward, x, y), MaterialId.sand)
    }
    for (const { x, y } of cells) push(forward, cellIndex(forward, x, y), 2, -1)
    for (const { x, y } of [...cells].reverse()) push(backward, cellIndex(backward, x, y), 2, -1)

    for (let tick = 0; tick < 6; tick++) {
      moveKinetic(forward, forwardRng)
      moveKinetic(backward, backwardRng)
    }

    expect([...backward.material]).toEqual([...forward.material])
  })

  it('caps how much can be in flight at once', () => {
    const rng = createRng(7)
    const grid = createGrid(120, 120)
    for (let i = 0; i < grid.material.length; i++) placeMaterial(grid, i, MaterialId.sand)
    // Every cell thrown at once, which is what a blast in a packed world asks for.
    for (let i = 0; i < grid.material.length; i++) push(grid, i, 0, -(1 + (i % 5)))

    moveKinetic(grid, rng)

    expect(grid.velocity.size).toBeLessThanOrEqual(MAX_IN_FLIGHT)
  })
})

describe('an impact on packed material', () => {
  /** A tall bed of sand with the middle of its bottom row shoved upward, hard. */
  function packedBed(depth: number) {
    const grid = walledGrid(41, depth + 6)
    for (let y = 1; y <= depth; y++) {
      for (let x = 0; x < grid.width; x++)
        placeMaterial(grid, cellIndex(grid, x, y), MaterialId.sand)
    }
    return grid
  }

  /** The height of the fastest-rising sand, as a negative number of cells per tick. */
  function fastestUpward(grid: Grid) {
    let fastest = 0
    for (const [index, motion] of grid.velocity) {
      if (grid.material[index] === MaterialId.sand) fastest = Math.min(fastest, motion.vy)
    }
    return fastest
  }

  it('carries the impact through to the far side of the run', () => {
    // The complaint this guards: a charge buried under a bed deeper than its blast reach moved nothing.
    // Sand cannot displace sand, so a grain walled in by more sand reflected off its neighbour and threw
    // the impulse away, and only the surface layer with air above it ever flew. Large chunks of a bed sat
    // completely still through an explosion and then simply fell into the hole.
    const depth = 12
    const grid = packedBed(depth)
    const struck = cellIndex(grid, 20, depth)
    push(grid, struck, 0, -12)

    moveKinetic(grid, createRng(1))

    // The run above the struck cell is now moving, all the way up to the open air at the top of the bed.
    for (let y = 1; y < depth; y++) {
      expect(grid.velocity.has(cellIndex(grid, 20, y))).toBe(true)
    }
    expect(fastestUpward(grid)).toBeLessThan(0)
  })

  it('leaves a run braced against the world alone', () => {
    // A wall is scaffolding. Sand driven down into the stone floor has nowhere to send the impact, so
    // nothing under it may be handed any.
    const grid = packedBed(4)
    const struck = cellIndex(grid, 20, 4)
    push(grid, struck, 0, 12)

    moveKinetic(grid, createRng(1))

    expect(grid.velocity.has(cellIndex(grid, 20, grid.height - 1))).toBe(false)
  })
})

describe('the cap on cells in flight', () => {
  it('never fires on an ordinary explosion', () => {
    // The cap is a valve against a world made of nothing but explosives, where the aftermath costs half
    // again as much without it. It is not a budget, and an explosion somebody actually built has to pass
    // under it untouched — clipping one deletes the launch mid-flight and costs nothing, because `trim`
    // runs at the end of this pass while the pushes arrive from `detonate` later in the same tick.
    const grid = createGrid(GRID_WIDTH, GRID_HEIGHT)
    const floor = GRID_HEIGHT - 1
    for (let x = 0; x < GRID_WIDTH; x++) {
      placeMaterial(grid, cellIndex(grid, x, floor), MaterialId.stone)
    }
    const chargeTop = floor - 20
    for (let y = chargeTop - 40; y < chargeTop; y++) {
      for (let x = 0; x < GRID_WIDTH; x++)
        placeMaterial(grid, cellIndex(grid, x, y), MaterialId.sand)
    }
    for (let y = chargeTop; y < floor; y++) {
      for (let x = 180; x < 220; x++) placeMaterial(grid, cellIndex(grid, x, y), MaterialId.tnt)
    }

    grid.temperature[cellIndex(grid, 200, floor - 1)] = 1200
    grid.hotRows.fill(1)
    const rng = createRng(1)
    let peakInFlight = 0
    for (let tick = 0; tick < 30; tick++) {
      tickWorld(grid, rng, tick)
      peakInFlight = Math.max(peakInFlight, grid.velocity.size)
    }

    expect(peakInFlight).toBeGreaterThan(0)
    expect(peakInFlight).toBeLessThan(MAX_IN_FLIGHT)
  })
})

describe('handing a cell back from flight', () => {
  it('wakes its chunk, because the movement pass had stopped looking at it', () => {
    // `step` skips anything in the velocity map, so a cell that flight gives up on is a cell neither pass is
    // watching. Air grabbing a grain too gently to move it was enough to trigger this: kinetic dropped it and
    // step never looked again, leaving it frozen with open space beside it.
    const grid = walledGrid(96, 96)
    const resting = cellIndex(grid, 50, grid.height - 2)
    placeMaterial(grid, resting, MaterialId.sand)

    // Nudged too gently for flight to do anything with it, from a world that has gone quiet.
    push(grid, resting, 0, -0.05)
    grid.awakeChunks.fill(0)
    grid.awakeChunksNext.fill(0)

    moveKinetic(grid, createRng(1))

    // Flight has let it go, so the chunk has to be awake again for `step` to pick it up.
    expect(grid.velocity.has(resting)).toBe(false)
    expect(isCellAwake(grid, 50, grid.height - 2)).toBe(true)
  })
})

describe('metal', () => {
  it('neither melts nor breaks, so a build can rely on it', () => {
    // The one material that stays exactly where it was put. It trades any phase of its own for that: heat and
    // sparks travel through it and nothing else happens to it.
    expect(MATERIALS[MaterialId.metal].hot).toBeUndefined()
    expect(MATERIALS[MaterialId.metal].shatters).toBeUndefined()
  })
})
