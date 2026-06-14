import { describe, it, expect, beforeEach } from 'vitest'
import {
  getWave,
  getWaveArchetype,
  getWaveDelay,
  isBossWave,
  sectorProgress,
  WaveArchetype,
} from './waves'
import { rng } from '../math/random'
import { EnemyKind } from '../types'
import { WAVES_PER_LEVEL, WAVE_COMP, WAVE_THEME } from '../../data'

beforeEach(() => {
  rng.reseed(42)
})

describe('getWave', () => {
  it('wave 1 has drones only', () => {
    const kinds = getWave(1)
    expect(kinds.length).toBeGreaterThan(0)
    expect(kinds.every((k) => k === EnemyKind.drone)).toBe(true)
  })

  // The wave-clear gate needs at least one enemy; a zero-count composition would
  // stall sector progression. Pins that no archetype/wave ever spawns empty.
  it('never returns an empty wave across a deep run', () => {
    for (let wave = 1; wave <= 200; wave++) {
      expect(getWave(wave).length).toBeGreaterThan(0)
    }
  })

  it('later waves include tanks', () => {
    const kinds = getWave(4)
    expect(kinds.some((k) => k === EnemyKind.tank)).toBe(true)
  })

  it('wave count increases with wave number', () => {
    const wave2 = getWave(2)
    const wave5 = getWave(5)
    expect(wave5.length).toBeGreaterThan(wave2.length)
  })

  it('shuffles the enemy order', () => {
    rng.reseed(1)
    const a = getWave(4)
    rng.reseed(2)
    const b = getWave(4)
    expect(a).not.toEqual(b)
  })

  it('wave 5 and later include bombers', () => {
    const kinds = getWave(8)
    expect(kinds.some((k) => k === EnemyKind.bomber)).toBe(true)
  })

  it('wave 4 and later include swarm packs', () => {
    const kinds = getWave(7)
    expect(kinds.some((k) => k === EnemyKind.swarm)).toBe(true)
    expect(kinds.filter((k) => k === EnemyKind.swarm).length).toBeGreaterThanOrEqual(5)
  })

  it('early waves have no swarm or bomber', () => {
    const wave1 = getWave(1)
    const wave2 = getWave(2)
    expect(wave1.every((k) => k !== EnemyKind.swarm && k !== EnemyKind.bomber)).toBe(true)
    expect(wave2.every((k) => k !== EnemyKind.swarm && k !== EnemyKind.bomber)).toBe(true)
  })
})

describe('getWaveDelay', () => {
  it('wave 1 has no delay', () => {
    expect(getWaveDelay(1)).toBe(0)
  })

  it('later waves have a delay', () => {
    expect(getWaveDelay(2)).toBeGreaterThan(0)
  })
})

describe('isBossWave', () => {
  it('wave 9 is a boss wave', () => {
    expect(isBossWave(9)).toBe(true)
  })

  it('wave 18 is a boss wave', () => {
    expect(isBossWave(18)).toBe(true)
  })

  it('wave 27 is a boss wave', () => {
    expect(isBossWave(27)).toBe(true)
  })

  it('non-multiples of 9 are not boss waves', () => {
    expect(isBossWave(1)).toBe(false)
    expect(isBossWave(8)).toBe(false)
    expect(isBossWave(10)).toBe(false)
    expect(isBossWave(17)).toBe(false)
  })
})

describe('getWave — boss waves', () => {
  it('wave 9 queue ends with the requested boss kind', () => {
    const queue = getWave(9, EnemyKind.dreadnought)
    expect(queue[queue.length - 1]).toBe(EnemyKind.dreadnought)
  })

  it('appends whichever boss kind is passed', () => {
    const queue = getWave(9, EnemyKind.voidWorm)
    expect(queue[queue.length - 1]).toBe(EnemyKind.voidWorm)
  })

  it('appends no boss when none is provided', () => {
    const queue = getWave(9)
    expect(queue.every((k) => k !== EnemyKind.dreadnought)).toBe(true)
  })

  it('ignores the boss kind on non-boss waves', () => {
    const queue = getWave(8, EnemyKind.dreadnought)
    expect(queue.every((k) => k !== EnemyKind.dreadnought)).toBe(true)
  })

  it('wave 9 has fewer regular enemies than wave 8', () => {
    const wave8 = getWave(8)
    const wave9 = getWave(9, EnemyKind.dreadnought)
    const regularCount = (queue: EnemyKind[]) =>
      queue.filter((k) => k !== EnemyKind.dreadnought && k !== EnemyKind.shieldGenerator).length
    expect(regularCount(wave9)).toBeLessThan(regularCount(wave8))
  })
})

describe('getWaveArchetype', () => {
  it('boss and early waves are always mixed', () => {
    expect(getWaveArchetype(9)).toBe(WaveArchetype.mixed) // boss
    expect(getWaveArchetype(2)).toBe(WaveArchetype.mixed) // early
    expect(getWaveArchetype(WAVE_THEME.startWave - 1)).toBe(WaveArchetype.mixed)
  })

  it('never themes odd waves (so themed waves never run back-to-back)', () => {
    for (let w = WAVE_THEME.startWave + 1; w < 40; w += 2) {
      expect(getWaveArchetype(w)).toBe(WaveArchetype.mixed)
    }
  })

  it('yields both mixed and themed waves on an even wave past startWave', () => {
    // Reseed once, then draw repeatedly so the rng advances continuously (a fresh
    // reseed per call biases the first draw, unlike a real run's single reseed).
    rng.reseed(1)
    const seen = new Set<WaveArchetype>()
    for (let i = 0; i < 200; i++) seen.add(getWaveArchetype(WAVE_THEME.startWave))
    expect(seen.has(WaveArchetype.mixed)).toBe(true)
    expect([...seen].some((a) => a !== WaveArchetype.mixed)).toBe(true)
  })
})

describe('getWave — themed composition', () => {
  // getWave calls getWaveArchetype first, so re-seeding to the same value
  // reproduces the archetype the queue was built from.
  const findSeedFor = (archetype: WaveArchetype, wave: number): number | null => {
    for (let s = 0; s < 300; s++) {
      rng.reseed(s)
      if (getWaveArchetype(wave) === archetype) return s
    }
    return null
  }

  it('swarmOnly waves contain only swarm', () => {
    const seed = findSeedFor(WaveArchetype.swarmOnly, WAVE_THEME.startWave)
    expect(seed).not.toBeNull()
    rng.reseed(seed as number)
    const q = getWave(WAVE_THEME.startWave)
    expect(q.length).toBeGreaterThan(0)
    expect(q.every((k) => k === EnemyKind.swarm)).toBe(true)
  })

  it('allTank waves contain only tanks', () => {
    const seed = findSeedFor(WaveArchetype.allTank, WAVE_THEME.startWave)
    expect(seed).not.toBeNull()
    rng.reseed(seed as number)
    const q = getWave(WAVE_THEME.startWave)
    expect(q.length).toBeGreaterThan(0)
    expect(q.every((k) => k === EnemyKind.tank)).toBe(true)
  })
})

describe('getWave — late-game caps', () => {
  it('caps drone count past the threshold and converts overflow to harder kinds', () => {
    rng.reseed(7)
    const wave41 = getWave(41) // odd → always mixed
    expect(wave41.filter((k) => k === EnemyKind.drone).length).toBeLessThanOrEqual(
      WAVE_COMP.maxDrones
    )
    // Drone overflow becomes tanks, so late mixed waves are tank-heavy.
    expect(wave41.filter((k) => k === EnemyKind.tank).length).toBeGreaterThan(5)
    expect(wave41.length).toBeGreaterThan(getWave(11).length)
  })
})

describe('sectorProgress', () => {
  it('returns 0 before a game starts (wave 0)', () => {
    expect(
      sectorProgress({ wave: 0, spawnedInWave: 0, enemiesAlive: 0, totalWaveEnemies: 0 })
    ).toBe(0)
  })

  it('advances within a wave as its enemies die', () => {
    const half = sectorProgress({
      wave: 1,
      spawnedInWave: 10,
      enemiesAlive: 5,
      totalWaveEnemies: 10,
    })
    // First wave half-cleared → halfway through its 1/WAVES_PER_LEVEL segment.
    expect(half).toBeCloseTo(0.5 / WAVES_PER_LEVEL)
  })

  it('fills one whole segment per cleared wave', () => {
    // Second wave, none killed yet → exactly one segment filled.
    const oneWaveCleared = sectorProgress({
      wave: 2,
      spawnedInWave: 0,
      enemiesAlive: 0,
      totalWaveEnemies: 8,
    })
    expect(oneWaveCleared).toBeCloseTo(1 / WAVES_PER_LEVEL)
  })

  it('clamps to 1 at most and never below 0', () => {
    // Last wave of the sector fully cleared → bar full.
    const full = sectorProgress({
      wave: WAVES_PER_LEVEL,
      spawnedInWave: 6,
      enemiesAlive: 0,
      totalWaveEnemies: 6,
    })
    expect(full).toBe(1)
    // More alive than spawned (transient mid-frame) can't drive it negative.
    const floored = sectorProgress({
      wave: 1,
      spawnedInWave: 0,
      enemiesAlive: 3,
      totalWaveEnemies: 6,
    })
    expect(floored).toBe(0)
  })
})
