/**
 * Interruptions timed to reading rather than to a clock. Getting further into the article is what
 * summons the next one, which is why the piece feels like it is defending itself.
 */

/** How far down the article each interruption waits, as a fraction of the scrollable distance. */
export const INTERRUPTION_DEPTHS: readonly number[] = [0.15, 0.45, 0.8]

/** How far through the scrollable distance the reader is, from 0 to 1. */
export function scrollDepth(scrollTop: number, scrollHeight: number, clientHeight: number): number {
  const scrollable = scrollHeight - clientHeight
  if (scrollable <= 0) return 0
  return Math.min(Math.max(scrollTop / scrollable, 0), 1)
}

/**
 * The index of the interruption now due, or null when the reader has not yet earned the next one.
 * `fired` is how many have already been spent, so each depth only pays out once.
 */
export function dueInterruption(depth: number, fired: number): number | null {
  if (fired >= INTERRUPTION_DEPTHS.length) return null
  return depth >= INTERRUPTION_DEPTHS[fired] ? fired : null
}
