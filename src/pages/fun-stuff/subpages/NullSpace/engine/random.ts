/**
 * Seeded pseudo-random number generator using a linear congruential approach.
 * Exported as a singleton — call rng.next() from anywhere in the engine.
 * Call reseed() at game start for a unique sequence per session.
 */
class SeededRandom {
  private state: number

  constructor(seed: number) {
    this.state = seed >>> 0 || 1
  }

  reseed(seed: number): void {
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

export const rng = new SeededRandom(Date.now())
