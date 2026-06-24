import { describe, it, expect } from 'vitest'
import { bankPlaySegment } from './run-duration'

describe('bankPlaySegment', () => {
  it('adds the live segment to the already-banked time', () => {
    expect(bankPlaySegment(60_000, 600_000, 620_000)).toBe(80_000)
  })

  // Regression: resuming a run used to reset the clock, so only the post-resume
  // segment was submitted. Banking each segment makes the total span a leave →
  // Continue, excluding the away time (the gap between segments).
  it('sums play across a leave/resume, excluding away time', () => {
    const afterFirstWave = bankPlaySegment(0, 0, 60_000) // played 0–60s, then left
    // Resumed at 10min wall-clock; the 60s–600s away gap is never a segment.
    const afterDeath = bankPlaySegment(afterFirstWave, 600_000, 620_000)
    expect(afterDeath).toBe(80_000)
  })

  it('clamps a backwards clock to bank no negative time', () => {
    expect(bankPlaySegment(5_000, 1_000, 400)).toBe(5_000)
  })
})
