import { describe, it, expect } from 'vitest'
import { MaterialId } from '../pixel-world.types'
import { AMBIENT_TEMPERATURE } from '../data'
import { cellIndex, createGrid, placeMaterial } from './grid'
import { attract, blast, detonate, flashOver, temper, wind } from './forces'
import { MATERIALS } from './materials'

describe('attract', () => {
  it('pulls loose cells toward the pointer from both sides', () => {
    const grid = createGrid(21, 21)
    const left = cellIndex(grid, 4, 10)
    const right = cellIndex(grid, 16, 10)
    placeMaterial(grid, left, MaterialId.sand)
    placeMaterial(grid, right, MaterialId.sand)

    attract(grid, 10, 10, 8)

    expect(grid.velocity.get(left)?.vx).toBeGreaterThan(0)
    expect(grid.velocity.get(right)?.vx).toBeLessThan(0)
  })

  it('leaves the world you built alone, but throws rubber', () => {
    const grid = createGrid(21, 21)
    const wall = cellIndex(grid, 6, 10)
    const ball = cellIndex(grid, 14, 10)
    placeMaterial(grid, wall, MaterialId.stone)
    placeMaterial(grid, ball, MaterialId.rubber)

    attract(grid, 10, 10, 8)

    // Static materials are the scaffolding; rubber is the deliberate exception that exists to be thrown.
    expect(grid.velocity.has(wall)).toBe(false)
    expect(grid.velocity.has(ball)).toBe(true)
  })

  it('reaches further into the disc the closer a cell is', () => {
    const grid = createGrid(41, 41)
    const near = cellIndex(grid, 18, 20)
    const far = cellIndex(grid, 8, 20)
    placeMaterial(grid, near, MaterialId.sand)
    placeMaterial(grid, far, MaterialId.sand)

    attract(grid, 20, 20, 14)

    const nearPull = grid.velocity.get(near)?.vx ?? 0
    const farPull = grid.velocity.get(far)?.vx ?? 0
    expect(nearPull).toBeGreaterThan(farPull)
  })
})

describe('blast', () => {
  it('throws cells outward and warms them on the way', () => {
    const grid = createGrid(21, 21)
    const left = cellIndex(grid, 6, 10)
    const right = cellIndex(grid, 14, 10)
    placeMaterial(grid, left, MaterialId.sand)
    placeMaterial(grid, right, MaterialId.sand)

    blast(grid, 10, 10, 8)

    expect(grid.velocity.get(left)?.vx).toBeLessThan(0)
    expect(grid.velocity.get(right)?.vx).toBeGreaterThan(0)
    expect(grid.temperature[left]).toBeGreaterThan(AMBIENT_TEMPERATURE)
  })

  it('sends the cell it is centred on straight up', () => {
    const grid = createGrid(21, 21)
    const middle = cellIndex(grid, 10, 10)
    placeMaterial(grid, middle, MaterialId.sand)

    blast(grid, 10, 10, 6)

    // There is no outward direction from dead centre, so the shove has to pick one.
    expect(grid.velocity.get(middle)?.vy).toBeLessThan(0)
  })

  it('lights what it throws', () => {
    const grid = createGrid(21, 21)
    const plank = cellIndex(grid, 11, 10)
    placeMaterial(grid, plank, MaterialId.wood)

    blast(grid, 10, 10, 6)

    const { ignite } = MATERIALS[MaterialId.wood]
    expect(grid.temperature[plank]).toBeGreaterThanOrEqual(ignite?.at ?? Infinity)
  })

  it('does not stack overlapping blasts into a fake sun', () => {
    const grid = createGrid(21, 21)
    const cell = cellIndex(grid, 10, 10)
    placeMaterial(grid, cell, MaterialId.sand)

    blast(grid, 10, 10, 6)
    const once = grid.temperature[cell]
    blast(grid, 10, 10, 6)

    expect(grid.temperature[cell]).toBe(once)
  })
})

describe('the same impulse on different materials', () => {
  function thrownSpeed(material: MaterialId): number {
    const grid = createGrid(41, 41)
    const cell = cellIndex(grid, 20, 26)
    placeMaterial(grid, cell, material)

    blast(grid, 20, 30, 8)

    const motion = grid.velocity.get(cell)
    return Math.abs(motion?.vx ?? 0) + Math.abs(motion?.vy ?? 0)
  }

  it('throws a light material further than a heavy one', () => {
    // Every material flying identically is what made glass splinters behave like wet gravel.
    expect(thrownSpeed(MaterialId.shard)).toBeGreaterThan(thrownSpeed(MaterialId.gravel))
    expect(thrownSpeed(MaterialId.ash)).toBeGreaterThan(thrownSpeed(MaterialId.sand))
  })

  it('still moves the heaviest thing a force can pick up', () => {
    expect(thrownSpeed(MaterialId.lava)).toBeGreaterThan(0)
  })
})

describe('wind', () => {
  it('blows the way the pointer was dragged', () => {
    const grid = createGrid(21, 21)
    const cell = cellIndex(grid, 10, 10)
    placeMaterial(grid, cell, MaterialId.sand)

    wind(grid, 10, 10, 6, 3, -3)

    const motion = grid.velocity.get(cell)
    expect(motion?.vx).toBeGreaterThan(0)
    expect(motion?.vy).toBeLessThan(0)
  })

  it('does nothing without a drag to take a direction from', () => {
    const grid = createGrid(21, 21)
    placeMaterial(grid, cellIndex(grid, 10, 10), MaterialId.sand)

    wind(grid, 10, 10, 6, 0, 0)

    expect(grid.velocity.size).toBe(0)
  })
})

describe('temper', () => {
  it('warms and cools what is under the brush, hardest at the middle', () => {
    const grid = createGrid(21, 21)
    const middle = cellIndex(grid, 10, 10)
    const edge = cellIndex(grid, 15, 10)

    temper(grid, 10, 10, 6, true)

    expect(grid.temperature[middle]).toBeGreaterThan(grid.temperature[edge])
    expect(grid.temperature[edge]).toBeGreaterThan(AMBIENT_TEMPERATURE)

    temper(grid, 10, 10, 6, false)
    temper(grid, 10, 10, 6, false)

    expect(grid.temperature[middle]).toBeLessThan(AMBIENT_TEMPERATURE)
  })

  it('wakes the rows it touched, or the heat pass would skip them', () => {
    const grid = createGrid(21, 21)

    temper(grid, 10, 10, 4, true)

    expect(grid.hotRows[10]).toBe(1)
  })

  it('cannot be held down into a runaway temperature', () => {
    const grid = createGrid(21, 21)
    const middle = cellIndex(grid, 10, 10)

    for (let press = 0; press < 200; press++) temper(grid, 10, 10, 4, true)
    const ceiling = grid.temperature[middle]
    for (let press = 0; press < 200; press++) temper(grid, 10, 10, 4, false)

    expect(ceiling).toBeLessThan(2000)
    expect(grid.temperature[middle]).toBeGreaterThan(-273)
  })
})

describe('detonate', () => {
  it('leaves fire behind and throws what was around it', () => {
    const grid = createGrid(41, 41)
    const charge = cellIndex(grid, 20, 20)
    const neighbour = cellIndex(grid, 24, 20)
    placeMaterial(grid, charge, MaterialId.tnt)
    placeMaterial(grid, neighbour, MaterialId.sand)

    detonate(grid, charge, 20, 20)

    expect(grid.material[charge]).toBe(MATERIALS[MaterialId.tnt].explodes?.into)
    expect(grid.velocity.get(neighbour)?.vx).toBeGreaterThan(0)
  })

  it('gets a second charge hot enough to go off, which is what chains a line of them', () => {
    const grid = createGrid(41, 41)
    const first = cellIndex(grid, 20, 20)
    const second = cellIndex(grid, 26, 20)
    placeMaterial(grid, first, MaterialId.tnt)
    placeMaterial(grid, second, MaterialId.tnt)

    detonate(grid, first, 20, 20)

    const { explodes } = MATERIALS[MaterialId.tnt]
    expect(grid.temperature[second]).toBeGreaterThanOrEqual(explodes?.at ?? Infinity)
  })

  it('ignores a cell with no charge in it', () => {
    const grid = createGrid(21, 21)
    const cell = cellIndex(grid, 10, 10)
    placeMaterial(grid, cell, MaterialId.stone)

    detonate(grid, cell, 10, 10)

    expect(grid.material[cell]).toBe(MaterialId.stone)
    expect(grid.velocity.size).toBe(0)
  })
})

describe('flashOver', () => {
  it('shoves the surroundings without adding heat of its own', () => {
    const grid = createGrid(21, 21)
    const cell = cellIndex(grid, 12, 10)
    placeMaterial(grid, cell, MaterialId.sand)

    flashOver(grid, 10, 10)

    // The flame the gas just became is already the heat; this is only the bang.
    expect(grid.velocity.get(cell)?.vx).toBeGreaterThan(0)
    expect(grid.temperature[cell]).toBe(AMBIENT_TEMPERATURE)
  })
})

/** Total speed the world is carrying, which is what an explosion's size actually means. */
function totalMomentum(grid: Parameters<typeof detonate>[0]): number {
  let total = 0
  for (const { vx, vy } of grid.velocity.values()) total += Math.abs(vx) + Math.abs(vy)
  return total
}

describe('a charge you made bigger', () => {
  /** A world packed with sand, with a slab of TNT `thickness` cells deep buried in the middle. */
  function buried(thickness: number) {
    const grid = createGrid(81, 81)
    for (let i = 0; i < grid.material.length; i++) placeMaterial(grid, i, MaterialId.sand)

    const charges: number[] = []
    for (let y = 40; y < 40 + thickness; y++) {
      for (let x = 40; x < 48; x++) {
        const cell = cellIndex(grid, x, y)
        placeMaterial(grid, cell, MaterialId.tnt)
        charges.push(cell)
      }
    }
    return { grid, charges }
  }

  function fire(thickness: number): number {
    const { grid, charges } = buried(thickness)
    // A thick slab goes off as one: the first charge's heat pulse puts every other charge over its
    // threshold in the same pass.
    for (const cell of charges) {
      detonate(grid, cell, cell % grid.width, Math.floor(cell / grid.width))
    }
    return totalMomentum(grid)
  }

  it('hits harder the more of it there is', () => {
    const thin = fire(1)
    const thick = fire(8)

    // The complaint this guards: overlapping impulses compound, but a low speed cap threw the extra
    // away, so a slab eight cells deep landed like a single line of charges.
    expect(thick).toBeGreaterThan(thin * 3)
  })

  it('scales with how much of it there is, not just its outline', () => {
    const one = fire(2)
    const four = fire(8)

    expect(four / one).toBeGreaterThan(2)
  })
})

describe('blast reach', () => {
  it('moves a heap well below the surface it was aimed at', () => {
    const grid = createGrid(61, 61)
    for (let y = 30; y < 61; y++) {
      for (let x = 0; x < 61; x++) placeMaterial(grid, cellIndex(grid, x, y), MaterialId.gravel)
    }

    blast(grid, 30, 31, 1)

    // The smallest brush still has to do something: a force that falls off to nothing at a tiny rim
    // only ever moved the few cells right under the pointer.
    let deep = 0
    for (const index of grid.velocity.keys()) {
      if (Math.floor(index / grid.width) > 36) deep++
    }
    expect(deep).toBeGreaterThan(0)
  })
})
