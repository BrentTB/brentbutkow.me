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

  /** Current internal state — snapshot it to persist a run's RNG sequence. */
  getState(): number {
    return this.state
  }

  /** Restore a snapshot so the sequence continues deterministically after a reload. */
  setState(state: number): void {
    this.state = state >>> 0 || 1
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

// Seed for the next fresh run. Production leaves this null and reseeds from the
// wall clock for a unique sequence each session; tests pin it via setSessionSeed
// so every startGame/createInitialState reseed is reproducible.
let sessionSeedOverride: number | null = null

export function setSessionSeed(seed: number | null): void {
  sessionSeedOverride = seed
}

export function reseedForNewSession(): void {
  rng.reseed(sessionSeedOverride ?? Date.now())
}
