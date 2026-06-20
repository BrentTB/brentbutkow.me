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

// How many seconds before the speed-up the warning countdown appears.
export const SPEEDUP_WARNING_LEAD = 10

// Seconds until enemies start speeding up, but only within the final
// SPEEDUP_WARNING_LEAD-second window — null otherwise (too early, or the ramp has
// already begun). Purely a UI telegraph; the speed-up itself is unchanged, driven
// by waveSpeedEscalation. Counting to 0 lines up exactly with the grace period end.
export function secondsUntilSpeedUp(waveElapsed: number, isBoss = false): number | null {
  const grace = isBoss ? WAVE_ESCALATION.bossGracePeriod : WAVE_ESCALATION.gracePeriod
  const remaining = grace - waveElapsed
  if (remaining <= 0 || remaining > SPEEDUP_WARNING_LEAD) return null
  return remaining
}
