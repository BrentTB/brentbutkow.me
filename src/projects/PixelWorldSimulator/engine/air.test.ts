import { describe, expect, it } from 'vitest'
import { Grid, MaterialId } from '../pixel-world.types'
import { cellIndex, createGrid, markHotRow, placeMaterial } from './grid'
import { AIR_MAX, airLean, canAirEnter, pushAir, simulateAir } from './air'
import { push } from './kinetic'
import { temper } from './forces'
import { createRng } from './rng'
import { tickWorld } from './tick'

/** An open world with a stone floor, so there is somewhere for a draught to bend against. */
function openWorld(width = 64, height = 64): Grid {
  const grid = createGrid(width, height)
  for (let x = 0; x < width; x++) {
    placeMaterial(grid, cellIndex(grid, x, height - 1), MaterialId.stone)
  }
  return grid
}

function airAt(grid: Grid, x: number, y: number): { x: number; y: number } {
  const at = cellIndex(grid, x, y)
  return { x: grid.airX[at], y: grid.airY[at] }
}

describe('where air can go', () => {
  it('fills open cells and gases but treats solids and liquids as walls', () => {
    expect(canAirEnter(MaterialId.empty)).toBe(true)
    expect(canAirEnter(MaterialId.smoke)).toBe(true)
    expect(canAirEnter(MaterialId.steam)).toBe(true)
    // A pool has to be able to sit under a gale without being blown out of its basin.
    expect(canAirEnter(MaterialId.water)).toBe(false)
    expect(canAirEnter(MaterialId.stone)).toBe(false)
    expect(canAirEnter(MaterialId.sand)).toBe(false)
  })

  it('refuses to hand air to a wall', () => {
    const grid = openWorld()
    const wall = cellIndex(grid, 10, grid.height - 1)

    pushAir(grid, wall, 5, -5)

    expect(grid.airX[wall]).toBe(0)
    expect(grid.airY[wall]).toBe(0)
  })
})

describe('a gust of air', () => {
  it('spreads to its neighbours instead of staying one fast pixel', () => {
    const grid = openWorld()
    pushAir(grid, cellIndex(grid, 32, 32), 6, 0)

    simulateAir(grid, 0)

    // The cells either side of it are moving now, which is what makes a plume out of a point source.
    expect(Math.abs(airAt(grid, 31, 32).x)).toBeGreaterThan(0)
    expect(Math.abs(airAt(grid, 33, 32).x)).toBeGreaterThan(0)
  })

  it('dies out completely rather than fading forever', () => {
    // The floor on the decay is load-bearing for chunk sleeping: air that only ever approaches zero keeps
    // every cell it touched awake for the life of the world.
    const grid = openWorld()
    pushAir(grid, cellIndex(grid, 32, 32), 6, -6)

    for (let tick = 0; tick < 400; tick++) simulateAir(grid, 0)

    let moving = 0
    for (let i = 0; i < grid.airX.length; i++) {
      if (grid.airX[i] !== 0 || grid.airY[i] !== 0) moving++
    }
    expect(moving).toBe(0)
  })

  it('never exceeds its speed limit however much is poured in', () => {
    const grid = openWorld()
    const middle = cellIndex(grid, 32, 32)
    for (let n = 0; n < 50; n++) pushAir(grid, middle, AIR_MAX * 3, -AIR_MAX * 3)

    simulateAir(grid, 0)

    for (let i = 0; i < grid.airX.length; i++) {
      expect(Math.abs(grid.airX[i])).toBeLessThanOrEqual(AIR_MAX)
      expect(Math.abs(grid.airY[i])).toBeLessThanOrEqual(AIR_MAX)
    }
  })

  it('does not leak through a wall it is blowing against', () => {
    const grid = openWorld()
    // A solid partition with open air on both sides.
    for (let y = 0; y < grid.height - 1; y++) {
      placeMaterial(grid, cellIndex(grid, 40, y), MaterialId.stone)
    }
    for (let y = 20; y < 40; y++) pushAir(grid, cellIndex(grid, 38, y), 9, 0)

    for (let tick = 0; tick < 40; tick++) simulateAir(grid, 0)

    // Nothing is moving on the far side of the partition.
    for (let y = 20; y < 40; y++) {
      expect(airAt(grid, 41, y).x).toBe(0)
      expect(airAt(grid, 42, y).x).toBe(0)
    }
  })
})

describe('air and the walls that appear in it', () => {
  it('stops dead in a cell something has just filled', () => {
    // A grain landing in a draught has to block it. Without clearing the field inside walls, the old speed
    // sits there inside solid material and leaks back out when the cell empties again.
    const grid = openWorld()
    const at = cellIndex(grid, 32, 32)
    pushAir(grid, at, 9, -9)
    placeMaterial(grid, at, MaterialId.stone)

    simulateAir(grid, 0)

    expect(grid.airX[at]).toBe(0)
    expect(grid.airY[at]).toBe(0)
  })
})

describe('heat raising a draught', () => {
  it('lifts warm air and drops cold air', () => {
    // Buoyancy is a property of the air itself, not of what is under it: a hot wall does not rise, it warms
    // the air beside it and the heat pass is what carries that warmth into the air.
    const warm = openWorld()
    const warmCell = cellIndex(warm, 32, 40)
    warm.temperature[warmCell] = 400
    markHotRow(warm, warmCell)

    const cold = openWorld()
    const coldCell = cellIndex(cold, 32, 40)
    cold.temperature[coldCell] = -100
    markHotRow(cold, coldCell)

    simulateAir(warm, 0)
    simulateAir(cold, 0)

    // Negative is upward.
    expect(airAt(warm, 32, 40).y).toBeLessThan(0)
    expect(airAt(cold, 32, 40).y).toBeGreaterThan(0)
  })

  it('leaves a room-temperature world perfectly still', () => {
    const grid = openWorld()
    for (let y = 40; y < grid.height - 1; y++) {
      for (let x = 10; x < 50; x++) placeMaterial(grid, cellIndex(grid, x, y), MaterialId.sand)
    }

    for (let tick = 0; tick < 20; tick++) simulateAir(grid, 0)

    for (let i = 0; i < grid.airX.length; i++) {
      expect(grid.airX[i]).toBe(0)
      expect(grid.airY[i]).toBe(0)
    }
  })
})

describe('the flow roughly conserves itself', () => {
  it('pulls air down at the sides of a rising column', () => {
    // The property the whole relaxation step exists for, and the one Brent asked for by name: blowing air
    // upward in the middle has to pull air down beside it, or a plume is just paint that appears from
    // nowhere and nothing around it ever moves.
    const grid = openWorld(96, 96)
    const column = 48
    for (let tick = 0; tick < 60; tick++) {
      for (let y = 60; y < 80; y++) pushAir(grid, cellIndex(grid, column, y), 0, -8)
      simulateAir(grid, 0)
    }

    // Somewhere off to the side of the column, air is heading down rather than up.
    let sinking = 0
    for (let y = 40; y < 80; y++) {
      for (const x of [column - 8, column - 6, column + 6, column + 8]) {
        if (airAt(grid, x, y).y > 0) sinking++
      }
    }
    expect(sinking).toBeGreaterThan(0)
  })
})

describe('air carrying material', () => {
  /** A grain of `material` sitting on the floor with a gale blowing across it. */
  function inAGale(material: MaterialId, ticks = 12) {
    const grid = openWorld()
    const at = cellIndex(grid, 20, grid.height - 2)
    placeMaterial(grid, at, material)

    for (let tick = 0; tick < ticks; tick++) {
      for (let y = grid.height - 6; y < grid.height - 1; y++) {
        for (let x = 5; x < 60; x++) pushAir(grid, cellIndex(grid, x, y), 9, 0)
      }
      simulateAir(grid, 0)
    }
    return grid
  }

  it('picks up something light', () => {
    const grid = inAGale(MaterialId.ash)
    const at = cellIndex(grid, 20, grid.height - 2)

    expect(grid.velocity.get(at)?.vx).toBeGreaterThan(0)
  })

  it('leaves a wall where it is, however hard it blows', () => {
    // Static material is the world's scaffolding. A stone wall that blew away in a draught would make
    // anything you built worthless.
    const grid = inAGale(MaterialId.stone)
    const at = cellIndex(grid, 20, grid.height - 2)

    expect(grid.velocity.has(at)).toBe(false)
  })

  it('leaves a pool alone in a draught, and only a device or a gale reaches it', () => {
    // Water is no longer exempt outright, because a device that cannot stir a pool is a disappointment. What
    // keeps it in its basin is the density-scaled bar in `carry`: a draught strong enough to be worth drawing
    // still does not touch it. A gale clears that bar, and so does a blast pushing air straight at it.
    const grid = openWorld()
    const at = cellIndex(grid, 20, grid.height - 2)
    placeMaterial(grid, at, MaterialId.water)
    for (let i = 0; i < grid.airX.length; i++) grid.airX[i] = 5

    simulateAir(grid, 0)

    expect(grid.velocity.has(at)).toBe(false)
  })

  it('ignores a draught too gentle to shift anything', () => {
    // Below the grab threshold the field is only something to look at. Without a floor, the faintest
    // breath of air would keep every loose grain in the world permanently airborne.
    const grid = openWorld()
    const at = cellIndex(grid, 20, grid.height - 2)
    placeMaterial(grid, at, MaterialId.sand)
    pushAir(grid, at, 0.6, 0)

    simulateAir(grid, 0)

    expect(grid.velocity.has(at)).toBe(false)
  })

  it('never brakes something already outrunning the flow', () => {
    // The gap to the flow is only applied where it points the way the air is going. Letting it act in
    // reverse turns air into a brake, and it measurably flattened explosions: debris thrown out of a blast
    // is always faster than the draught chasing it.
    const grid = openWorld()
    const at = cellIndex(grid, 32, 32)
    placeMaterial(grid, at, MaterialId.ash)
    push(grid, at, 9, 0)
    pushAir(grid, at, 3, 0)
    const before = grid.velocity.get(at)?.vx ?? 0

    simulateAir(grid, 0)

    expect(grid.velocity.get(at)?.vx ?? 0).toBeGreaterThanOrEqual(before)
  })

  it('carries a light grain further than a heavy one from the same gale', () => {
    const light = inAGale(MaterialId.ash)
    const heavy = inAGale(MaterialId.gravel)
    const at = cellIndex(light, 20, light.height - 2)

    const lightSpeed = light.velocity.get(at)?.vx ?? 0
    const heavySpeed = heavy.velocity.get(at)?.vx ?? 0
    expect(lightSpeed).toBeGreaterThan(heavySpeed)
  })
})

describe('a gas leaning into the flow', () => {
  it('reports which way the air is going, and nothing when it is still', () => {
    const grid = openWorld()
    const at = cellIndex(grid, 32, 32)

    expect(airLean(grid, at)).toBe(0)
    pushAir(grid, at, 4, 0)
    expect(airLean(grid, at)).toBe(1)
    pushAir(grid, at, -8, 0)
    expect(airLean(grid, at)).toBe(-1)
  })
})

describe('which way heat blows the air', () => {
  /** Net vertical air over a stretch of one column, negative meaning upward. */
  function columnAir(grid: Grid, x: number, from: number, to: number): number {
    let total = 0
    for (let y = from; y <= to; y++) total += grid.airY[cellIndex(grid, x, y)]
    return total
  }

  function afterTempering(warming: boolean): Grid {
    const grid = createGrid(81, 81)
    for (let x = 0; x < grid.width; x++) {
      placeMaterial(grid, cellIndex(grid, x, 80), MaterialId.stone)
    }
    const rng = createRng(1)
    for (let tick = 0; tick < 60; tick++) {
      temper(grid, 40, 50, 8, warming)
      tickWorld(grid, rng, tick)
    }
    return grid
  }

  it('sends warm air up and cold air down', () => {
    // The complaint this guards: the chill tool blew gas upward, and harder than the heat tool did. Buoyancy
    // was comparing a cell with the one above it, and the cell below anything chilled is hotter than the cold
    // cell above it, so cooling raised an updraught underneath itself.
    expect(columnAir(afterTempering(true), 40, 40, 60)).toBeLessThan(0)
    expect(columnAir(afterTempering(false), 40, 40, 60)).toBeGreaterThan(0)
  })

  it('raises a draught over something molten', () => {
    const grid = createGrid(81, 81)
    for (let x = 0; x < grid.width; x++) {
      placeMaterial(grid, cellIndex(grid, x, 80), MaterialId.stone)
    }
    for (let x = 36; x < 45; x++) placeMaterial(grid, cellIndex(grid, x, 79), MaterialId.lava)

    const rng = createRng(1)
    for (let tick = 0; tick < 60; tick++) tickWorld(grid, rng, tick)

    expect(columnAir(grid, 40, 60, 78)).toBeLessThan(0)
  })
})

describe('what the flow is allowed to pick up', () => {
  it('leaves a gas to follow the flow by its own rules', () => {
    // A gas already leans downwind through `airLean`, so handing it momentum as well puts every cell of a
    // cloud into the kinetic map. A burning field of methane took the movement pass from a fraction of a
    // millisecond to 46 of them, and the gas stopped obeying its own rules on the way.
    const grid = openWorld()
    for (let y = 30; y < 50; y++) {
      for (let x = 20; x < 45; x++) placeMaterial(grid, cellIndex(grid, x, y), MaterialId.smoke)
    }
    grid.airX.fill(AIR_MAX)
    grid.airY.fill(-AIR_MAX)

    simulateAir(grid, 0)

    expect(grid.velocity.size).toBe(0)
  })

  it('only steers something already travelling, not a grain that just came unstuck', () => {
    // The complaint this guards: loose dirt on the side of the volcano flew *up* the slope and settled on the
    // summit. The low bar exists to curve blast debris crossing the world, and it keyed on being unsupported
    // — so the instant a grain came unstuck it went weightless, the vent's convection carried it up and
    // inward at a flow of five to ten, dropped it, and picked it up again about twice a tick.
    function nudged(startSpeed: number): number {
      const grid = openWorld()
      const grain = cellIndex(grid, 32, 40)
      placeMaterial(grid, grain, MaterialId.dirt)
      push(grid, grain, startSpeed, 0)
      // A convection draught: real, but nowhere near a gale.
      for (let i = 0; i < grid.airX.length; i++) grid.airY[i] = -6

      simulateAir(grid, 0)

      return grid.velocity.get(grain)?.vy ?? 0
    }

    // Barely moving: the draught leaves it alone and gravity gets to have its way.
    expect(nudged(0.5)).toBe(0)
    // Genuinely travelling: the draught curves it, which is what makes an explosion look like one.
    expect(nudged(8)).toBeLessThan(0)
  })

  it('needs a gale to tear something loose from the ground, not a draught', () => {
    // The complaint this guards: gravel around an overflowing volcano hopped in place forever. A grain
    // resting on something with a whisper of a draught over it was handed momentum every tick, dropped for
    // being too slow to keep, and handed it again — so it never settled.
    const grid = openWorld()
    const floor = grid.height - 1
    for (let x = 0; x < grid.width; x++) {
      placeMaterial(grid, cellIndex(grid, x, floor), MaterialId.stone)
    }
    const grain = cellIndex(grid, 32, floor - 1)
    placeMaterial(grid, grain, MaterialId.gravel)

    // It is already in the map, barely moving, and resting on the floor — which is the state the old rule
    // topped up every tick, because it keyed on having momentum rather than on having support.
    push(grid, grain, 0.1, 0)
    for (let i = 0; i < grid.airX.length; i++) grid.airX[i] = 3
    simulateAir(grid, 0)

    expect(grid.velocity.get(grain)?.vx).toBeCloseTo(0.1)

    // A real gale does move it.
    for (let i = 0; i < grid.airX.length; i++) grid.airX[i] = AIR_MAX
    simulateAir(grid, 0)

    expect(grid.velocity.has(grain)).toBe(true)
  })
})

describe('the flow runs on its own clock', () => {
  it('leaves the field alone on the ticks between, but still carries material', () => {
    // The field is smooth and slow, so recomputing it every tick was most of what air cost: on a world of
    // loose powder over lava the whole tick ran 10.1 ms against 7.8 ms with no air at all. The coupling has to
    // stay every-tick though, or a blast would not throw anything until the tick after it fired.
    const grid = openWorld()
    const grain = cellIndex(grid, 32, 40)
    placeMaterial(grid, grain, MaterialId.dirt)
    push(grid, grain, 9, 0)
    for (let i = 0; i < grid.airX.length; i++) grid.airY[i] = -AIR_MAX

    // An odd tick: the field must not evolve, and the grain must still be steered.
    const before = grid.airY[cellIndex(grid, 32, 20)]
    simulateAir(grid, 1)

    expect(grid.airY[cellIndex(grid, 32, 20)]).toBe(before)
    expect(grid.velocity.get(grain)?.vy ?? 0).toBeLessThan(0)
  })

  it('does evolve the field on the ticks it owns', () => {
    const grid = openWorld()
    const middle = cellIndex(grid, 32, 40)
    pushAir(grid, middle, 0, -AIR_MAX)

    const before = grid.airY[cellIndex(grid, 32, 39)]
    simulateAir(grid, 0)

    // The draught has spread into its neighbour, which only the field passes do.
    expect(grid.airY[cellIndex(grid, 32, 39)]).not.toBe(before)
  })
})

describe('how much wind a material needs', () => {
  /** Grains of `material` on the floor, left in a steady breeze, and how many left the cell they started in. */
  function inABreeze(material: MaterialId, flow: number): { gone: number; of: number } {
    const grid = createGrid(200, 60)
    for (let x = 0; x < grid.width; x++) {
      placeMaterial(grid, cellIndex(grid, x, grid.height - 1), MaterialId.stone)
    }
    // Spaced out: a solid row cannot move sideways into itself, equal densities being unable to displace
    // each other, so a packed row would only ever lose its ends.
    const grains: number[] = []
    for (let x = 40; x < 160; x += 3) {
      const at = cellIndex(grid, x, grid.height - 2)
      placeMaterial(grid, at, material)
      grains.push(at)
    }

    const rng = createRng(1)
    for (let tick = 0; tick < 40; tick++) {
      for (let i = 0; i < grid.airX.length; i++) grid.airX[i] = flow
      tickWorld(grid, rng, tick)
    }

    let gone = 0
    for (const at of grains) if (grid.material[at] !== material) gone++
    return { gone, of: grains.length }
  }

  it('carries pollen on a breeze that leaves sand exactly where it is', () => {
    // Both bars in `carry` scale with how light a material is. Without that they are one absolute number, so
    // the lightest thing in the world needs the same gale as gravel and pollen simply never moves.
    const breeze = 4

    const pollen = inABreeze(MaterialId.pollen, breeze)
    expect(pollen.gone).toBeGreaterThan(pollen.of / 2)
    // Not a single grain: the same breeze has to leave ordinary ground alone, which is what stopped a lava
    // pool plucking the dirt above it and loose dirt climbing the volcano.
    expect(inABreeze(MaterialId.sand, breeze).gone).toBe(0)
  })
})
