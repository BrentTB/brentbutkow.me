import { describe, it, expect } from 'vitest'
import { Material, MaterialBehavior, MaterialId, Medium } from '../pixel-world.types'
import { MATERIALS, canDisplace, canFloatThrough, canPaintOver, isBurning } from './materials'

const FLUIDS: readonly MaterialBehavior[] = [MaterialBehavior.liquid, MaterialBehavior.gas]

describe('MATERIALS', () => {
  it('is indexed by MaterialId', () => {
    MATERIALS.forEach((material, index) => expect(material.id).toBe(index))
    expect(MATERIALS).toHaveLength(Object.keys(MaterialId).length)
  })

  it('orders densities so sand sinks, oil floats, and gases rise through both', () => {
    expect(MATERIALS[MaterialId.sand].density).toBeGreaterThan(MATERIALS[MaterialId.water].density)
    expect(MATERIALS[MaterialId.water].density).toBeGreaterThan(MATERIALS[MaterialId.oil].density)
    expect(MATERIALS[MaterialId.oil].density).toBeGreaterThan(MATERIALS[MaterialId.steam].density)
    expect(MATERIALS[MaterialId.lava].density).toBeGreaterThan(MATERIALS[MaterialId.water].density)
  })

  it('gives every fluid room to spread and every solid none', () => {
    for (const material of MATERIALS) {
      if (FLUIDS.includes(material.behavior)) {
        expect(material.dispersion).toBeGreaterThan(0)
      } else {
        expect(material.dispersion).toBe(0)
      }
    }
  })

  it('keeps jitter from darkening a colour below black', () => {
    for (const material of MATERIALS) {
      for (const channel of material.color) {
        expect(channel - material.jitter).toBeGreaterThanOrEqual(0)
      }
    }
  })

  it('only lets emissive materials clip the top of the byte range', () => {
    for (const material of MATERIALS) {
      if (material.emissive) continue
      for (const channel of material.color) {
        expect(channel + material.jitter).toBeLessThanOrEqual(255)
      }
    }
  })

  it('gives every material a sane share of the heat gradient', () => {
    for (const material of MATERIALS) {
      expect(material.conductivity).toBeGreaterThan(0)
      expect(material.conductivity).toBeLessThanOrEqual(1)
    }
  })

  it('orders every pair of temperature thresholds', () => {
    for (const material of MATERIALS) {
      if (material.hot && material.cold) expect(material.cold.at).toBeLessThan(material.hot.at)
      // Freezing into something that melts straight back would flicker forever.
      if (material.cold) {
        const frozen = MATERIALS[material.cold.into]
        if (frozen.hot) expect(frozen.hot.at).toBeGreaterThan(material.cold.at)
      }
    }
  })

  it('never melts a material into something hot enough to melt its neighbours', () => {
    // The pair-of-materials version of a chain reaction: if stone melted at or below lava's own 1250 °C,
    // one lava cell would melt the stone beside it, and that new lava the next, until the world was
    // molten. `radiate` pulls a neighbour toward a source's temperature and never past it, so a melt
    // point above the source is unreachable by contact alone — only a real heat source gets there.
    for (const material of MATERIALS) {
      const molten = material.hot
      if (molten === undefined) continue

      const heldBy = MATERIALS[molten.into].selfHeat
      if (heldBy === undefined) continue

      expect(molten.at).toBeGreaterThan(heldBy)
    }
  })

  it('gives every gas somewhere to go when its lifetime runs out', () => {
    for (const material of MATERIALS) {
      if (material.lifetime === undefined) continue
      expect(material.lifetime).toBeGreaterThan(0)
      expect(material.expiresInto).toBeDefined()
    }
  })

  it('gives every fuel a burn time, a flame hotter than its ignition point, and a residue', () => {
    for (const material of MATERIALS) {
      if (material.ignite === undefined) continue
      expect(material.ignite.ticks).toBeGreaterThan(0)
      expect(material.ignite.heat).toBeGreaterThan(material.ignite.at)
      expect(MATERIALS[material.ignite.into]).toBeDefined()
    }
  })

  it('catches easiest as plant, then oil, then wood, and burns out in that order too', () => {
    const plant = MATERIALS[MaterialId.plant].ignite
    const wood = MATERIALS[MaterialId.wood].ignite
    const oil = MATERIALS[MaterialId.oil].ignite

    expect(plant?.at).toBeLessThan(oil?.at ?? 0)
    expect(oil?.at).toBeLessThan(wood?.at ?? 0)

    expect(plant?.ticks).toBeLessThan((wood?.ticks ?? 0) / 2)
    expect(plant?.ticks).toBeLessThan(oil?.ticks ?? 0)
    expect(oil?.ticks).toBeLessThan(wood?.ticks ?? 0)
  })

  it('gives plant a growth budget and vine none', () => {
    // The whole distinction between the two: a plant fills a patch and stops, a vine never does. Give
    // vine a budget and it becomes a second plant; take plant's away and it becomes a second vine.
    expect(MATERIALS[MaterialId.plant].uses).toBeGreaterThan(0)
    expect(MATERIALS[MaterialId.vine].uses).toBeUndefined()
  })

  it('makes vine as flammable as plant', () => {
    const plant = MATERIALS[MaterialId.plant].ignite
    const vine = MATERIALS[MaterialId.vine].ignite

    expect(vine).toBeDefined()
    expect(vine?.at).toBeLessThan(MATERIALS[MaterialId.wood].ignite?.at ?? 0)
    expect(vine?.into).toBe(plant?.into)
  })

  it('only puts a repose angle on powders and buoyancy on gases', () => {
    for (const material of MATERIALS) {
      if (material.steep === true) expect(material.behavior).toBe(MaterialBehavior.powder)
      if (material.sinks === true) expect(material.behavior).toBe(MaterialBehavior.gas)
    }
  })

  it('gives a spark somewhere to run', () => {
    const conductors = MATERIALS.filter((material) => material.conductive === true)

    expect(conductors.length).toBeGreaterThan(1)
    // Metal is the wire; water and brine are the accident waiting to happen.
    expect(conductors.map((material) => material.id)).toContain(MaterialId.metal)
    expect(conductors.map((material) => material.id)).toContain(MaterialId.water)
  })

  it('only lets a solid soak up liquid', () => {
    for (const material of MATERIALS) {
      if (material.absorbs === undefined) continue
      expect(material.behavior).toBe(MaterialBehavior.static)
      expect(material.absorbs).toBeGreaterThan(0)
      expect(material.absorbs).toBeLessThanOrEqual(255)
    }
  })

  it('gives liquid nitrogen no clock, so a spill cannot vanish all at once', () => {
    const nitrogen = MATERIALS[MaterialId.nitrogen]

    // Evaporation is a surface effect in reactions.ts. A lifetime is handed out at paint time, so every
    // cell of a spill counted down together and the whole puddle disappeared on one tick.
    expect(nitrogen.lifetime).toBeUndefined()
    expect(nitrogen.selfHeat).toBeLessThan(0)
  })

  it('runs a spark hotter than wood needs to catch', () => {
    const spark = MATERIALS[MaterialId.spark].selfHeat ?? 0
    const woodCatches = MATERIALS[MaterialId.wood].ignite?.at ?? 0

    // A spark leaves the wire it travels hot behind it. Cooler than this and an electrified bar cannot
    // light a plank lying against it, which is the first thing anyone tries with metal.
    expect(spark).toBeGreaterThan(woodCatches)
  })

  it('keeps every per-cell counter inside the byte that holds it', () => {
    for (const material of MATERIALS) {
      if (material.lifetime !== undefined) expect(material.lifetime).toBeLessThanOrEqual(255)
      if (material.uses !== undefined) expect(material.uses).toBeLessThanOrEqual(255)
      if (material.ignite !== undefined) expect(material.ignite.ticks).toBeLessThanOrEqual(255)
    }
  })
})

describe('canPaintOver', () => {
  it('paints solids over fluids and never the reverse', () => {
    expect(canPaintOver(MaterialId.stone, MaterialId.water)).toBe(true)
    expect(canPaintOver(MaterialId.sand, MaterialId.water)).toBe(true)
    expect(canPaintOver(MaterialId.water, MaterialId.stone)).toBe(false)
    expect(canPaintOver(MaterialId.water, MaterialId.sand)).toBe(false)
  })

  it('treats gases as the loosest thing above air', () => {
    expect(canPaintOver(MaterialId.water, MaterialId.steam)).toBe(true)
    expect(canPaintOver(MaterialId.steam, MaterialId.water)).toBe(false)
    expect(canPaintOver(MaterialId.steam, MaterialId.empty)).toBe(true)
  })

  it('paints through a gas with anything, including another gas', () => {
    // Otherwise a cell's own smoke smothers the fire brush and holding a flame there does nothing.
    expect(canPaintOver(MaterialId.fire, MaterialId.smoke)).toBe(true)
    expect(canPaintOver(MaterialId.smoke, MaterialId.steam)).toBe(true)
    expect(canPaintOver(MaterialId.stone, MaterialId.smoke)).toBe(true)
  })

  it('erases anything', () => {
    expect(canPaintOver(MaterialId.empty, MaterialId.stone)).toBe(true)
    expect(canPaintOver(MaterialId.empty, MaterialId.lava)).toBe(true)
  })

  it('drops an ant straight into the soft stuff it burrows, but not into stone', () => {
    // A nest is set down inside a plank, not only sprinkled on top of it. Every other solid-on-solid
    // brush is refused, so without the ant's exception this would be false.
    expect(canPaintOver(MaterialId.ant, MaterialId.wood)).toBe(true)
    expect(canPaintOver(MaterialId.ant, MaterialId.plant)).toBe(true)
    expect(canPaintOver(MaterialId.ant, MaterialId.stone)).toBe(false)
  })
})

describe('isBurning', () => {
  it('is true only while a burn timer is running', () => {
    expect(isBurning(0)).toBe(false)
    expect(isBurning(1)).toBe(true)
  })
})

describe('every material', () => {
  it('says in one line what it is or what it does', () => {
    for (const material of MATERIALS) {
      expect(material.blurb.length).toBeGreaterThan(0)
      // A tooltip, not a manual: one behaviour, and it has to fit on a line.
      expect(material.blurb.length).toBeLessThanOrEqual(70)
      expect(material.blurb.endsWith('.')).toBe(true)
    }
  })

  it('does not just repeat its own name back', () => {
    for (const material of MATERIALS) {
      expect(material.blurb.toLowerCase()).not.toBe(material.label.toLowerCase())
    }
  })
})

describe('every creature', () => {
  const creatures = MATERIALS.filter((material) => material.life !== undefined)

  it('exists', () => {
    expect(creatures.length).toBeGreaterThan(0)
  })

  it('eats things that exist, and never itself', () => {
    for (const creature of creatures) {
      for (const food of creature.life?.diet ?? []) {
        expect(MATERIALS[food]).toBeDefined()
        expect(food).not.toBe(creature.id)
      }
    }
  })

  it('leaves the slime the only thing nothing preys on', () => {
    // Every grazer and hunter has something above it, which is what keeps its numbers in check — an ant that
    // nothing ate grew a colony without limit. The slime is the deliberate exception: it is the apex.
    const hunted = (id: MaterialId) => creatures.some((eater) => eater.life?.diet.includes(id))

    for (const creature of creatures) {
      // Producers live on light and sit at the bottom of the chain, so nothing has to prey on them.
      if (creature.life?.diet.length === 0) continue
      expect(hunted(creature.id)).toBe(creature.id !== MaterialId.slime)
    }
  })

  it('puts the ant on the menu of the things that would hunt it', () => {
    for (const hunter of [MaterialId.bug, MaterialId.bird, MaterialId.slime]) {
      expect(MATERIALS[hunter].life?.diet).toContain(MaterialId.ant)
    }
  })

  it('gives the slime a leap, since it can neither fly nor burrow', () => {
    // Every other hunter has a way past an obstacle: a bird flies over it and a worm goes under. A slime
    // walks, so without a jump a ledge or a boulder is the end of the hunt and it starves in place.
    expect(MATERIALS[MaterialId.slime].life?.jump).toBeGreaterThan(0)
  })

  it('only gives a leap to something that cannot already fly', () => {
    for (const creature of creatures) {
      if (creature.life?.jump === undefined) continue
      // A flier is already free of the ground; a jump on top of that is motion for nothing.
      expect(creature.life.medium).not.toBe(Medium.air)
    }
  })

  it('gives the ant the sight to find its food', () => {
    // An ant bores blind without it, and starves in a nest whose larder is at the far end of its own
    // galleries — which emptied a sealed case every time.
    expect(MATERIALS[MaterialId.ant].life?.hunts).toBeGreaterThan(0)
  })

  it('leaves room above its breeding line for a full cell to sit', () => {
    for (const creature of creatures) {
      // The `data` byte stops at 255. A threshold at the ceiling means a fed cell drops back under the
      // line before its breeding roll ever lands.
      expect(creature.life?.breedAt).toBeLessThan(240)
      expect(creature.life?.breedChance).toBeGreaterThan(0)
    }
  })

  it('either eats or lives on light, and pays for what it does', () => {
    for (const creature of creatures) {
      const life = creature.life
      if (life === undefined) continue

      if (life.diet.length === 0) {
        // A producer earns from light and spends nothing; a grazer is the other way round.
        expect(life.light ?? 0).toBeGreaterThan(0)
        expect(life.burnRate).toBe(0)
      } else {
        expect(life.feedChance).toBeGreaterThan(0)
        expect(life.nutrition).toBeGreaterThan(0)
        expect(life.burnRate).toBeGreaterThan(0)
      }
    }
  })

  it('burns energy at a rate that is neither immortal nor hopeless', () => {
    for (const creature of creatures) {
      const life = creature.life
      if (life === undefined || life.diet.length === 0) continue

      // Below about a fiftieth nothing ever runs out: a bird on 0.03 could hang over an empty world for a
      // minute and a half. Above a third it starves between one meal and the next.
      expect(life.burnRate).toBeGreaterThanOrEqual(0.02)
      expect(life.burnRate).toBeLessThanOrEqual(0.35)
      // Long enough to cross a room looking for food, on a full tank.
      expect(life.startEnergy / life.burnRate).toBeGreaterThan(600)
    }
  })

  it('can be painted over, because living things are soft', () => {
    for (const creature of creatures) {
      expect(canPaintOver(MaterialId.stone, creature.id)).toBe(true)
    }
  })
})

describe('canDisplace', () => {
  it('lets anything into open air', () => {
    expect(canDisplace(MaterialId.smoke, MaterialId.empty)).toBe(true)
  })

  it('sinks the denser cell through the lighter one, and not the other way', () => {
    expect(canDisplace(MaterialId.sand, MaterialId.water)).toBe(true)
    expect(canDisplace(MaterialId.water, MaterialId.sand)).toBe(false)
  })

  it('stops at anything static, however heavy the cell falling on it', () => {
    // The world's scaffolding: a wall holds up whatever lands on it.
    expect(canDisplace(MaterialId.lava, MaterialId.stone)).toBe(false)
    expect(canDisplace(MaterialId.lava, MaterialId.glass)).toBe(false)
  })

  it('will not swap two cells of the same material, which would be motion for free', () => {
    expect(canDisplace(MaterialId.water, MaterialId.water)).toBe(false)
  })
})

describe('canFloatThrough', () => {
  it('runs the density comparison the other way, so a bubble climbs', () => {
    expect(canFloatThrough(MaterialId.steam, MaterialId.water)).toBe(true)
    expect(canFloatThrough(MaterialId.water, MaterialId.steam)).toBe(false)
  })

  it('cannot rise through something static either', () => {
    expect(canFloatThrough(MaterialId.steam, MaterialId.stone)).toBe(false)
  })
})

describe('explosives and breakables', () => {
  it('leave behind a real material when they go off', () => {
    for (const material of MATERIALS) {
      if (material.explodes === undefined) continue
      expect(MATERIALS[material.explodes.into]).toBeDefined()
      expect(material.explodes.radius).toBeGreaterThan(0)
      expect(material.explodes.impulse).toBeGreaterThan(0)
    }
  })

  it('break into a material that can actually fall away', () => {
    for (const material of MATERIALS) {
      if (material.shatters === undefined) continue
      // Fragments that were static would hang in the hole they were knocked out of.
      expect(MATERIALS[material.shatters].behavior).not.toBe(MaterialBehavior.static)
    }
  })

  it('break into fragments light enough to be thrown about', () => {
    for (const material of MATERIALS) {
      if (material.shatters === undefined) continue
      // Splinters, not rubble: a heavy fragment barely moves when a charge goes off under it.
      expect(MATERIALS[material.shatters].density).toBeLessThan(
        MATERIALS[MaterialId.gravel].density
      )
    }
  })

  it('give a bounce only to something loose enough to be thrown', () => {
    for (const material of MATERIALS) {
      if (material.restitution === undefined) continue
      expect(material.restitution).toBeGreaterThan(0)
      expect(material.behavior).not.toBe(MaterialBehavior.static)
    }
  })
})

describe('the new materials pull their weight', () => {
  it('gives popcorn to something that eats it, since the swatch says so', () => {
    // The blurb promised bugs eat it before any diet did, which is a lie on the palette rather than a bug in
    // the sim. Anything a swatch claims has to be true in the table.
    const eaters = MATERIALS.filter(({ life }) => life?.diet.includes(MaterialId.popcorn))

    expect(eaters.length).toBeGreaterThan(0)
  })

  it('makes pollen the lightest thing in the world, or the air cannot single it out', () => {
    // Both air thresholds scale by how light a material is, so pollen only rides a breeze that leaves sand
    // alone while it stays comfortably lighter than everything else loose.
    const loose = MATERIALS.filter(
      ({ id, behavior }) => id !== MaterialId.pollen && behavior === MaterialBehavior.powder
    )

    for (const material of loose) {
      expect(MATERIALS[MaterialId.pollen].density).toBeLessThan(material.density)
    }
  })

  it('pops the kernel one way, into something that is not another kernel', () => {
    // A thing that keeps popping never settles, and three separate bugs here have been exactly that shape.
    const kernel = MATERIALS[MaterialId.kernel]

    expect(kernel.pops).toBeGreaterThan(0)
    expect(kernel.hot?.into).toBe(MaterialId.popcorn)
    expect(MATERIALS[MaterialId.popcorn].pops).toBeUndefined()
    expect(MATERIALS[MaterialId.popcorn].hot?.into).not.toBe(MaterialId.kernel)
  })

  it('sets glue into something that holds, on the clock a gas uses', () => {
    // No new mechanism: a clock in `data` and a material to become at zero, exactly a gas lifetime. What makes
    // it worth having is that the result is a shape you poured rather than a puddle.
    const glue = MATERIALS[MaterialId.glue]

    expect(glue.behavior).toBe(MaterialBehavior.liquid)
    expect(glue.lifetime).toBeGreaterThan(0)
    expect(glue.expiresInto).toBe(MaterialId.resin)
    expect(MATERIALS[MaterialId.resin].behavior).toBe(MaterialBehavior.static)
  })

  it('gives corruption exactly one weakness, and one the player already owns', () => {
    // A wall it could not cross would make it a non-threat; nothing stopping it would make it a timer.
    const corruption = MATERIALS[MaterialId.corruption]

    expect(corruption.ignite).toBeDefined()
    // Nothing else undoes it: no melt, no freeze, and acid does not get a free pass either.
    expect(corruption.hot).toBeUndefined()
    expect(corruption.cold).toBeUndefined()
  })

  it('bursts the firework into trails rather than expiring quietly', () => {
    const lit = MATERIALS[MaterialId.fireworkLit]

    expect(MATERIALS[MaterialId.firework].hot?.into).toBe(MaterialId.fireworkLit)
    // The launch runs on the same `pops` mechanism a kernel pops with, at its own strength.
    expect(MATERIALS[MaterialId.firework].pops).toBeGreaterThan(0)
    expect(lit.lifetime).toBeGreaterThan(0)
    expect(lit.bursts?.sparks).toBeGreaterThan(1)
    expect(lit.bursts?.speed).toBeGreaterThan(0)
  })

  it('leaves every device static, so the world can be built out of them', () => {
    for (const id of [MaterialId.turbine, MaterialId.blackHole, MaterialId.randomSource]) {
      expect(MATERIALS[id].behavior).toBe(MaterialBehavior.static)
    }
  })
})

describe('a swatch cannot promise what the table does not do', () => {
  /** Words a blurb uses for a phase change, and the field that would have to back each one up. */
  const CLAIMS: readonly { word: RegExp; holds(material: Material): boolean }[] = [
    // Only the intransitive forms, the ones where the material is describing itself. Nitrogen "freezes what
    // it touches" and lava "melts what it lands on" are claims about their neighbours, and the fields that
    // back those live on the neighbour.
    { word: /\bmelts? (to|into|back)\b/i, holds: ({ hot }) => hot !== undefined },
    { word: /\bfreezes? (to|into)\b/i, holds: ({ cold }) => cold !== undefined },
    { word: /\bshatters?\b|\bbreak it\b/i, holds: ({ shatters }) => shatters !== undefined },
  ]

  it('backs every phase change a blurb mentions with the field that does it', () => {
    // Metal's blurb said it melted for a while after its melt was taken away, and popcorn's said bugs ate it
    // before any diet did. Both are lies on the palette rather than bugs in the sim, and neither showed up in
    // anything that ran.
    for (const material of MATERIALS) {
      for (const { word, holds } of CLAIMS) {
        if (!word.test(material.blurb)) continue
        expect(holds(material), `${material.label}: "${material.blurb}"`).toBe(true)
      }
    }
  })
})
