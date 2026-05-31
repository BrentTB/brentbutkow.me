import { describe, it, expect } from 'vitest'
import { getWave, getWaveDelay } from './waves'
import { WORLD_SIZE } from '../data'

describe('getWave', () => {
  it('wave 1 has drones only', () => {
    const spawns = getWave(1, WORLD_SIZE)
    expect(spawns.length).toBeGreaterThan(0)
    expect(spawns.every((s) => s.kind === 'drone')).toBe(true)
  })

  it('later waves include tanks', () => {
    const spawns = getWave(4, WORLD_SIZE)
    expect(spawns.some((s) => s.kind === 'tank')).toBe(true)
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
})

describe('getWaveDelay', () => {
  it('wave 1 has no delay', () => {
    expect(getWaveDelay(1)).toBe(0)
  })

  it('later waves have a delay', () => {
    expect(getWaveDelay(2)).toBeGreaterThan(0)
  })
})
