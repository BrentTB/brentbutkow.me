/**
 * Seeded pseudo-random number generator using a linear congruential approach.
 * Each call to next() advances the internal state, producing a different value.
 * Seed with Date.now() for unique sequences per game session.
 */
export class SeededRandom {
  private state: number

  constructor(seed: number) {
    this.state = seed >>> 0 || 1
  }

  next(): number {
    this.state = (this.state * 1664525 + 1013904223) >>> 0
    return this.state / 0x100000000
  }

  /** Random integer in [min, max] inclusive */
  intRange(min: number, max: number): number {
    return Math.floor(this.next() * (max - min + 1)) + min
  }

  /** Random float in [min, max) */
  range(min: number, max: number): number {
    return this.next() * (max - min) + min
  }
}
