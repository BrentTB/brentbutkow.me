import { describe, it, expect, beforeEach } from 'vitest'
import { getWave, getWaveDelay } from './waves'
import { rng } from './random'
import { EnemyKind } from './types'

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
})

describe('getWaveDelay', () => {
  it('wave 1 has no delay', () => {
    expect(getWaveDelay(1)).toBe(0)
  })

  it('later waves have a delay', () => {
    expect(getWaveDelay(2)).toBeGreaterThan(0)
  })
})
