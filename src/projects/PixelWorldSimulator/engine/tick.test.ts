import { describe, it, expect } from 'vitest'
import { Grid, MaterialId } from '../pixel-world.types'
import { AMBIENT_TEMPERATURE } from '../data'
import { stampCircle } from './brush'
import { cellIndex, createGrid, placeMaterial } from './grid'
import { createRng } from './rng'
import { tickWorld } from './tick'
import { MATERIALS } from './materials'
import { push } from './kinetic'

function put(grid: Grid, x: number, y: number, material: MaterialId): number {
  const index = cellIndex(grid, x, y)
  placeMaterial(grid, index, material)
  return index
}

function run(grid: Grid, ticks: number, seed = 2024): void {
  const rng = createRng(seed)
  for (let tick = 0; tick < ticks; tick++) tickWorld(grid, rng, tick)
}

function count(grid: Grid, material: MaterialId): number {
  return grid.material.reduce((total, cell) => (cell === material ? total + 1 : total), 0)
}

/** Stone floor and side walls. */
function withVessel(width: number, height: number): Grid {
  const grid = createGrid(width, height)
  for (let x = 0; x < width; x++) put(grid, x, height - 1, MaterialId.stone)
  for (let y = 0; y < height; y++) {
    put(grid, 0, y, MaterialId.stone)
    put(grid, width - 1, y, MaterialId.stone)
  }
  return grid
}

describe('tickWorld', () => {
  it('reproduces a run exactly from the same seed', () => {
    const build = () => {
      const grid = withVessel(30, 24)
      for (let x = 4; x < 26; x++) put(grid, x, 20, MaterialId.water)
      for (let x = 10; x < 16; x++) put(grid, x, 4, MaterialId.lava)
      for (let x = 20; x < 25; x++) put(grid, x, 18, MaterialId.wood)
      put(grid, 6, 6, MaterialId.acid)
      return grid
    }

    const first = build()
    const second = build()
    run(first, 300, 5150)
    run(second, 300, 5150)

    expect(Array.from(first.material)).toEqual(Array.from(second.material))
    expect(Array.from(first.temperature)).toEqual(Array.from(second.temperature))
  })

  it('crusts lava into stone and flashes the water to steam', () => {
    const grid = withVessel(24, 20)
    for (let x = 1; x < 23; x++) {
      for (let y = 12; y < 19; y++) put(grid, x, y, MaterialId.water)
    }
    for (let x = 10; x < 14; x++) put(grid, x, 2, MaterialId.lava)

    run(grid, 400)

    expect(count(grid, MaterialId.lava)).toBe(0)
    expect(count(grid, MaterialId.stone)).toBeGreaterThan(24 + 2 * 20 - 4)
    expect(count(grid, MaterialId.steam) + count(grid, MaterialId.water)).toBeGreaterThan(0)
  })

  it('lets a plant catch water held against the gap under it', () => {
    const grid = withVessel(20, 20)
    for (let x = 8; x < 12; x++) {
      for (let y = 10; y < 13; y++) put(grid, x, y, MaterialId.plant)
    }
    const plantBefore = count(grid, MaterialId.plant)

    // Holding the water brush against its underside, through the brush so the paint hierarchy applies.
    // Gravity clears the drop on every movement pass, so the plant only ever sees it in the window
    // before the world moves.
    const rng = createRng(2024)
    for (let tick = 0; tick < 20; tick++) {
      stampCircle(grid, 9, 13, 1, MaterialId.water)
      tickWorld(grid, rng, tick)
    }

    // Stepping before the reactions left the drop a row lower than the plant every single tick, so no
    // amount of pouring could ever close the gap.
    expect(count(grid, MaterialId.plant)).toBeGreaterThan(plantBefore)
  })

  it('lets ice catch water held against the gap under it', () => {
    const grid = withVessel(20, 20)
    for (let x = 8; x < 12; x++) {
      for (let y = 10; y < 13; y++) put(grid, x, y, MaterialId.ice)
    }
    const iceBefore = count(grid, MaterialId.ice)

    const rng = createRng(2024)
    for (let tick = 0; tick < 20; tick++) {
      stampCircle(grid, 9, 13, 1, MaterialId.water)
      tickWorld(grid, rng, tick)
    }

    expect(count(grid, MaterialId.ice)).toBeGreaterThan(iceBefore)
  })

  it('spreads frost at a steady creep rather than in pulses', () => {
    const grid = withVessel(40, 30)
    for (let x = 1; x < 39; x++) {
      for (let y = 20; y < 29; y++) put(grid, x, y, MaterialId.water)
    }
    put(grid, 20, 24, MaterialId.ice)

    // Frozen cells per half second. One shared cooldown phase-locks the sheet: batches freeze together,
    // rest together, and wake together, which reads as a pulse rather than as ice creeping.
    const perWindow: number[] = []
    let previous = 1
    const rng = createRng(5)
    for (let tick = 1; tick <= 900; tick++) {
      tickWorld(grid, rng, tick)
      if (tick % 30 !== 0) continue
      const ice = count(grid, MaterialId.ice)
      perWindow.push(ice - previous)
      previous = ice
    }

    const busiest = Math.max(...perWindow)
    const quietWindows = perWindow.filter((frozen) => frozen === 0).length
    expect(busiest).toBeLessThan(20)
    expect(quietWindows).toBeLessThan(4)
  })

  it('turns a splash of lava into stone when it lands in a pool', () => {
    const grid = withVessel(30, 24)
    for (let x = 1; x < 29; x++) {
      for (let y = 10; y < 23; y++) put(grid, x, y, MaterialId.water)
    }
    const stoneBefore = count(grid, MaterialId.stone)
    for (let x = 14; x < 17; x++) put(grid, x, 2, MaterialId.lava)

    run(grid, 500)

    expect(count(grid, MaterialId.lava)).toBe(0)
    expect(count(grid, MaterialId.stone)).toBeGreaterThan(stoneBefore)
  })

  it('lets steam drift away from where it boiled instead of flickering in place', () => {
    const grid = withVessel(24, 30)
    for (let x = 1; x < 23; x++) {
      for (let y = 20; y < 29; y++) put(grid, x, y, MaterialId.water)
    }
    for (let x = 10; x < 14; x++) put(grid, x, 28, MaterialId.lava)

    run(grid, 200)

    const steamTop = highestRow(grid, MaterialId.steam)
    expect(steamTop).not.toBeNull()
    // Steam that condensed the instant it cooled never left the cell it boiled from.
    expect(steamTop ?? 30).toBeLessThan(19)
  })

  it('keeps an ice block through a long run at room temperature', () => {
    const grid = withVessel(20, 20)
    for (let x = 6; x < 14; x++) {
      for (let y = 14; y < 19; y++) put(grid, x, y, MaterialId.ice)
    }
    const iceBefore = count(grid, MaterialId.ice)

    run(grid, 1200)

    expect(count(grid, MaterialId.ice)).toBe(iceBefore)
  })

  it('dissolves the powder acid is poured onto without waiting to get underneath it', () => {
    const grid = withVessel(20, 24)
    for (let x = 1; x < 19; x++) {
      for (let y = 16; y < 23; y++) put(grid, x, y, MaterialId.ash)
    }
    const ashBefore = count(grid, MaterialId.ash)
    put(grid, 10, 15, MaterialId.acid)

    run(grid, 60)

    expect(count(grid, MaterialId.ash)).toBeLessThan(ashBefore)
  })

  it('runs fire along a row of wood and leaves ash behind', () => {
    const grid = withVessel(30, 12)
    for (let x = 2; x < 28; x++) put(grid, x, 10, MaterialId.wood)
    put(grid, 2, 9, MaterialId.fire)

    run(grid, 900)

    expect(count(grid, MaterialId.wood)).toBe(0)
    expect(count(grid, MaterialId.ash)).toBeGreaterThan(10)
  })

  it('leaves wood alone with no ignition source', () => {
    const grid = withVessel(20, 12)
    for (let x = 2; x < 18; x++) put(grid, x, 10, MaterialId.wood)

    run(grid, 600)

    expect(count(grid, MaterialId.wood)).toBe(16)
    expect(count(grid, MaterialId.ash)).toBe(0)
  })

  it('floats oil on top of water', () => {
    const grid = withVessel(12, 20)
    for (let x = 1; x < 11; x++) {
      for (let y = 10; y < 19; y++) put(grid, x, y, MaterialId.water)
      put(grid, x, 2, MaterialId.oil)
      put(grid, x, 3, MaterialId.oil)
    }

    run(grid, 800)

    const lowestOil = lowestRow(grid, MaterialId.oil)
    const highestWater = highestRow(grid, MaterialId.water)
    expect(highestWater).not.toBeNull()
    expect(lowestOil).toBeLessThanOrEqual(highestWater ?? 0)
  })

  it('sends gas up and out through water', () => {
    const grid = withVessel(12, 20)
    for (let x = 1; x < 11; x++) {
      for (let y = 4; y < 19; y++) put(grid, x, y, MaterialId.water)
    }
    put(grid, 6, 17, MaterialId.methane)

    run(grid, 200)

    const methane = highestRow(grid, MaterialId.methane)
    expect(methane === null || methane < 5).toBe(true)
  })

  it('burns a pool of oil off and leaves nothing behind', () => {
    const grid = withVessel(16, 12)
    for (let x = 1; x < 15; x++) put(grid, x, 10, MaterialId.oil)
    put(grid, 7, 9, MaterialId.fire)

    run(grid, 900)

    expect(count(grid, MaterialId.oil)).toBe(0)
  })

  it('melts an ice block into water', () => {
    const grid = withVessel(12, 12)
    for (let x = 4; x < 8; x++) put(grid, x, 10, MaterialId.ice)
    for (let x = 4; x < 8; x++) put(grid, x, 9, MaterialId.lava)

    run(grid, 500)

    expect(count(grid, MaterialId.ice)).toBe(0)
  })
})

function highestRow(grid: Grid, material: MaterialId): number | null {
  for (let y = 0; y < grid.height; y++) {
    for (let x = 0; x < grid.width; x++) {
      if (grid.material[cellIndex(grid, x, y)] === material) return y
    }
  }
  return null
}

function lowestRow(grid: Grid, material: MaterialId): number {
  for (let y = grid.height - 1; y >= 0; y--) {
    for (let x = 0; x < grid.width; x++) {
      if (grid.material[cellIndex(grid, x, y)] === material) return y
    }
  }
  return -1
}

describe('snow', () => {
  it('melts at room temperature, where ice does not', () => {
    const grid = withVessel(9, 9)
    const snow = put(grid, 4, 4, MaterialId.snow)
    const ice = put(grid, 6, 6, MaterialId.ice)

    run(grid, 600)

    expect(grid.material[snow]).not.toBe(MaterialId.snow)
    expect(grid.material[ice]).toBe(MaterialId.ice)
  })
})

describe('liquid nitrogen', () => {
  it('freezes water it lands in', () => {
    const grid = withVessel(12, 14)
    for (let x = 1; x < 11; x++) {
      for (let y = 8; y < 13; y++) put(grid, x, y, MaterialId.water)
    }
    for (let x = 4; x < 8; x++) put(grid, x, 2, MaterialId.nitrogen)

    run(grid, 150)

    expect(count(grid, MaterialId.ice)).toBeGreaterThan(0)
  })

  it('boils away from the surface, so a spill does not last but a puddle outlives a splash', () => {
    const lifespan = (cells: number) => {
      const grid = withVessel(20, 20)
      // A compact blob, so the middle of the bigger one is shielded by its own nitrogen.
      const side = Math.round(Math.sqrt(cells))
      for (let x = 0; x < side; x++) {
        for (let y = 0; y < side; y++) put(grid, 8 + x, 17 - y, MaterialId.nitrogen)
      }

      const rng = createRng(11)
      for (let tick = 0; tick < 6000; tick++) {
        tickWorld(grid, rng, tick)
        if (count(grid, MaterialId.nitrogen) === 0) return tick
      }
      return Infinity
    }

    const splash = lifespan(1)
    const puddle = lifespan(36)

    expect(splash).toBeLessThan(Infinity)
    expect(puddle).toBeLessThan(Infinity)
    // Evaporation is a surface effect, so the sheltered middle of a puddle lasts far longer than a
    // lone drop. A lifetime clock made every cell vanish on the same tick however deep the spill was.
    expect(puddle).toBeGreaterThan(splash * 2)
  })
})

describe('metal', () => {
  it('carries heat far better than stone', () => {
    const reach = (material: MaterialId) => {
      const grid = createGrid(20, 5)
      for (let x = 0; x < 20; x++) put(grid, x, 2, material)

      // A blowtorch on one end, held below metal's melting point so the bar stays a bar. Compared
      // against stone rather than wood: at this temperature wood catches fire and the flame front
      // carries the heat along the bar, which is combustion, not conduction.
      const rng = createRng(3)
      for (let tick = 0; tick < 200; tick++) {
        grid.temperature[cellIndex(grid, 19, 2)] = 600
        grid.hotRows.fill(1)
        tickWorld(grid, rng, tick)
      }
      return grid.temperature[cellIndex(grid, 10, 2)]
    }

    expect(reach(MaterialId.metal)).toBeGreaterThan(reach(MaterialId.stone))
  })

  it('melts into lava when hot enough', () => {
    const grid = withVessel(9, 9)
    const bar = put(grid, 4, 4, MaterialId.metal)
    grid.temperature[bar] = 1600

    run(grid, 4)

    expect(count(grid, MaterialId.metal)).toBe(0)
    expect(count(grid, MaterialId.lava)).toBe(1)
  })
})

describe('rubber', () => {
  it('bounces off the floor it was dropped on', () => {
    const grid = withVessel(15, 41)
    put(grid, 7, 6, MaterialId.rubber)

    // Dropped, not thrown: falling a cell per tick as a powder arrives at the floor with nothing to
    // rebound with, so a ball of it just sat there.
    let peak = 41
    let landed = 0
    for (let tick = 0; tick < 400; tick++) {
      run(grid, 1)
      let row = null
      for (let y = 0; y < grid.height; y++) {
        if (grid.material[cellIndex(grid, 7, y)] === MaterialId.rubber) row = y
      }
      if (row === null) break
      if (row >= grid.height - 2) landed = tick
      if (landed > 0 && tick > landed) peak = Math.min(peak, row)
    }

    expect(landed).toBeGreaterThan(0)
    expect(peak).toBeLessThan(grid.height - 2)
  })

  it('settles instead of bouncing forever', () => {
    const grid = withVessel(15, 41)
    put(grid, 7, 6, MaterialId.rubber)

    run(grid, 1200)

    expect(grid.velocity.size).toBe(0)
  })

  it('melts to oil rather than burning away', () => {
    const grid = withVessel(9, 9)
    const block = put(grid, 4, 4, MaterialId.rubber)
    grid.temperature[block] = 400

    run(grid, 4)

    expect(count(grid, MaterialId.rubber)).toBe(0)
    expect(count(grid, MaterialId.oil)).toBe(1)
  })
})

describe('life in the tick', () => {
  it('runs the life pass, so a fish out of water drowns on its own', () => {
    const grid = withVessel(15, 15)
    const fish = put(grid, 7, 13, MaterialId.fish)

    run(grid, 200)

    // Nothing but the life pass can do this: the material pass leaves creatures alone entirely.
    expect(grid.material[fish]).not.toBe(MaterialId.fish)
    expect(count(grid, MaterialId.meat)).toBe(1)
  })

  it('leaves a creature in its own medium alone', () => {
    const grid = withVessel(15, 15)
    for (let y = 6; y < 14; y++) {
      for (let x = 1; x < 14; x++) put(grid, x, y, MaterialId.water)
    }
    put(grid, 7, 10, MaterialId.fish)

    run(grid, 200)

    expect(count(grid, MaterialId.fish)).toBe(1)
  })
})

describe('explosives', () => {
  it('go off during a tick and throw what is around them', () => {
    const grid = withVessel(41, 41)
    const charge = put(grid, 20, 30, MaterialId.tnt)
    put(grid, 25, 30, MaterialId.sand)
    const { explodes } = MATERIALS[MaterialId.tnt]
    grid.temperature[charge] = (explodes?.at ?? 0) + 20

    run(grid, 2)

    expect(grid.material[charge]).not.toBe(MaterialId.tnt)
    expect(grid.velocity.size).toBeGreaterThan(0)
  })

  it('leave a crater in a pile they were buried under', () => {
    const grid = withVessel(41, 41)
    for (let y = 30; y < 39; y++) {
      for (let x = 14; x < 27; x++) put(grid, x, y, MaterialId.sand)
    }
    const charge = put(grid, 20, 38, MaterialId.tnt)
    const { explodes } = MATERIALS[MaterialId.tnt]
    grid.temperature[charge] = (explodes?.at ?? 0) + 20
    const buried = count(grid, MaterialId.sand)

    run(grid, 30)

    // Sand thrown clear of the pile has to end up somewhere other than the twelve columns it started in.
    let inPlace = 0
    for (let y = 0; y < 41; y++) {
      for (let x = 14; x < 27; x++) {
        if (grid.material[cellIndex(grid, x, y)] === MaterialId.sand) inPlace++
      }
    }
    expect(inPlace).toBeLessThan(buried)
  })
})

describe('the fire brush on a charge', () => {
  it('sets it off, not just glowing', () => {
    const grid = withVessel(41, 41)
    for (let x = 14; x < 27; x++) put(grid, x, 20, MaterialId.tnt)

    stampCircle(grid, 15, 20, 1, MaterialId.fire)
    run(grid, 6)

    // Lighting it exactly at its threshold let diffusion cool it back under before the pass tested it.
    expect(count(grid, MaterialId.tnt)).toBe(0)
  })
})

describe('a bouncing world', () => {
  /** Drops a lump of rubber onto a slope and runs it, which exercises the scatter in every bounce. */
  function bounceRun(seed: number) {
    const grid = withVessel(41, 41)
    for (let x = 8; x < 34; x++) {
      const surface = 20 + Math.floor((x - 8) * 0.5)
      for (let y = surface; y < 39; y++) put(grid, x, y, MaterialId.stone)
    }
    for (let y = 8; y < 11; y++) {
      for (let x = 10; x < 13; x++) put(grid, x, y, MaterialId.rubber)
    }

    const rng = createRng(seed)
    for (let tick = 0; tick < 150; tick++) tickWorld(grid, rng, tick)
    return [...grid.material]
  }

  it('replays identically from the same seed', () => {
    // A bounce now takes a random nudge sideways, so the kinetic pass draws from the seeded rng. Anything
    // unseeded in there would make a replay drift from the world it is replaying.
    expect(bounceRun(11)).toEqual(bounceRun(11))
  })

  it('lands somewhere else on a different seed', () => {
    expect(bounceRun(11)).not.toEqual(bounceRun(12))
  })
})

describe('a crowd of creatures', () => {
  it('holds its ground over a full tick, not just the life pass', () => {
    const grid = withVessel(81, 61)
    for (let y = 20; y < 34; y++) {
      for (let x = 30; x < 50; x++) put(grid, x, y, MaterialId.bird)
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
    run(grid, 500)

    // The scan direction alternates on the tick number, so the tick has to reach the life pass. Handed a
    // constant, a blob drifts steadily to one side.
    expect(Math.abs(centre() - before)).toBeLessThan(4)
  })
})

describe('cells in flight', () => {
  it('travel during a tick, and only the kinetic pass moves them', () => {
    const grid = withVessel(21, 21)
    const start = put(grid, 10, 10, MaterialId.sand)
    push(grid, start, 0, -3)

    run(grid, 1)

    // Both passes moving one cell doubled its gravity, so a throw fell as fast as it rose.
    let landed = -1
    for (let i = 0; i < grid.material.length; i++) {
      if (grid.material[i] === MaterialId.sand) landed = i
    }
    expect(Math.floor(landed / grid.width)).toBeLessThan(10)
  })
})

describe('embers', () => {
  it('relight fuel they drift against', () => {
    const grid = withVessel(9, 12)
    const plank = put(grid, 4, 10, MaterialId.wood)
    put(grid, 4, 9, MaterialId.ember)

    run(grid, 200)

    const caught = grid.burn[plank] > 0 || grid.material[plank] !== MaterialId.wood
    expect(caught).toBe(true)
  })

  it('cool into ash rather than vanishing', () => {
    const grid = withVessel(9, 12)
    put(grid, 4, 5, MaterialId.ember)

    run(grid, 400)

    expect(count(grid, MaterialId.ember)).toBe(0)
    expect(count(grid, MaterialId.ash)).toBeGreaterThan(0)
  })
})

describe('an untouched world', () => {
  it('stays at room temperature', () => {
    const grid = withVessel(20, 20)

    run(grid, 200)

    expect(grid.temperature.every((heat) => heat === AMBIENT_TEMPERATURE)).toBe(true)
  })
})
