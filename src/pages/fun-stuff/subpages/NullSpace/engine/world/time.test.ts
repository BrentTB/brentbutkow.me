import { describe, it, expect } from 'vitest'
import {
  createGameTime,
  tickGameTime,
  pauseGameTime,
  resumeGameTime,
  setGameSpeed,
  MAX_DT,
} from './time'

describe('createGameTime', () => {
  it('starts unpaused at speed 1 with no last frame', () => {
    const t = createGameTime()
    expect(t.paused).toBe(false)
    expect(t.speed).toBe(1)
    expect(t.lastFrameMs).toBe(0)
  })
})

describe('tickGameTime', () => {
  it('returns dt=0 on the very first tick (no previous frame)', () => {
    const result = tickGameTime(createGameTime(), 1000)
    expect(result.dt).toBe(0)
    expect(result.time.lastFrameMs).toBe(1000)
  })

  it('returns wall-clock dt on subsequent ticks', () => {
    let t = createGameTime()
    t = tickGameTime(t, 1000).time
    const result = tickGameTime(t, 1016)
    expect(result.dt).toBeCloseTo(0.016, 5)
    expect(result.time.lastFrameMs).toBe(1016)
  })

  it('caps dt at MAX_DT when a frame takes longer than MAX_DT seconds', () => {
    let t = createGameTime()
    t = tickGameTime(t, 0).time
    const result = tickGameTime(t, 5000)
    expect(result.dt).toBeCloseTo(MAX_DT, 5)
  })

  it('returns dt=0 while paused regardless of wall-clock delta', () => {
    let t = createGameTime()
    t = tickGameTime(t, 1000).time
    t = pauseGameTime(t)
    const result = tickGameTime(t, 50000)
    expect(result.dt).toBe(0)
  })

  it('does not produce a dt spike on the first tick after resume', () => {
    let t = createGameTime()
    t = tickGameTime(t, 1000).time
    t = pauseGameTime(t)
    // Long real-world pause
    t = tickGameTime(t, 60_000).time
    t = resumeGameTime(t, 60_000)
    // Next frame ~16ms later
    const result = tickGameTime(t, 60_016)
    expect(result.dt).toBeCloseTo(0.016, 5)
  })

  it('applies speed multiplier to dt (2x doubles, 0.5x halves)', () => {
    let t = createGameTime()
    t = tickGameTime(t, 1000).time

    const fast = tickGameTime(setGameSpeed(t, 2), 1016)
    expect(fast.dt).toBeCloseTo(0.032, 5)

    const slow = tickGameTime(setGameSpeed(t, 0.5), 1016)
    expect(slow.dt).toBeCloseTo(0.008, 5)
  })

  it('applies cap BEFORE the speed multiplier (a slow frame at 2x is at most 2*MAX_DT)', () => {
    let t = createGameTime()
    t = tickGameTime(t, 0).time
    t = setGameSpeed(t, 2)
    const result = tickGameTime(t, 10_000)
    // raw = 10s, capped at MAX_DT = 0.1, then * 2 = 0.2
    expect(result.dt).toBeCloseTo(MAX_DT * 2, 5)
  })

  it('clamps a non-monotonic timestamp (negative delta) to dt=0', () => {
    let t = createGameTime()
    t = tickGameTime(t, 1000).time
    const result = tickGameTime(t, 999)
    expect(result.dt).toBe(0)
  })
})

describe('pause / resume', () => {
  it('pauseGameTime sets paused=true', () => {
    expect(pauseGameTime(createGameTime()).paused).toBe(true)
  })

  it('resumeGameTime sets paused=false and stamps lastFrameMs to now', () => {
    const t = resumeGameTime(pauseGameTime(createGameTime()), 5000)
    expect(t.paused).toBe(false)
    expect(t.lastFrameMs).toBe(5000)
  })
})

describe('setGameSpeed', () => {
  it('updates speed without affecting other fields', () => {
    const t = setGameSpeed(createGameTime(), 2)
    expect(t.speed).toBe(2)
    expect(t.paused).toBe(false)
  })
})
