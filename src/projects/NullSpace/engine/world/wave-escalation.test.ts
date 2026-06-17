import { describe, it, expect } from 'vitest'
import { waveSpeedEscalation } from './wave-escalation'
import { ENEMY_STATS, SLINGSHOT, WAVE_ESCALATION } from '../../data'

describe('waveSpeedEscalation', () => {
  it('is flat (1.0) through the grace period', () => {
    expect(waveSpeedEscalation(0)).toBe(1)
    expect(waveSpeedEscalation(WAVE_ESCALATION.gracePeriod)).toBe(1)
  })

  it('ramps up linearly after the grace period', () => {
    const after = waveSpeedEscalation(WAVE_ESCALATION.gracePeriod + 10)
    expect(after).toBeGreaterThan(1)
    expect(after).toBeCloseTo(1 + 10 * WAVE_ESCALATION.rampPerSec, 5)
  })

  it('caps at maxMult and never exceeds it', () => {
    expect(waveSpeedEscalation(100000)).toBe(WAVE_ESCALATION.maxMult)
  })

  it('keeps escalated enemies below a slingshot fling so the player can escape', () => {
    // A drone escalated to the cap stays under a full slingshot fling, so the
    // player can always outrun a stalled wave.
    expect(ENEMY_STATS.drone.speed * WAVE_ESCALATION.maxMult).toBeLessThan(SLINGSHOT.baseSpeed)
  })
})
