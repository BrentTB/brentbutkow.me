import { describe, it, expect, beforeEach } from 'vitest'
import { getWave, getWaveDelay } from './waves'
import { rng } from './random'
import { EnemyKind } from './types'
import { WORLD_SIZE } from '../data'

beforeEach(() => {
  rng.reseed(42)
})

describe('getWave', () => {
  it('wave 1 has drones only', () => {
    const spawns = getWave(1, WORLD_SIZE)
    expect(spawns.length).toBeGreaterThan(0)
    expect(spawns.every((s) => s.kind === EnemyKind.drone)).toBe(true)
  })

  it('later waves include tanks', () => {
    const spawns = getWave(4, WORLD_SIZE)
    expect(spawns.some((s) => s.kind === EnemyKind.tank)).toBe(true)
  })

  it('wave count increases with wave number', () => {
    const wave2 = getWave(2, WORLD_SIZE)
    const wave5 = getWave(5, WORLD_SIZE)
    expect(wave5.length).toBeGreaterThan(wave2.length)
  })

  it('spawns enemies with positions', () => {
    const spawns = getWave(1, WORLD_SIZE)
    for (const s of spawns) {
      expect(s.pos.x).toBeGreaterThanOrEqual(0)
      expect(s.pos.y).toBeGreaterThanOrEqual(0)
    }
  })

  it('different seeds produce different spawn positions', () => {
    rng.reseed(1)
    const a = getWave(1, WORLD_SIZE)
    rng.reseed(2)
    const b = getWave(1, WORLD_SIZE)
    const positionsA = a.map((s) => `${s.pos.x.toFixed(1)},${s.pos.y.toFixed(1)}`)
    const positionsB = b.map((s) => `${s.pos.x.toFixed(1)},${s.pos.y.toFixed(1)}`)
    expect(positionsA).not.toEqual(positionsB)
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
