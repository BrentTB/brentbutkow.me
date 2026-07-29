import { describe, it, expect } from 'vitest'
import { Grid, MaterialId } from '../pixel-world.types'
import { GRID_HEIGHT, GRID_WIDTH } from '../data'
import { cellIndex, createGrid, placeMaterial } from './grid'
import { Preset, loadPreset } from './presets'
import { tickWorld } from './tick'
import { createRng } from './rng'
import { onCI } from '../test-env'

// Heavy deterministic soaks (hundreds of ticks on a full-size grid) skip on CI and run locally.
const itSlow = it.skipIf(onCI)

/** How far either side of the vault's middle the floating specimen can reach. */
const CORE_REACH = 8

function count(grid: Grid, material: MaterialId): number {
  let total = 0
  for (const cell of grid.material) if (cell === material) total++
  return total
}

function built(seed = 1): Grid {
  const grid = createGrid(GRID_WIDTH, GRID_HEIGHT)
  loadPreset(grid, Preset.aquarium, createRng(seed))
  return grid
}

function builtWild(seed = 1): Grid {
  const grid = createGrid(GRID_WIDTH, GRID_HEIGHT)
  loadPreset(grid, Preset.wild, createRng(seed))
  return grid
}

/** The same tank at a size a test can afford to run for thousands of ticks. */
function smallTank(): Grid {
  const grid = createGrid(100, 64)
  loadPreset(grid, Preset.aquarium, createRng(1))
  return grid
}

function soak(grid: Grid, ticks: number): void {
  const rng = createRng(2)
  for (let tick = 0; tick < ticks; tick++) tickWorld(grid, rng, tick)
}

describe('the aquarium preset', () => {
  it('arrives holding water, algae and fish', () => {
    const grid = built()

    expect(count(grid, MaterialId.water)).toBeGreaterThan(1000)
    expect(count(grid, MaterialId.algae)).toBeGreaterThan(5)
    expect(count(grid, MaterialId.fish)).toBeGreaterThanOrEqual(5)
    expect(count(grid, MaterialId.stone)).toBeGreaterThan(100)
  })

  it('holds its water in, rather than pouring it across the floor', () => {
    const grid = smallTank()
    const before = count(grid, MaterialId.water)

    soak(grid, 400)

    // A tank that leaks is not a tank. A slice of the water is expected to go: the vine and the weed both
    // grow by turning a water cell into themselves, and some slops off the open top pool as the levels
    // settle. The margin is loose on purpose — the tank is a chaotic system, so shifting a single cell at
    // load sends the run down a different path and moves this figure by a few percent either way. What it
    // is guarding against is a chamber emptying itself, which is a different order of loss entirely.
    expect(count(grid, MaterialId.water)).toBeGreaterThan(before * 0.8)
  })

  itSlow('leaves no pockets of air walled into the rock', { timeout: 20_000 }, () => {
    // Reefs and boulders land on top of water and weed that was already there, and a weed sealed in with no
    // water beside it strands, dies and leaves a hole. Either way it shows as a one-cell black speck along the
    // sand line that no water can reach. The soak is the point: the weed takes a few seconds to run itself
    // down, so a tank checked only at load looks clean. Several seeds, since whether it happens at all comes
    // down to where the rock lands.
    for (let seed = 1; seed <= 4; seed++) {
      // A tank at a size a test can afford to soak four times over. The artifact is a property of how the
      // rock and the weed land together, not of how big the tank is.
      const grid = createGrid(100, 64)
      loadPreset(grid, Preset.aquarium, createRng(seed))
      soak(grid, 300)

      let sealed = 0
      for (let x = 1; x < grid.width - 1; x++) {
        for (let y = 1; y < grid.height - 1; y++) {
          if (grid.material[cellIndex(grid, x, y)] !== MaterialId.empty) continue
          // Air with something solid on all four sides, well inside the tank, is a pocket rather than the
          // open air above the top pool.
          const solid = ([dx, dy]: readonly number[]) => {
            const found = grid.material[cellIndex(grid, x + dx, y + dy)]
            return found !== MaterialId.empty
          }
          if (
            [
              [-1, 0],
              [1, 0],
              [0, -1],
              [0, 1],
            ].every(solid)
          ) {
            sealed++
          }
        }
      }
      expect(sealed).toBe(0)
    }
  })

  itSlow('still has a food chain running long after it was dropped in', { timeout: 20_000 }, () => {
    const grid = smallTank()

    soak(grid, 2000)

    // The whole point of the preset: it runs itself. Fish placed adrift in open water starved before they
    // found the bed, and a bed of algae with nothing grazing it is not a food chain.
    expect(count(grid, MaterialId.algae)).toBeGreaterThan(0)
    expect(count(grid, MaterialId.fish)).toBeGreaterThan(0)
  })

  it('wipes whatever was there before', () => {
    const grid = createGrid(GRID_WIDTH, GRID_HEIGHT)
    placeMaterial(grid, cellIndex(grid, 2, 2), MaterialId.lava)

    loadPreset(grid, Preset.aquarium, createRng(1))

    expect(count(grid, MaterialId.lava)).toBe(0)
  })

  it('comes out different every time it is loaded', () => {
    const first = built(1)
    const second = built(2)

    // A preset that lands identically every time reads as a stamp rather than a place.
    expect([...second.material]).not.toEqual([...first.material])
  })

  it('raises reef mounds in the lower chamber, differently each load', () => {
    // Reefs: stone crests standing well above the floor. The scan starts below the dividing shelf so the shelf
    // is not mistaken for one, and the height cut clears short boulders sunk in the sand bed. Counting exact
    // ledges is noisy on a wavy crest, so this measures how much reef there is and how tall it gets.
    const reef = (grid: Grid): { width: number; tallest: number } => {
      const floorY = grid.height - Math.floor(grid.height * 0.06)
      const belowShelf = Math.floor(grid.height * 0.42) + 6
      let width = 0
      let tallest = 0
      for (let x = 0; x < grid.width; x++) {
        let top = -1
        for (let y = belowShelf; y < floorY; y++) {
          if (grid.material[cellIndex(grid, x, y)] === MaterialId.stone) {
            top = y
            break
          }
        }
        if (top >= belowShelf && top < floorY - 12) {
          width++
          tallest = Math.max(tallest, floorY - top)
        }
      }
      return { width, tallest }
    }

    const widths = new Set<number>()
    for (let seed = 1; seed <= 8; seed++) {
      const { width, tallest } = reef(built(seed))
      // Real reef, spanning real width and standing well up.
      expect(width).toBeGreaterThan(20)
      expect(tallest).toBeGreaterThan(25)
      widths.add(width)
    }
    // A different arrangement each load, not one stamped-out shape.
    expect(widths.size).toBeGreaterThan(1)
  })

  it('fits inside whatever size of world it is given', () => {
    const small = createGrid(60, 40)
    loadPreset(small, Preset.aquarium, createRng(1))

    expect(count(small, MaterialId.water)).toBeGreaterThan(50)
    expect(count(small, MaterialId.fish)).toBeGreaterThanOrEqual(4)
  })
})

describe('the wild preset', () => {
  it('arrives with the whole cast in it', () => {
    const grid = builtWild()

    for (const material of [
      MaterialId.bug,
      MaterialId.worm,
      MaterialId.bird,
      MaterialId.fish,
      MaterialId.algae,
      MaterialId.plant,
    ]) {
      expect(count(grid, material)).toBeGreaterThan(0)
    }
  })

  it('puts each creature somewhere it can live', () => {
    const grid = builtWild()

    // Worms underground, bugs on top of it, birds in open air: seeded in the wrong medium they are simply
    // corpses with extra steps.
    const under = (material: MaterialId) => {
      for (let y = 0; y < grid.height - 1; y++) {
        for (let x = 0; x < grid.width; x++) {
          if (grid.material[cellIndex(grid, x, y)] !== material) continue
          return grid.material[cellIndex(grid, x, y + 1)]
        }
      }
      return MaterialId.empty
    }

    expect([MaterialId.dirt, MaterialId.sand]).toContain(under(MaterialId.worm))
    expect(under(MaterialId.bird)).toBe(MaterialId.empty)
  })

  it('has water that stays in its pond', () => {
    const grid = createGrid(120, 80)
    loadPreset(grid, Preset.wild, createRng(1))
    const before = count(grid, MaterialId.water)

    soak(grid, 400)

    // Some soaks into the bank as mud, which is the point of a bank, but it should not drain away.
    expect(count(grid, MaterialId.water)).toBeGreaterThan(before * 0.6)
  })

  itSlow('still has a world going a while later', { timeout: 20_000 }, () => {
    const grid = createGrid(120, 80)
    loadPreset(grid, Preset.wild, createRng(1))

    soak(grid, 2000)

    // Plants and worms are the load-bearing pair: whether the birds are still around at this size is up to
    // the run, since a small world cannot feed many predators.
    expect(count(grid, MaterialId.plant)).toBeGreaterThan(0)
    expect(count(grid, MaterialId.worm)).toBeGreaterThan(0)
    expect(count(grid, MaterialId.water)).toBeGreaterThan(50)
  })

  it('builds a landscape rather than a set of boxes', () => {
    const grid = builtWild()

    // The ground line has to actually vary, and there should be wood in the world: a flat horizon with
    // nothing standing on it was the complaint that produced all of this.
    const surface = new Set<number>()
    for (let x = 0; x < grid.width; x += 4) {
      for (let y = 0; y < grid.height; y++) {
        if (grid.material[cellIndex(grid, x, y)] === MaterialId.empty) continue
        surface.add(y)
        break
      }
    }

    expect(surface.size).toBeGreaterThan(3)
    expect(count(grid, MaterialId.wood)).toBeGreaterThan(10)
  })
})

describe('the volcano preset', () => {
  function builtVolcano(seed = 3): Grid {
    const grid = createGrid(GRID_WIDTH, GRID_HEIGHT)
    loadPreset(grid, Preset.volcano, createRng(seed))
    return grid
  }

  it('arrives with a mountain, a vent, charges and slimes', () => {
    const grid = builtVolcano()

    expect(count(grid, MaterialId.stone)).toBeGreaterThan(1000)
    expect(count(grid, MaterialId.lava)).toBeGreaterThan(20)
    // Two sources in the crater and more down the shaft: a lone source trickles slowly enough that the lava
    // crusts to stone and plugs the vent.
    expect(count(grid, MaterialId.source)).toBeGreaterThan(2)
    expect(count(grid, MaterialId.slime)).toBeGreaterThan(1)
    expect(count(grid, MaterialId.tnt) + count(grid, MaterialId.gunpowder)).toBeGreaterThan(10)
    expect(count(grid, MaterialId.water)).toBeGreaterThan(50)
    // A pocket of oil sealed in the rock, waiting for a lava flow to find it.
    expect(count(grid, MaterialId.oil)).toBeGreaterThan(0)
  })

  it('puts birds over the woods, in air they can hunt from', () => {
    const grid = builtVolcano()

    expect(count(grid, MaterialId.bird)).toBeGreaterThanOrEqual(2)

    // A bird dropped into the leaves of a tree is out of its medium and drains out in seconds, and one parked
    // up in the clouds never sees the bugs in the meadow. Each starts in clear air near the ground.
    for (let i = 0; i < grid.material.length; i++) {
      if (grid.material[i] !== MaterialId.bird) continue
      const x = i % grid.width
      const y = Math.floor(i / grid.width)
      for (const [dx, dy] of [
        [-1, 0],
        [1, 0],
        [0, -1],
      ]) {
        expect(grid.material[cellIndex(grid, x + dx, y + dy)]).toBe(MaterialId.empty)
      }
    }
  })

  itSlow(
    'pours lava down both faces, and never plugs its vent with stone',
    { timeout: 20_000 },
    () => {
      // A few seeds, both sides. The crater sources are dormant until the climbing column reaches them, so the
      // spill comes after the eruption has risen rather than from the first tick; the soak covers that climb.
      for (const seed of [4, 5, 7]) {
        const grid = createGrid(200, 120)
        loadPreset(grid, Preset.volcano, createRng(seed))
        const mid = Math.floor(200 * 0.46)

        soak(grid, 600)

        let left = 0
        let right = 0
        let plug = 0
        for (let y = 0; y < grid.height; y++) {
          for (let x = 0; x < grid.width; x++) {
            if (grid.material[cellIndex(grid, x, y)] !== MaterialId.lava) continue
            if (x < mid - 10) left++
            else if (x > mid + 10) right++
          }
        }
        // The crater lips and the rim above them are lava or air, not a grey stone plug from a source that
        // learned to pump stone off the shaft walls.
        for (let y = 20; y < 40; y++) {
          if (grid.material[cellIndex(grid, mid, y)] === MaterialId.stone) plug++
        }
        expect(left).toBeGreaterThan(0)
        expect(right).toBeGreaterThan(0)
        expect(plug).toBeLessThan(6)
      }
    }
  )

  it('cuts the cave mouth wide enough to actually be a way out', () => {
    // A slime walks and cannot climb through open air, so a one-cell winding crack is a wall to it however far
    // it goes. Widening the mouth is what turns it into a passage — and the measure of that is whether the air
    // a slime can reach opens onto the mountainside at all, rather than ending in the den it started in.
    const escapes = [1, 2, 3, 4, 5, 6, 7, 8].filter((seed) => {
      const grid = createGrid(200, 120)
      loadPreset(grid, Preset.volcano, createRng(seed))

      let start = -1
      for (let i = 0; i < grid.material.length; i++) {
        if (grid.material[i] === MaterialId.slime) {
          start = i
          break
        }
      }
      if (start < 0) return false

      // Walk the connected air out from the slime. A den on its own is a couple of hundred cells; reaching the
      // sky outside the mountain is tens of thousands, so the two are never in doubt.
      const seen = new Set<number>()
      const queue = [start]
      while (queue.length > 0) {
        const at = queue.pop() as number
        if (seen.has(at)) continue
        seen.add(at)
        const x = at % grid.width
        const y = Math.floor(at / grid.width)
        for (const [dx, dy] of [
          [-1, 0],
          [1, 0],
          [0, -1],
          [0, 1],
        ]) {
          const nx = x + dx
          const ny = y + dy
          if (nx < 0 || nx >= grid.width || ny < 0 || ny >= grid.height) continue
          const next = cellIndex(grid, nx, ny)
          const found = grid.material[next]
          if (found !== MaterialId.empty && found !== MaterialId.slime) continue
          if (!seen.has(next)) queue.push(next)
        }
      }
      return seen.size > 2000
    })

    // The mountain is a different shape each load, so the odd seed still buries its tunnel and that is fine.
    // Measured over these eight, the mouth opens on all but one or two; a narrow crack that stops at the
    // surface line opened on one, and that one only by luck of where the terrain fell.
    expect(escapes.length).toBeGreaterThanOrEqual(6)
  })

  it('digs its slimes an exit rather than sealing them in a pocket', { timeout: 20_000 }, () => {
    const grid = createGrid(200, 120)
    loadPreset(grid, Preset.volcano, createRng(2))

    // Every slime should have somewhere to move: a walker sealed in solid stone is stuck, so the caves are
    // tunnelled out to daylight.
    const canMove = (index: number) => {
      const x = index % grid.width
      const y = Math.floor(index / grid.width)
      for (const [dx, dy] of [
        [-1, 0],
        [1, 0],
        [0, -1],
        [0, 1],
      ]) {
        const nx = x + dx
        const ny = y + dy
        if (nx < 0 || nx >= grid.width || ny < 0 || ny >= grid.height) continue
        const m = grid.material[cellIndex(grid, nx, ny)]
        if (m === MaterialId.empty || m === MaterialId.slime) return true
      }
      return false
    }

    let free = 0
    let slimes = 0
    for (let i = 0; i < grid.material.length; i++) {
      if (grid.material[i] !== MaterialId.slime) continue
      slimes++
      if (canMove(i)) free++
    }
    expect(slimes).toBeGreaterThan(0)
    expect(free).toBe(slimes)
  })

  itSlow('does not cook its own slimes on the way in', () => {
    const grid = createGrid(200, 120)
    loadPreset(grid, Preset.volcano, createRng(3))

    soak(grid, 600)

    // They live in caves out at the feet of the mountain. Over the chamber they simply cooked.
    expect(count(grid, MaterialId.slime)).toBeGreaterThan(0)
  })
})

describe('the ant colony preset', () => {
  function builtColony(seed = 1): Grid {
    const grid = createGrid(GRID_WIDTH, GRID_HEIGHT)
    loadPreset(grid, Preset.antColony, createRng(seed))
    return grid
  }

  it('arrives as a glass case of wood beside open country', () => {
    const grid = builtColony()

    // The case, the nest inside it, and the countryside next door with its own creatures in it.
    expect(count(grid, MaterialId.glass)).toBeGreaterThan(100)
    expect(count(grid, MaterialId.wood)).toBeGreaterThan(100)
    expect(count(grid, MaterialId.plant)).toBeGreaterThan(20)
    expect(count(grid, MaterialId.ant)).toBeGreaterThan(4)
    expect(count(grid, MaterialId.bug)).toBeGreaterThan(0)
    expect(count(grid, MaterialId.bird)).toBeGreaterThan(0)
  })

  it('keeps the predators out of the case, and stocks it with ants', () => {
    const grid = builtColony()

    // The point of the pairing: the colony behind the glass is sealed away from the things that eat ants, so
    // it works on undisturbed while the trees outside take their chances. Ants live on both sides; a bug or a
    // bird only ever out in the country.
    const paneColumns: number[] = []
    for (let x = 0; x < grid.width; x++) {
      for (let y = 0; y < grid.height; y++) {
        if (grid.material[cellIndex(grid, x, y)] === MaterialId.glass) {
          paneColumns.push(x)
          break
        }
      }
    }
    const caseRight = Math.max(...paneColumns)

    let inside = 0
    for (let i = 0; i < grid.material.length; i++) {
      const x = i % grid.width
      if (grid.material[i] === MaterialId.ant && x < caseRight) inside++
      if (grid.material[i] === MaterialId.bug || grid.material[i] === MaterialId.bird) {
        expect(x).toBeGreaterThan(caseRight)
      }
    }
    expect(inside).toBeGreaterThan(3)
  })

  itSlow('is still boring galleries a while after it is dropped in', { timeout: 20_000 }, () => {
    const grid = createGrid(140, 90)
    loadPreset(grid, Preset.antColony, createRng(2))

    soak(grid, 1000)

    // The ants graze the ground bushes and keep working, so the colony is still alive; and it has opened
    // real walled lanes — open cells with a wall on each side, which a solid log has none of.
    expect(count(grid, MaterialId.ant)).toBeGreaterThan(0)

    let lanes = 0
    for (let y = 1; y < grid.height - 1; y++) {
      for (let x = 1; x < grid.width - 1; x++) {
        if (grid.material[cellIndex(grid, x, y)] !== MaterialId.empty) continue
        const wall = (dx: number, dy: number) =>
          grid.material[cellIndex(grid, x + dx, y + dy)] === MaterialId.wood
        if ((wall(-1, 0) && wall(1, 0)) || (wall(0, -1) && wall(0, 1))) lanes++
      }
    }
    // Only the flat and upright lanes are counted here; the diagonal ones (walled corner to corner) are
    // not, so this is a floor well under the real number.
    expect(lanes).toBeGreaterThan(8)
  })

  it('starts a nest in every tree out in the country', () => {
    const grid = builtColony()

    // A tree out here is a colony of its own, working away with the birds overhead. Every trunk gets one, so
    // there is something to watch wherever you look rather than only behind the glass.
    const trunks = new Set<number>()
    const nested = new Set<number>()
    for (let i = 0; i < grid.material.length; i++) {
      const x = i % grid.width
      if (grid.material[i] === MaterialId.wood) trunks.add(x)
      if (grid.material[i] === MaterialId.ant) nested.add(x)
    }

    // Every ant outside the case is in a trunk column: none are left standing about on bare ground.
    const paneRight = (() => {
      let right = 0
      for (let i = 0; i < grid.material.length; i++) {
        if (grid.material[i] === MaterialId.glass) right = Math.max(right, i % grid.width)
      }
      return right
    })()
    for (const x of nested) {
      if (x <= paneRight) continue
      expect(trunks.has(x)).toBe(true)
    }
    // And there are ants out there at all.
    expect([...nested].some((x) => x > paneRight)).toBe(true)
  })

  it('gives its trees trunks thick enough to hold a gallery', () => {
    const grid = builtColony()

    // A one-cell trunk has no inside to tunnel. The widest run of wood on a row above the ground shows the
    // trunks have real girth.
    let widest = 0
    for (let y = 0; y < grid.height; y++) {
      let run = 0
      for (let x = 0; x < grid.width; x++) {
        run = grid.material[cellIndex(grid, x, y)] === MaterialId.wood ? run + 1 : 0
        widest = Math.max(widest, run)
      }
    }
    expect(widest).toBeGreaterThanOrEqual(3)
  })

  it('leaves the worms out of it', () => {
    // A worm eats dirt, which is unlimited, so a handful breed away underground and hollow out the field.
    expect(count(builtColony(), MaterialId.worm)).toBe(0)
  })

  it('comes out different every time it is loaded', () => {
    expect([...builtColony(2).material]).not.toEqual([...builtColony(1).material])
  })
})

describe('preset determinism', () => {
  it('builds an identical world from the same seed, for every preset', () => {
    for (const preset of Object.values(Preset)) {
      const first = createGrid(GRID_WIDTH, GRID_HEIGHT)
      const second = createGrid(GRID_WIDTH, GRID_HEIGHT)
      loadPreset(first, preset, createRng(42))
      loadPreset(second, preset, createRng(42))

      // A world that fills nothing would pass equality trivially, so prove there is something to reproduce.
      expect([...first.material].some((material) => material !== MaterialId.empty)).toBe(true)
      expect([...second.material]).toEqual([...first.material])
    }
  })
})

describe('the mad science preset', () => {
  function lab(seed = 3): Grid {
    const grid = createGrid(GRID_WIDTH, GRID_HEIGHT)
    loadPreset(grid, Preset.madScience, createRng(seed))
    return grid
  }

  it('stands the one cell of corruption alone on a pedestal', () => {
    const grid = lab()

    expect(count(grid, MaterialId.corruption)).toBe(1)
    const at = grid.material.indexOf(MaterialId.corruption)
    const x = at % grid.width
    const y = Math.floor(at / grid.width)

    // On the cap, which is also its only way out: corruption travels through what it touches and cannot cross
    // air, so it has to eat down the column and along the floor before it reaches a wall.
    expect(grid.material[cellIndex(grid, x, y + 1)]).toBe(MaterialId.metal)
    // And touching nothing else. Encased in rock, as it first was, it chewed outward in every direction at once.
    for (const [dx, dy] of [
      [-1, 0],
      [1, 0],
      [0, -1],
      [-1, -1],
      [1, -1],
    ]) {
      expect(grid.material[cellIndex(grid, x + dx, y + dy)]).toBe(MaterialId.empty)
    }

    /** How many cells of the pedestal a given row holds, near the column. */
    const widthAt = (row: number) => {
      let cells = 0
      for (let cx = x - 12; cx <= x + 12; cx++) {
        if (grid.material[cellIndex(grid, cx, row)] === MaterialId.metal) cells++
      }
      return cells
    }
    // A wide base on a narrow column, rather than a post.
    expect(widthAt(y + 1)).toBeGreaterThan(widthAt(y + 6))
  })

  it('gives the spread a continuous path from the chamber to the lava', () => {
    // The plan turns on this. Corruption cannot cross open air, only travel through what it touches, so if
    // the deck under the lab is broken anywhere the spread stops there and the incinerator is never reached.
    // The first version of the chamber had a void between two walls, which contained the thing forever.
    const grid = lab()
    const start = grid.material.indexOf(MaterialId.corruption)

    const reached = new Uint8Array(grid.material.length)
    const queue = [start]
    reached[start] = 1
    for (let at = 0; at < queue.length; at++) {
      const index = queue[at]
      const x = index % grid.width
      const y = Math.floor(index / grid.width)
      for (let dy = -1; dy <= 1; dy++) {
        for (let dx = -1; dx <= 1; dx++) {
          const nx = x + dx
          const ny = y + dy
          if (nx < 0 || nx >= grid.width || ny < 0 || ny >= grid.height) continue
          const next = cellIndex(grid, nx, ny)
          if (reached[next] === 1 || grid.material[next] === MaterialId.empty) continue
          reached[next] = 1
          queue.push(next)
        }
      }
    }

    let lava = 0
    for (let index = 0; index < grid.material.length; index++) {
      if (grid.material[index] === MaterialId.lava && reached[index] === 1) lava++
    }
    expect(lava).toBeGreaterThan(0)
  })

  it('builds the lab to a plan and leaves the randomness outside it', () => {
    const first = lab(1)
    const second = lab(2)

    // The hall itself is identical between loads: a lab that came out different every time reads as rubble
    // rather than as a place somebody built.
    const hall = (grid: Grid) => {
      const rows: number[] = []
      // The near end only: the bunker, the sign and the catwalk. Bounded on both sides by things that are
      // meant to differ — the pen is stocked at random just past it, and the tree outside throws its canopy to
      // within a few cells of the near wall.
      for (let y = Math.floor(GRID_HEIGHT * 0.5); y < GRID_HEIGHT * 0.76; y++) {
        for (let x = Math.floor(GRID_WIDTH * 0.1); x < GRID_WIDTH * 0.29; x++) {
          rows.push(grid.material[cellIndex(grid, x, y)])
        }
      }
      return rows
    }
    expect(hall(second)).toEqual(hall(first))
    // The country it stands on is not.
    expect([...second.material]).not.toEqual([...first.material])
  })

  it('stocks the pen, and hangs a hazard sign that is not part of the building', () => {
    const grid = lab()

    for (const material of [
      MaterialId.water,
      MaterialId.algae,
      MaterialId.fish,
      MaterialId.glass,
    ]) {
      expect(count(grid, material)).toBeGreaterThan(0)
    }
    // Sponge appears nowhere else in the lab, so its cells are the sign and nothing but the sign.
    expect(count(grid, MaterialId.sponge)).toBeGreaterThan(20)
    // Several of them, together in the vault rather than one on the deck looking like a spill.
    expect(count(grid, MaterialId.randomSource)).toBeGreaterThan(1)
  })

  it('hangs the wild sources in mid-air, touching nothing', () => {
    // The one thing that makes them read as a specimen under investigation rather than as equipment bolted to
    // a bench. It costs nothing to do: a wild source is static, so it stays where it is put with no support.
    const grid = lab()

    for (let index = 0; index < grid.material.length; index++) {
      if (grid.material[index] !== MaterialId.randomSource) continue
      const x = index % grid.width
      const y = Math.floor(index / grid.width)
      for (let dy = -1; dy <= 1; dy++) {
        for (let dx = -1; dx <= 1; dx++) {
          if (dx === 0 && dy === 0) continue
          const found = grid.material[cellIndex(grid, x + dx, y + dy)]
          expect([MaterialId.empty, MaterialId.randomSource]).toContain(found)
        }
      }
    }
  })

  it('roofs the reactor vault with an arch on straight walls', () => {
    // A vault, not a blob. What makes it read as a room somebody built is the straight wall meeting the curve
    // at a definite line, which the wobbled ellipse this replaced did not have. Measured off the grid rather
    // than off remembered offsets: the first version of this sampled the specimen's own row and read zero.
    const grid = lab()

    const columns: number[] = []
    for (let index = 0; index < grid.material.length; index++) {
      if (grid.material[index] === MaterialId.randomSource) columns.push(index % grid.width)
    }
    const middle = Math.round(columns.reduce((sum, x) => sum + x, 0) / columns.length)
    const specimen = Math.floor(grid.material.indexOf(MaterialId.randomSource) / grid.width)

    // The vault floor: the lowest cell of air with something under it, below the specimen. Dropping until the
    // first obstacle instead finds the lower clamp, which hangs in the way and is not the floor.
    let floorY = specimen
    for (let y = specimen; y < grid.height - 1; y++) {
      const air = grid.material[cellIndex(grid, middle, y)] === MaterialId.empty
      if (air && grid.material[cellIndex(grid, middle, y + 1)] !== MaterialId.empty) floorY = y
    }

    /** How far the cavity reaches to the right of the middle on one row, out to the wall's inner face. */
    const halfWidthAt = (y: number) => {
      let x = middle
      const limit = middle + Math.floor(grid.width * 0.2)
      while (x < limit && grid.material[cellIndex(grid, x, y)] === MaterialId.empty) x++
      return x - middle
    }

    /** Whether the specimen hangs on this row, in which case the row says nothing about the room's shape. */
    const holdsSpecimen = (y: number) => {
      for (let x = middle - CORE_REACH; x <= middle + CORE_REACH; x++) {
        if (grid.material[cellIndex(grid, x, y)] === MaterialId.randomSource) return true
      }
      return false
    }

    // Climb from the floor, stopping the row after the cavity stops narrowing — which is the row above the
    // crown, where the measurement escapes into the open hall and jumps.
    const profile: number[] = []
    for (let y = floorY; y > floorY - 60; y--) {
      if (holdsSpecimen(y)) continue
      const width = halfWidthAt(y)
      if (profile.length > 3 && width > profile[profile.length - 1]) break
      profile.push(width)
    }

    // A run of rows all the same width: the straight wall. Then a run that narrows every row: the arch.
    const straight = profile.filter((w) => w === profile[2]).length
    // The last row still at full width is where the wall stops and the arch springs from.
    let shoulder = 0
    profile.forEach((width, at) => {
      if (width === profile[2]) shoulder = at
    })
    const arch = profile
      .slice(shoulder + 1)
      .filter((w, at, run) => at === 0 || w < run[at - 1]).length

    expect(profile[2]).toBeGreaterThan(10)
    expect(straight).toBeGreaterThan(6)
    expect(arch).toBeGreaterThan(6)
    expect(profile[profile.length - 1]).toBeLessThan(profile[2])
  })

  itSlow(
    'lets the corruption out of the chamber, and the lava ends it',
    { timeout: 60_000 },
    () => {
      // At a size a test can afford to run the whole story out. The lab is laid out as fractions of the world
      // it is given, so a smaller one is the same building with less distance to cross — and distance is the
      // only thing that paces the spread. Full size, this takes upwards of twelve thousand ticks.
      const grid = createGrid(160, 90)
      loadPreset(grid, Preset.madScience, createRng(3))
      const rng = createRng(3)
      let peak = 0

      for (let tick = 0; tick < 5000; tick++) {
        tickWorld(grid, rng, tick)
        if (tick % 50 === 0) peak = Math.max(peak, count(grid, MaterialId.corruption))
      }

      // It got out of the chamber and took a real bite of the lab on the way across.
      expect(peak).toBeGreaterThan(50)
      // And the incinerator is still an incinerator. Burning corruption radiates well over its own ignition
      // point, so the fire races back through the trail rather than nibbling at the leading edge.
      expect(count(grid, MaterialId.lava)).toBeGreaterThan(0)
      expect(count(grid, MaterialId.corruption)).toBeLessThan(peak / 2)
    }
  )
})

describe('the pots and pans preset', () => {
  function kitchen(): Grid {
    const grid = createGrid(GRID_WIDTH, GRID_HEIGHT)
    loadPreset(grid, Preset.kitchen, createRng(3))
    return grid
  }

  function count(grid: Grid, material: MaterialId): number {
    let n = 0
    for (const id of grid.material) if (id === material) n++
    return n
  }

  /** Which quarter of the counter a cell sits in, one quarter to a vessel. */
  function panOf(grid: Grid, index: number): number {
    return Math.floor((index % grid.width) / Math.floor(grid.width / 4))
  }

  /** Which columns of one quarter of the counter hold `material` on a given row. */
  function columnsOf(grid: Grid, quarter: number, row: number, material: MaterialId): number[] {
    const columns: number[] = []
    for (let x = 0; x < grid.width; x++) {
      const index = cellIndex(grid, x, row)
      if (grid.material[index] === material && panOf(grid, index) === quarter) columns.push(x)
    }
    return columns
  }

  /** The highest row holding any of `material` in one quarter of the counter, or -1 if it holds none. */
  function topOf(grid: Grid, quarter: number, material: MaterialId): number {
    for (let y = 0; y < grid.height; y++) {
      for (let x = 0; x < grid.width; x++) {
        const index = cellIndex(grid, x, y)
        if (grid.material[index] === material && panOf(grid, index) === quarter) return y
      }
    }
    return -1
  }

  it('lays out both fillings over a lit fuse', () => {
    const grid = kitchen()

    expect(count(grid, MaterialId.metal)).toBeGreaterThan(0)
    expect(count(grid, MaterialId.kernel)).toBeGreaterThan(0)
    expect(count(grid, MaterialId.firework)).toBeGreaterThan(0)
    expect(count(grid, MaterialId.source)).toBeGreaterThan(0)
    // Three cells deep and the full width of the counter, and one flame at the near end starts the show.
    expect(count(grid, MaterialId.wood)).toBe(grid.width * 3)
    expect(count(grid, MaterialId.fire)).toBe(1)
  })

  it('builds lidded pots for the kernels and open pans for the fireworks', () => {
    // Which one you are looking at should be obvious before anything happens in it, so the shape carries it:
    // a pot is deep and narrow and has a lid, a pan is shallow and wide and open to the sky. Both held
    // kernels in identical vessels before, and the counter read as four of the same thing.
    const grid = kitchen()

    for (const pot of [0, 2]) {
      const pan = pot + 1
      // The pot's metal starts higher up than the pan's: that is the lid, above a deeper wall.
      expect(topOf(grid, pot, MaterialId.metal)).toBeLessThan(topOf(grid, pan, MaterialId.metal))
      // And the lid is over the kernels rather than beside them.
      expect(topOf(grid, pot, MaterialId.metal)).toBeLessThan(topOf(grid, pot, MaterialId.kernel))
      // Nothing roofs the pan, so its fireworks have open sky to go up into.
      expect(topOf(grid, pan, MaterialId.firework)).toBeGreaterThan(
        topOf(grid, pan, MaterialId.metal)
      )
      expect(topOf(grid, pot, MaterialId.firework)).toBe(-1)
      expect(topOf(grid, pan, MaterialId.kernel)).toBe(-1)
    }
  })

  it('domes the lid rather than laying a flat plate across the top', () => {
    const grid = kitchen()

    for (const pot of [0, 2]) {
      const peak = topOf(grid, pot, MaterialId.metal)
      const kernels = topOf(grid, pot, MaterialId.kernel)

      // The topmost metal in each column of the pot's roofline, walls included.
      const tops = new Map<number, number>()
      for (let y = peak; y < kernels; y++) {
        for (const x of columnsOf(grid, pot, y, MaterialId.metal)) {
          if (!tops.has(x)) tops.set(x, y)
        }
      }
      const columns = [...tops.keys()].sort((a, b) => a - b)
      const middle = tops.get(columns[Math.floor(columns.length / 2)])!

      // A flat lid clears the rim by exactly one, so anything this far above it is a curve.
      expect(tops.get(columns[0])! - middle).toBeGreaterThanOrEqual(3)
      expect(tops.get(columns[columns.length - 1])! - middle).toBeGreaterThanOrEqual(3)
    }
  })

  it('hangs a handle off the side of each pan', () => {
    const grid = kitchen()

    for (const pan of [1, 3]) {
      // The walls stand either side of the fireworks, so the outer one is where the vessel itself ends.
      const inside = topOf(grid, pan, MaterialId.firework)
      const outer = Math.max(...columnsOf(grid, pan, inside, MaterialId.metal))

      const rows: number[] = []
      for (let y = 0; y < grid.height; y++) {
        for (const x of columnsOf(grid, pan, y, MaterialId.metal)) if (x > outer) rows.push(y)
      }

      expect(rows.length).toBeGreaterThan(4)
      // It lifts as it runs out, so it reads as a handle rather than a shelf.
      expect(Math.min(...rows)).toBeLessThan(Math.max(...rows))
    }
  })

  it('leaves every burner block touching nothing but air and itself', () => {
    // The reason the sources sit in clear air. A source copies the first material fed to it, so one placed
    // against the pan learns metal and one on the counter learns stone — and then it is a stone fountain
    // rather than a burner. Clear of everything, the only thing that can reach it is what the fuse vents.
    const grid = kitchen()

    for (let index = 0; index < grid.material.length; index++) {
      if (grid.material[index] !== MaterialId.source) continue
      const x = index % grid.width
      const y = Math.floor(index / grid.width)
      for (let dy = -1; dy <= 1; dy++) {
        for (let dx = -1; dx <= 1; dx++) {
          if (dx === 0 && dy === 0) continue
          const found = grid.material[cellIndex(grid, x + dx, y + dy)]
          expect([MaterialId.empty, MaterialId.source]).toContain(found)
        }
      }
    }
  })

  itSlow('lights each pan in turn, and every pan cooks', { timeout: 60_000 }, () => {
    // What the fuse is for. It burns at roughly a cell every four or five ticks, so the pans go off in order
    // with several seconds between them rather than all at once.
    const grid = kitchen()
    const rng = createRng(3)
    const corn = count(grid, MaterialId.kernel)
    const firstCooked = new Map<number, number>()
    let embersSeen = 0

    for (let tick = 0; tick < 2000; tick++) {
      tickWorld(grid, rng, tick)
      if (tick % 5 !== 0) continue
      for (let index = 0; index < grid.material.length; index++) {
        const id = grid.material[index]
        if (id === MaterialId.ember) embersSeen++
        // Popcorn only ever comes from an even pan and a lit firework from an odd one, so the first sighting
        // of either dates the pan it belongs to even after the stuff has scattered across the counter.
        const pan = panOf(grid, index)
        const cooking = pan % 2 === 0 ? id === MaterialId.popcorn : id === MaterialId.fireworkLit
        if (cooking && !firstCooked.has(pan)) firstCooked.set(pan, tick)
      }
    }

    // Every pan cooks, in left-to-right order, and no two within two and a half seconds of each other.
    const order = [0, 1, 2, 3].map((pan) => firstCooked.get(pan))
    expect(order.every((tick) => tick !== undefined)).toBe(true)
    for (let pan = 1; pan < 4; pan++) {
      expect(order[pan]! - order[pan - 1]!).toBeGreaterThan(150)
    }

    // Fireworks that went off, leaving trails rather than one blast.
    expect(embersSeen).toBeGreaterThan(0)
    // Most burners learn flame rather than the smoke that shares the firebox with it. That is what the height
    // of the firebox buys: squat, the smoke reaches the sources first and every last burner learns smoke.
    let flame = 0
    let smoke = 0
    for (let index = 0; index < grid.material.length; index++) {
      if (grid.material[index] !== MaterialId.source) continue
      if (grid.data[index] === MaterialId.fire) flame++
      if (grid.data[index] === MaterialId.smoke) smoke++
    }
    expect(flame).toBeGreaterThan(smoke)

    // Nearly every kernel pops, and hardly any chars. Through a one-cell base the pan runs hot enough to
    // burn them, and these two counts come up well short of what went in.
    const popped = count(grid, MaterialId.popcorn)
    expect(count(grid, MaterialId.kernel) + popped).toBeGreaterThan(corn * 0.99)
    expect(popped).toBeGreaterThan(corn * 0.8)
    // Metal neither melts nor breaks and stone has nothing that undoes it, so however wild it gets the
    // scene is still recognisably a kitchen.
    expect(count(grid, MaterialId.metal)).toBeGreaterThan(0)
    expect(count(grid, MaterialId.stone)).toBeGreaterThan(0)
  })
})
