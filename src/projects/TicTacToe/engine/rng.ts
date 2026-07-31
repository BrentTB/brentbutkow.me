/**
 * A seeded generator, so the computer's choices are reproducible and its tests are not flaky.
 *
 * The engine never reaches for `Math.random` itself: every chooser takes an `Rng` and a test can hand
 * it a stub that walks a known sequence.
 */
export type Rng = () => number

/** mulberry32: small, fast, and good enough for picking between candidate moves. */
export function seededRng(seed: number): Rng {
  let state = seed >>> 0
  return () => {
    state = (state + 0x6d2b79f5) >>> 0
    let t = state
    t = Math.imul(t ^ (t >>> 15), t | 1)
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61)
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

/** One of `items`, chosen uniformly. Returns undefined only for an empty list. */
export function pickOne<T>(items: readonly T[], rng: Rng): T | undefined {
  if (items.length === 0) return undefined
  return items[Math.min(items.length - 1, Math.floor(rng() * items.length))]
}

/**
 * One of `items`, chosen with probability proportional to its weight. Weights at or below zero are
 * skipped; if every weight is skipped, falls back to a uniform pick so a caller always gets a move.
 */
export function pickWeighted<T>(
  items: readonly T[],
  weights: readonly number[],
  rng: Rng
): T | undefined {
  const total = weights.reduce((sum, weight) => sum + Math.max(0, weight), 0)
  if (total <= 0) return pickOne(items, rng)

  let target = rng() * total
  for (let index = 0; index < items.length; index++) {
    const weight = Math.max(0, weights[index])
    // Skipped before the subtraction: a draw of exactly zero lands on `target <= 0` immediately, and
    // testing the weight afterwards would hand back an item that was supposed to be out of the running.
    if (weight <= 0) continue
    target -= weight
    if (target <= 0) return items[index]
  }
  return items[items.length - 1]
}
