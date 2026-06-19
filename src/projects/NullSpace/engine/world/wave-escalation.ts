import { WAVE_ESCALATION } from '../../data'

// Speed multiplier applied to surviving enemies as a wave drags on. Flat 1.0
// through the grace period, then ramps linearly with time-since-grace, capped at
// maxMult. Breaks the "enemies trail the ship forever" stall without a hard timer.
// Boss waves are long by design, so they use a longer grace before ramping.
export function waveSpeedEscalation(waveElapsed: number, isBoss = false): number {
  const grace = isBoss ? WAVE_ESCALATION.bossGracePeriod : WAVE_ESCALATION.gracePeriod
  const over = Math.max(0, waveElapsed - grace)
  return Math.min(WAVE_ESCALATION.maxMult, 1 + over * WAVE_ESCALATION.rampPerSec)
}
