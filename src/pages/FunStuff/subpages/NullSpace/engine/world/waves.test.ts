import { describe, it, expect, beforeEach } from 'vitest'
import { getBossForWave, getWave, getWaveDelay, isBossWave } from './waves'
import { rng } from '../math/random'
import { EnemyKind } from '../types'

beforeEach(() => {
  rng.reseed(42)
})

describe('getWave', () => {
  it('wave 1 has drones only', () => {
    const kinds = getWave(1)
    expect(kinds.length).toBeGreaterThan(0)
    expect(kinds.every((k) => k === EnemyKind.drone)).toBe(true)
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
  it('wave 9 queue ends with the dreadnought boss', () => {
    const queue = getWave(9)
    expect(queue[queue.length - 1]).toBe(EnemyKind.dreadnought)
  })

  it('wave 9 has fewer regular enemies than wave 8', () => {
    const wave8 = getWave(8)
    const wave9 = getWave(9)
    const regularCount = (queue: EnemyKind[]) =>
      queue.filter((k) => k !== EnemyKind.dreadnought && k !== EnemyKind.shieldGenerator).length
    expect(regularCount(wave9)).toBeLessThan(regularCount(wave8))
  })

  it('getBossForWave returns dreadnought for any wave in pt1', () => {
    expect(getBossForWave(9)).toBe(EnemyKind.dreadnought)
    expect(getBossForWave(18)).toBe(EnemyKind.dreadnought)
  })
})
