import { WAVE_ESCALATION } from '../../data'

// Speed multiplier applied to surviving enemies as a wave drags on. Flat 1.0
// through the grace period, then an immediate `initialStep` jump the instant grace
// ends, plus a linear ramp with time-since-grace, capped at maxMult. The jump makes
// the speed-up read as an event (lined up with the warning countdown) rather than a
// silent creep. Boss waves use a longer grace before ramping.
export function waveSpeedEscalation(waveElapsed: number, isBoss = false): number {
  const grace = isBoss ? WAVE_ESCALATION.bossGracePeriod : WAVE_ESCALATION.gracePeriod
  const over = waveElapsed - grace
  if (over <= 0) return 1
  return Math.min(
    WAVE_ESCALATION.maxMult,
    1 + WAVE_ESCALATION.initialStep + over * WAVE_ESCALATION.rampPerSec
  )
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
