export type Rng = {
  /** Float in [0, 1). */
  next(): number
  /** True with probability `p`. */
  chance(p: number): boolean
}

/**
 * mulberry32 — the sim's only source of randomness, so a grid plus a seed plus a tick count
 * reproduces byte-for-byte. Instance-based: tests own their generator, nothing shares global state.
 */
export function createRng(seed: number): Rng {
  let state = seed >>> 0 || 1

  const next = () => {
    state = (state + 0x6d2b79f5) >>> 0
    let t = state
    t = Math.imul(t ^ (t >>> 15), t | 1)
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61)
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }

  return {
    next,
    chance: (p) => next() < p,
  }
}
