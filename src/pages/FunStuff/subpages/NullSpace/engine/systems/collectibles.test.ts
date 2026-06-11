import { describe, it, expect, beforeEach } from 'vitest'
import {
  spawnCollectiblesFromKills,
  updateCollectibles,
  tryCollectSpaceMetal,
} from './collectibles'
import { createShip, createEnemy } from '../entities/entity-creator'
import { rng } from '../math/random'
import { CollectibleKind, EnemyKind, ShipKind } from '../types'
import type { Collectible } from '../types'
import { WORLD_SIZE, POWER_ORB, SINGULARITY_SHARD, SPACE_METAL } from '../../data'

beforeEach(() => {
  rng.reseed(42)
})

function makeOrb(overrides: Partial<Collectible> = {}): Collectible {
  return {
    id: 'orb',
    kind: CollectibleKind.powerOrb,
    pos: { x: 0, y: 0 },
    vel: { x: 0, y: 0 },
    value: 5,
    elapsed: 0,
    lifetime: POWER_ORB.lifetime,
    homing: false,
    ...overrides,
  }
}

function makeMetal(overrides: Partial<Collectible> = {}): Collectible {
  return {
    id: 'metal',
    kind: CollectibleKind.spaceMetal,
    pos: { x: 0, y: 0 },
    vel: { x: 0, y: 0 },
    value: 1,
    elapsed: 0,
    lifetime: SPACE_METAL.lifetime,
    homing: false,
    ...overrides,
  }
}

function makeShard(overrides: Partial<Collectible> = {}): Collectible {
  return {
    id: 'shard',
    kind: CollectibleKind.singularityShard,
    pos: { x: 0, y: 0 },
    vel: { x: 0, y: 0 },
    value: 1,
    elapsed: 0,
    lifetime: SINGULARITY_SHARD.lifetime,
    homing: false,
    ...overrides,
  }
}

describe('spawnCollectiblesFromKills', () => {
  it('spawns a power orb per killed enemy', () => {
    const enemies = [
      createEnemy(EnemyKind.drone, { x: 100, y: 100 }),
      createEnemy(EnemyKind.tank, { x: 200, y: 200 }),
    ]
    const collectibles = spawnCollectiblesFromKills(enemies)
    const orbs = collectibles.filter((c) => c.kind === CollectibleKind.powerOrb)
    expect(orbs.length).toBe(2)
    expect(orbs[0].value).toBe(enemies[0].powerReward)
    expect(orbs[1].value).toBe(enemies[1].powerReward)
  })

  it('power orbs spawn at enemy death position', () => {
    const enemy = createEnemy(EnemyKind.drone, { x: 300, y: 400 })
    const collectibles = spawnCollectiblesFromKills([enemy])
    const orb = collectibles.find((c) => c.kind === CollectibleKind.powerOrb)!
    expect(orb.pos.x).toBe(300)
    expect(orb.pos.y).toBe(400)
  })

  it('spawned collectibles start non-homing', () => {
    const enemy = createEnemy(EnemyKind.tank, { x: 100, y: 100 })
    const collectibles = spawnCollectiblesFromKills([enemy])
    for (const c of collectibles) {
      expect(c.homing).toBe(false)
    }
  })

  it('may spawn space metal based on drop chance', () => {
    const enemies = Array.from({ length: 100 }, () =>
      createEnemy(EnemyKind.tank, { x: 100, y: 100 })
    )
    const collectibles = spawnCollectiblesFromKills(enemies)
    const metals = collectibles.filter((c) => c.kind === CollectibleKind.spaceMetal)
    expect(metals.length).toBeGreaterThan(0)
    expect(metals.length).toBeLessThan(100)
  })

  it('a boss kill drops exactly one singularity shard', () => {
    const boss = createEnemy(EnemyKind.dreadnought, { x: 100, y: 100 })
    const collectibles = spawnCollectiblesFromKills([boss])
    const shards = collectibles.filter((c) => c.kind === CollectibleKind.singularityShard)
    expect(shards.length).toBe(1)
  })

  it('regular enemy kills drop no singularity shards', () => {
    const enemies = Array.from({ length: 50 }, () => createEnemy(EnemyKind.tank, { x: 0, y: 0 }))
    const collectibles = spawnCollectiblesFromKills(enemies)
    expect(collectibles.some((c) => c.kind === CollectibleKind.singularityShard)).toBe(false)
  })

  it('the space-metal drop multiplier raises drop chance (guaranteed at large multipliers)', () => {
    // tank base chance 0.12 × 100 ≥ 1 → every kill drops.
    const enemies = Array.from({ length: 10 }, () => createEnemy(EnemyKind.tank, { x: 0, y: 0 }))
    const metals = spawnCollectiblesFromKills(enemies, 100).filter(
      (c) => c.kind === CollectibleKind.spaceMetal
    )
    expect(metals.length).toBe(10)
  })

  it('the power-orb multiplier scales the power gained per kill', () => {
    const enemy = createEnemy(EnemyKind.tank, { x: 0, y: 0 })
    const orb = spawnCollectiblesFromKills([enemy], 1, 2).find(
      (c) => c.kind === CollectibleKind.powerOrb
    )!
    expect(orb.value).toBe(enemy.powerReward * 2)
  })
})

describe('updateCollectibles', () => {
  const ship = createShip(ShipKind.fighter, WORLD_SIZE)

  it('power orbs auto-transition to homing after the float duration', () => {
    const orb = makeOrb({
      pos: { x: ship.pos.x + 200, y: ship.pos.y },
      elapsed: POWER_ORB.floatDuration,
    })
    const result = updateCollectibles([orb], ship, 0.016)
    expect(result.collectibles[0]?.homing).toBe(true)
  })

  it('homing power orbs are collected when they reach the ship', () => {
    const orb = makeOrb({
      pos: { x: ship.pos.x + 1, y: ship.pos.y },
      value: 10,
      elapsed: POWER_ORB.floatDuration + 1,
      homing: true,
    })
    const result = updateCollectibles([orb], ship, 0.016)
    expect(result.powerGained).toBe(10)
    expect(result.spaceMetalGained).toBe(0)
    expect(result.collectibles.length).toBe(0)
  })

  it('power orbs drift during float phase', () => {
    const orb = makeOrb({
      pos: { x: 100, y: 100 },
      vel: { x: 20, y: 0 },
      elapsed: 0,
      homing: false,
    })
    const result = updateCollectibles([orb], ship, 0.1)
    expect(result.collectibles.length).toBe(1)
    expect(result.collectibles[0].pos.x).toBeGreaterThan(100)
    expect(result.powerGained).toBe(0)
  })

  it('non-homing space metal does NOT move and is NOT collected even at the ship', () => {
    const metal = makeMetal({ pos: { x: ship.pos.x, y: ship.pos.y } })
    const result = updateCollectibles([metal], ship, 0.5)
    expect(result.collectibles.length).toBe(1)
    expect(result.collectibles[0].pos).toEqual({ x: ship.pos.x, y: ship.pos.y })
    expect(result.spaceMetalGained).toBe(0)
    expect(result.powerGained).toBe(0)
  })

  it('homing space metal flies toward the ship', () => {
    const metal = makeMetal({
      pos: { x: ship.pos.x + 200, y: ship.pos.y },
      homing: true,
    })
    const before = metal.pos.x
    const result = updateCollectibles([metal], ship, 0.05)
    const after = result.collectibles.find((c) => c.id === metal.id)
    expect(after).toBeDefined()
    expect(after!.pos.x).toBeLessThan(before)
  })

  it('homing space metal credits the counter when it reaches the ship', () => {
    const metal = makeMetal({
      pos: { x: ship.pos.x + 1, y: ship.pos.y },
      value: 1,
      homing: true,
    })
    const result = updateCollectibles([metal], ship, 0.016)
    expect(result.spaceMetalGained).toBe(1)
    expect(result.collectibles.length).toBe(0)
  })

  it('singularity shards auto-transition to homing after the float duration (no click)', () => {
    const shard = makeShard({
      pos: { x: ship.pos.x + 200, y: ship.pos.y },
      elapsed: SINGULARITY_SHARD.floatDuration,
    })
    const result = updateCollectibles([shard], ship, 0.016)
    expect(result.collectibles[0]?.homing).toBe(true)
  })

  it('homing singularity shards credit the counter when they reach the ship', () => {
    const shard = makeShard({ pos: { x: ship.pos.x + 1, y: ship.pos.y }, homing: true })
    const result = updateCollectibles([shard], ship, 0.016)
    expect(result.singularityShardGained).toBe(1)
    expect(result.collectibles.length).toBe(0)
  })

  it('homing collectibles ignore lifetime (must always reach the ship)', () => {
    const metal = makeMetal({
      pos: { x: ship.pos.x + 500, y: ship.pos.y },
      elapsed: SPACE_METAL.lifetime - 0.01,
      lifetime: SPACE_METAL.lifetime,
      homing: true,
    })
    const result = updateCollectibles([metal], ship, 0.1)
    expect(result.collectibles.length).toBe(1)
  })

  it('non-homing collectibles still expire after lifetime', () => {
    const orb = makeOrb({
      pos: { x: 100, y: 100 },
      elapsed: POWER_ORB.lifetime - 0.01,
      lifetime: POWER_ORB.lifetime,
      homing: false,
    })
    const result = updateCollectibles([orb], ship, 0.1)
    expect(result.collectibles.length).toBe(0)
    expect(result.powerGained).toBe(0)
  })
})

describe('tryCollectSpaceMetal', () => {
  it('marks clicked metal as homing — does not immediately credit the counter', () => {
    const metal = makeMetal({ pos: { x: 100, y: 100 } })
    const result = tryCollectSpaceMetal([metal], [{ x: 105, y: 100 }])
    expect(result.collectibles.length).toBe(1)
    expect(result.collectibles[0].homing).toBe(true)
    expect(result.remainingClicks.length).toBe(0)
  })

  it('does not affect metal when clicking outside radius', () => {
    const metal = makeMetal({ pos: { x: 100, y: 100 } })
    const result = tryCollectSpaceMetal([metal], [{ x: 200, y: 200 }])
    expect(result.collectibles[0].homing).toBe(false)
    expect(result.remainingClicks.length).toBe(1)
  })

  it('consumed click is not passed through as remaining', () => {
    const metal = makeMetal({ pos: { x: 100, y: 100 } })
    const clicks = [
      { x: 105, y: 100 },
      { x: 500, y: 500 },
    ]
    const result = tryCollectSpaceMetal([metal], clicks)
    expect(result.collectibles[0].homing).toBe(true)
    expect(result.remainingClicks).toEqual([{ x: 500, y: 500 }])
  })

  it('a second click on already-homing metal passes through as remaining', () => {
    const metal = makeMetal({ pos: { x: 100, y: 100 }, homing: true })
    const result = tryCollectSpaceMetal([metal], [{ x: 105, y: 100 }])
    expect(result.remainingClicks).toEqual([{ x: 105, y: 100 }])
    expect(result.collectibles[0].homing).toBe(true)
  })

  it('ignores power orbs', () => {
    const orb = makeOrb({ pos: { x: 100, y: 100 } })
    const result = tryCollectSpaceMetal([orb], [{ x: 100, y: 100 }])
    expect(result.remainingClicks.length).toBe(1)
    expect(result.collectibles[0].kind).toBe(CollectibleKind.powerOrb)
    expect(result.collectibles[0].homing).toBe(false)
  })
})
