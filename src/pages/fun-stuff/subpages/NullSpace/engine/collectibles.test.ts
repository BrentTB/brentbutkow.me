import { describe, it, expect, beforeEach } from 'vitest'
import {
  spawnCollectiblesFromKills,
  updateCollectibles,
  tryCollectSpaceMetal,
} from './collectibles'
import { createShip, createEnemy, resetUid } from './entities'
import { rng } from './random'
import { CollectibleKind, EnemyKind } from './types'
import { WORLD_SIZE, POWER_ORB, SPACE_METAL } from '../data'

beforeEach(() => {
  resetUid()
  rng.reseed(42)
})

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

  it('may spawn space metal based on drop chance', () => {
    const enemies = Array.from({ length: 100 }, () =>
      createEnemy(EnemyKind.tank, { x: 100, y: 100 })
    )
    const collectibles = spawnCollectiblesFromKills(enemies)
    const metals = collectibles.filter((c) => c.kind === CollectibleKind.spaceMetal)
    expect(metals.length).toBeGreaterThan(0)
    expect(metals.length).toBeLessThan(100)
  })
})

describe('updateCollectibles', () => {
  const ship = createShip(WORLD_SIZE)

  it('power orbs are collected when within ship radius', () => {
    const orb = {
      id: 'orb1',
      kind: CollectibleKind.powerOrb,
      pos: { x: ship.pos.x + 1, y: ship.pos.y },
      vel: { x: -1, y: 0 },
      value: 10,
      elapsed: POWER_ORB.floatDuration + 1,
      lifetime: POWER_ORB.lifetime,
    }
    const result = updateCollectibles([orb], ship, 0.016)
    expect(result.powerGained).toBe(10)
    expect(result.collectibles.length).toBe(0)
  })

  it('power orbs drift during float phase', () => {
    const orb = {
      id: 'orb1',
      kind: CollectibleKind.powerOrb,
      pos: { x: 100, y: 100 },
      vel: { x: 20, y: 0 },
      value: 5,
      elapsed: 0,
      lifetime: POWER_ORB.lifetime,
    }
    const result = updateCollectibles([orb], ship, 0.1)
    expect(result.collectibles.length).toBe(1)
    expect(result.collectibles[0].pos.x).toBeGreaterThan(100)
    expect(result.powerGained).toBe(0)
  })

  it('space metal persists and is not auto-collected', () => {
    const metal = {
      id: 'metal1',
      kind: CollectibleKind.spaceMetal,
      pos: { x: ship.pos.x, y: ship.pos.y },
      vel: { x: 0, y: 0 },
      value: 1,
      elapsed: 0,
      lifetime: SPACE_METAL.lifetime,
    }
    const result = updateCollectibles([metal], ship, 0.5)
    expect(result.collectibles.length).toBe(1)
    expect(result.powerGained).toBe(0)
  })

  it('collectibles expire after lifetime', () => {
    const orb = {
      id: 'orb1',
      kind: CollectibleKind.powerOrb,
      pos: { x: 100, y: 100 },
      vel: { x: 0, y: 0 },
      value: 5,
      elapsed: POWER_ORB.lifetime - 0.01,
      lifetime: POWER_ORB.lifetime,
    }
    const result = updateCollectibles([orb], ship, 0.1)
    expect(result.collectibles.length).toBe(0)
    expect(result.powerGained).toBe(0)
  })
})

describe('tryCollectSpaceMetal', () => {
  it('collects space metal when clicking within radius', () => {
    const metal = {
      id: 'metal1',
      kind: CollectibleKind.spaceMetal,
      pos: { x: 100, y: 100 },
      vel: { x: 0, y: 0 },
      value: 1,
      elapsed: 0,
      lifetime: SPACE_METAL.lifetime,
    }
    const result = tryCollectSpaceMetal([metal], [{ x: 105, y: 100 }])
    expect(result.spaceMetalGained).toBe(1)
    expect(result.collectibles.length).toBe(0)
    expect(result.remainingClicks.length).toBe(0)
  })

  it('does not collect when clicking outside radius', () => {
    const metal = {
      id: 'metal1',
      kind: CollectibleKind.spaceMetal,
      pos: { x: 100, y: 100 },
      vel: { x: 0, y: 0 },
      value: 1,
      elapsed: 0,
      lifetime: SPACE_METAL.lifetime,
    }
    const result = tryCollectSpaceMetal([metal], [{ x: 200, y: 200 }])
    expect(result.spaceMetalGained).toBe(0)
    expect(result.collectibles.length).toBe(1)
    expect(result.remainingClicks.length).toBe(1)
  })

  it('consumed click is not passed through as remaining', () => {
    const metal = {
      id: 'metal1',
      kind: CollectibleKind.spaceMetal,
      pos: { x: 100, y: 100 },
      vel: { x: 0, y: 0 },
      value: 1,
      elapsed: 0,
      lifetime: SPACE_METAL.lifetime,
    }
    const clicks = [
      { x: 105, y: 100 },
      { x: 500, y: 500 },
    ]
    const result = tryCollectSpaceMetal([metal], clicks)
    expect(result.spaceMetalGained).toBe(1)
    expect(result.remainingClicks).toEqual([{ x: 500, y: 500 }])
  })

  it('ignores power orbs', () => {
    const orb = {
      id: 'orb1',
      kind: CollectibleKind.powerOrb,
      pos: { x: 100, y: 100 },
      vel: { x: 0, y: 0 },
      value: 5,
      elapsed: 0,
      lifetime: 10,
    }
    const result = tryCollectSpaceMetal([orb], [{ x: 100, y: 100 }])
    expect(result.spaceMetalGained).toBe(0)
    expect(result.remainingClicks.length).toBe(1)
  })
})
