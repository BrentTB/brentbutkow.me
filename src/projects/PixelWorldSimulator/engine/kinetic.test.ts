import { describe, it, expect } from 'vitest'
import { Grid, MaterialId } from '../pixel-world.types'
import { cellIndex, createGrid, placeMaterial } from './grid'
import { moveKinetic, push } from './kinetic'
import { createRng } from './rng'

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

    expect(grid.velocity.size).toBeLessThan(grid.material.length)
  })
})
