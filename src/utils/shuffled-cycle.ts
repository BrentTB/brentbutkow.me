/** Fisher–Yates, returning a new array. */
export function shuffle<T>(items: T[]): T[] {
  const result = [...items]
  for (let i = result.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[result[i], result[j]] = [result[j], result[i]]
  }
  return result
}

export type ShuffledCycle<T> = {
  next(matches?: (item: T) => boolean): T | null
}

const ALWAYS_MATCHES = () => true

/**
 * Round-robins over `items` in an order shuffled once at creation, so every item appears
 * before any repeats. `next` returns the following item that passes `matches`, or null when
 * none do. The cursor is shared across filters — switching filters mid-cycle keeps position,
 * it never restarts.
 */
export function createShuffledCycle<T>(items: T[]): ShuffledCycle<T> {
  const order = shuffle(items)
  let cursor = 0
  return {
    next(matches = ALWAYS_MATCHES) {
      for (let step = 0; step < order.length; step++) {
        const item = order[cursor]
        cursor = (cursor + 1) % order.length
        if (matches(item)) return item
      }
      return null
    },
  }
}
