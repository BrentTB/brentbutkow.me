// A run's total play-time is the sum of its play segments. Each autosave and
// each pause (plus the final game-over) ends the live segment and banks it, so
// the duration sent to the leaderboard survives a Save & Exit → Continue instead
// of resetting to just the post-resume segment. Time outside a segment — away
// (between leaving and resuming) or paused — is never banked, so it's excluded
// for free. The clamp guards a clock that ran backwards (manual system-time
// change) from banking negative time.
export function bankPlaySegment(bankedMs: number, segmentStartMs: number, nowMs: number): number {
  return bankedMs + Math.max(0, nowMs - segmentStartMs)
}
