import { describe, it, expect } from 'vitest'
import { MaterialId } from '../pixel-world.types'
import { AMBIENT_TEMPERATURE, TEMPERATURE_LIMITS } from '../data'
import { cellIndex, createGrid, placeMaterial } from './grid'
import { attract, blast, detonate, flashOver, swallow, swirl, temper, wind } from './forces'
import { MATERIALS } from './materials'
import { simulateHeat } from './heat'
import { countMaterials } from './census'

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

  it('sets a lava pool held under the chill tool, not only its edges', () => {
    // Lava is defended twice over: its own furnace reheats it and the pool around it conducts heat back
    // in. A flat step lost that fight — a pool held under the brush settled 55° above its freezing point
    // and never set, so only the rim, with fewer hot neighbours, ever turned to stone.
    const grid = createGrid(60, 40)
    for (let y = 0; y < 40; y++) {
      for (let x = 0; x < 60; x++) placeMaterial(grid, cellIndex(grid, x, y), MaterialId.lava)
    }

    for (let held = 0; held < 30; held++) {
      temper(grid, 30, 20, 6, false)
      simulateHeat(grid)
    }

    expect(grid.material[cellIndex(grid, 30, 20)]).toBe(MaterialId.stone)
    expect(countMaterials(grid)[MaterialId.stone]).toBeGreaterThan(100)
  })

  it('keeps its gentle step on material already at room temperature', () => {
    // The extra grip scales with how far a cell sits from room temperature, so ordinary material feels
    // exactly as it did. Scaling by the distance to the tool's limit instead put one tap of heat on cold
    // water at 375°, which boiled a pool on a single click.
    const grid = createGrid(21, 21)
    placeMaterial(grid, cellIndex(grid, 10, 10), MaterialId.water)

    temper(grid, 10, 10, 4, true)

    expect(grid.temperature[cellIndex(grid, 10, 10)]).toBeLessThan(AMBIENT_TEMPERATURE + 120)
  })

  it('cannot be held down into a runaway temperature', () => {
    const grid = createGrid(21, 21)
    const middle = cellIndex(grid, 10, 10)

    for (let press = 0; press < 200; press++) temper(grid, 10, 10, 4, true)
    const ceiling = grid.temperature[middle]
    for (let press = 0; press < 200; press++) temper(grid, 10, 10, 4, false)

    // Against the shared limits rather than copies of their values: the snapshot decoder clamps incoming
    // temperatures to the same pair, so they live in `data.ts` and a retune moves both at once.
    expect(ceiling).toBe(TEMPERATURE_LIMITS.ceiling)
    expect(grid.temperature[middle]).toBe(TEMPERATURE_LIMITS.floor)
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

describe('a charge going off', () => {
  /** Furthest cell from the centre that the blast moved or heated. */
  function blastReach(material: MaterialId): number {
    const grid = createGrid(81, 81)
    placeMaterial(grid, cellIndex(grid, 40, 40), material)
    // Sand all around, so anything the blast touches shows up as a moved cell.
    for (let y = 0; y < 81; y++) {
      for (let x = 0; x < 81; x++) {
        if (x !== 40 || y !== 40) placeMaterial(grid, cellIndex(grid, x, y), MaterialId.sand)
      }
    }

    detonate(grid, cellIndex(grid, 40, 40), 40, 40)

    let furthest = 0
    for (const index of grid.velocity.keys()) {
      const x = index % grid.width
      const y = Math.floor(index / grid.width)
      furthest = Math.max(furthest, Math.hypot(x - 40, y - 40))
    }
    return furthest
  }

  it('reaches at least as far as the smallest disc a force works over', () => {
    // `explodes.radius` is a lower bound, not the whole story: `MIN_REACH` floors it, so gunpowder asks for 5
    // and gets 12. Cutting it to the stated 5 is faster and stopped it throwing a sand bed at all.
    const gunpowder = MATERIALS[MaterialId.gunpowder].explodes
    expect(gunpowder?.radius).toBeLessThan(12)

    expect(blastReach(MaterialId.gunpowder)).toBeGreaterThan(gunpowder?.radius ?? 0)
  })

  it('still lets a big charge reach as far as it says', () => {
    const tnt = MATERIALS[MaterialId.tnt].explodes
    const reach = blastReach(MaterialId.tnt)

    expect(reach).toBeGreaterThan(20)
    expect(reach).toBeLessThanOrEqual(tnt?.radius ?? 0)
  })

  it('keeps the pointer blast on its floor, which is what that floor is for', () => {
    const grid = createGrid(81, 81)
    for (let y = 0; y < 81; y++) {
      for (let x = 0; x < 81; x++) placeMaterial(grid, cellIndex(grid, x, y), MaterialId.sand)
    }

    // The smallest brush there is: the floor is what gives it somewhere to push.
    blast(grid, 40, 40, 1)

    let furthest = 0
    for (const index of grid.velocity.keys()) {
      const x = index % grid.width
      const y = Math.floor(index / grid.width)
      furthest = Math.max(furthest, Math.hypot(x - 40, y - 40))
    }
    expect(furthest).toBeGreaterThan(8)
  })

  it('wakes every row it heated, so the heat pass does not skip the blast', () => {
    const grid = createGrid(81, 81)
    placeMaterial(grid, cellIndex(grid, 40, 40), MaterialId.tnt)
    grid.hotRows.fill(0)

    detonate(grid, cellIndex(grid, 40, 40), 40, 40)

    const radius = MATERIALS[MaterialId.tnt].explodes?.radius ?? 0
    for (let row = 40 - radius; row <= 40 + radius; row++) {
      expect(grid.hotRows[row], `row ${row} left asleep`).toBe(1)
    }
  })
})

describe('a charge going off', () => {
  /** A block of charge buried under a bed of sand, the way somebody actually lights one. */
  function buriedUnderSand(charge: MaterialId) {
    const grid = createGrid(81, 61)
    for (let x = 0; x < 81; x++) placeMaterial(grid, cellIndex(grid, x, 60), MaterialId.stone)
    for (let y = 20; y < 45; y++) {
      for (let x = 0; x < 81; x++) placeMaterial(grid, cellIndex(grid, x, y), MaterialId.sand)
    }
    for (let y = 45; y < 51; y++) {
      for (let x = 34; x < 46; x++) placeMaterial(grid, cellIndex(grid, x, y), charge)
    }
    return grid
  }

  /** How far up the fastest thrown sand is going, as a negative number of cells per tick. */
  function fastestUpward(grid: ReturnType<typeof createGrid>) {
    let fastest = 0
    for (const [index, motion] of grid.velocity) {
      if (grid.material[index] !== MaterialId.sand) continue
      fastest = Math.min(fastest, motion.vy)
    }
    return fastest
  }

  it('throws the bed above it upward, which is what makes it an explosion', () => {
    // The complaint this guards: with the blast cut down — either to the radius the table states, or by
    // skipping charges inside another blast — a lit block under sand stopped throwing anything. It scorched
    // the bed and the sand fell back in. Both were much faster and both were wrong.
    const grid = buriedUnderSand(MaterialId.gunpowder)

    for (const cell of [...grid.velocity.keys()]) grid.velocity.delete(cell)
    for (let y = 45; y < 51; y++) {
      for (let x = 34; x < 46; x++) detonate(grid, cellIndex(grid, x, y), x, y)
    }

    expect(fastestUpward(grid)).toBeLessThan(-2)
  })

  it('throws harder from a bigger charge', () => {
    const small = buriedUnderSand(MaterialId.gunpowder)
    detonate(small, cellIndex(small, 40, 45), 40, 45)
    const big = buriedUnderSand(MaterialId.tnt)
    detonate(big, cellIndex(big, 40, 45), 40, 45)

    expect(fastestUpward(big)).toBeLessThan(fastestUpward(small))
  })
})

describe('the tools writing into the air', () => {
  it('makes the wind tool blow a draught, not only shove the grains under it', () => {
    // What makes it wind rather than a hand: the flow it leaves behind keeps working after the drag stops,
    // and bends around whatever is in the way.
    const grid = createGrid(61, 61)

    wind(grid, 30, 30, 6, 8, 0)

    let moving = 0
    for (let i = 0; i < grid.airX.length; i++) if (grid.airX[i] > 0) moving++
    expect(moving).toBeGreaterThan(0)
  })

  it('shoves air far beyond the debris a blast throws', () => {
    // The complaint this guards: the draught was written over the same disc as the impulse, so it only ever
    // overlapped a couple of hundred of the tens of thousands of cells a blast puts in the air. Turning the
    // whole field off changed nothing you could see.
    const grid = createGrid(201, 201)
    const centre = 100
    const radius = 6

    blast(grid, centre, centre, radius)

    // Air is moving well outside the disc the blast itself reached.
    let farthest = 0
    for (let y = 0; y < grid.height; y++) {
      for (let x = 0; x < grid.width; x++) {
        const at = cellIndex(grid, x, y)
        if (grid.airX[at] === 0 && grid.airY[at] === 0) continue
        farthest = Math.max(farthest, Math.hypot(x - centre, y - centre))
      }
    }
    const blastReach = Math.max(radius, 12)
    expect(farthest).toBeGreaterThan(blastReach * 2)
  })

  it('stirs the air when a gas flashes over, because a shove leaves a draught', () => {
    // A flash-over is a shove, and the air-gust gate turns any shove into a draught. Without it the flow
    // stays dead and the flame the gas becomes rises through still air.
    const grid = createGrid(61, 61)

    flashOver(grid, 30, 30)

    let stirred = false
    for (let i = 0; i < grid.airX.length; i++) {
      if (grid.airX[i] !== 0 || grid.airY[i] !== 0) {
        stirred = true
        break
      }
    }
    expect(stirred).toBe(true)
  })

  it('leaves the air alone when only heat is applied, with no shove behind it', () => {
    // `temper` moves heat and nothing else, so there is no shove to become a draught.
    const grid = createGrid(61, 61)

    temper(grid, 30, 30, 6, true)

    for (let i = 0; i < grid.airX.length; i++) {
      expect(grid.airX[i]).toBe(0)
      expect(grid.airY[i]).toBe(0)
    }
  })
})

describe('swallow', () => {
  it('drags everything loose inward and leaves the scaffolding alone', () => {
    const grid = createGrid(61, 61)
    const loose = cellIndex(grid, 42, 30)
    const wall = cellIndex(grid, 18, 30)
    placeMaterial(grid, loose, MaterialId.sand)
    placeMaterial(grid, wall, MaterialId.stone)

    swallow(grid, 30, 30)

    expect(grid.velocity.get(loose)?.vx ?? 0).toBeLessThan(0)
    // A stone wall being sucked in would make every build site a hazard.
    expect(grid.velocity.has(wall)).toBe(false)
  })
})

describe('swirl', () => {
  it('turns the air around a point rather than blowing it outward', () => {
    const grid = createGrid(61, 61)

    swirl(grid, 30, 30, 12)

    // Above the middle the flow runs sideways, and below it runs the other way: that is a circle rather than
    // a blast. A blast would point away from the centre at both.
    const above = cellIndex(grid, 30, 22)
    const below = cellIndex(grid, 30, 38)
    expect(Math.abs(grid.airX[above])).toBeGreaterThan(Math.abs(grid.airY[above]))
    expect(Math.sign(grid.airX[above])).not.toBe(Math.sign(grid.airX[below]))
  })

  it('writes into the air and not into material', () => {
    const grid = createGrid(61, 61)
    const grain = cellIndex(grid, 38, 30)
    placeMaterial(grid, grain, MaterialId.sand)

    swirl(grid, 30, 30, 12)

    // The flow carries things; the coupling rules in `carry` decide what is light enough to go.
    expect(grid.velocity.size).toBe(0)
  })
})
