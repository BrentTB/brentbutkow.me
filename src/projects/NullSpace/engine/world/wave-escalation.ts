import { WAVE_ESCALATION } from '../../data'

// Speed multiplier applied to surviving enemies as a wave drags on. Flat 1.0
// through the grace period, then ramps linearly with time-since-grace, capped at
// maxMult. Breaks the "enemies trail the ship forever" stall without a hard timer.
export function waveSpeedEscalation(waveElapsed: number): number {
  const over = Math.max(0, waveElapsed - WAVE_ESCALATION.gracePeriod)
  return Math.min(WAVE_ESCALATION.maxMult, 1 + over * WAVE_ESCALATION.rampPerSec)
}
