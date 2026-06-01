import { describe, it, expect } from 'vitest'
import { getWave, getWaveDelay } from './waves'
import { SeededRandom } from './random'
import { EnemyKind } from './types'
import { WORLD_SIZE } from '../data'

function makeRng() {
  return new SeededRandom(42)
}

describe('getWave', () => {
  it('wave 1 has drones only', () => {
    const spawns = getWave(1, WORLD_SIZE, makeRng())
    expect(spawns.length).toBeGreaterThan(0)
    expect(spawns.every((s) => s.kind === EnemyKind.drone)).toBe(true)
  })

  it('later waves include tanks', () => {
    const spawns = getWave(4, WORLD_SIZE, makeRng())
    expect(spawns.some((s) => s.kind === EnemyKind.tank)).toBe(true)
  })

  it('wave count increases with wave number', () => {
    const wave2 = getWave(2, WORLD_SIZE, makeRng())
    const wave5 = getWave(5, WORLD_SIZE, makeRng())
    expect(wave5.length).toBeGreaterThan(wave2.length)
  })

  it('spawns enemies with positions', () => {
    const spawns = getWave(1, WORLD_SIZE, makeRng())
    for (const s of spawns) {
      expect(s.pos.x).toBeGreaterThanOrEqual(0)
      expect(s.pos.y).toBeGreaterThanOrEqual(0)
    }
  })

  it('different RNG seeds produce different spawn positions', () => {
    const a = getWave(1, WORLD_SIZE, new SeededRandom(1))
    const b = getWave(1, WORLD_SIZE, new SeededRandom(2))
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
