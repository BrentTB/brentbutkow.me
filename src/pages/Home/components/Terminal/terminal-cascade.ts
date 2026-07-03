// Timing for the fun-mode autocomplete cascade: accepted letters light up one at a time, left to
// right. The per-letter step is capped so a long completion still finishes fast (a quick zip, not a
// typewriter). CASCADE_POP_MS must match the animation duration in Terminal.module.scss.
export const CASCADE_STEP_MS = 28
export const CASCADE_SPREAD_MAX_MS = 180
export const CASCADE_POP_MS = 150

export function cascadeTiming(letterCount: number): { step: number; clearAfter: number } {
  if (letterCount <= 1) return { step: 0, clearAfter: CASCADE_POP_MS }
  const step = Math.min(CASCADE_STEP_MS, CASCADE_SPREAD_MAX_MS / (letterCount - 1))
  return { step, clearAfter: (letterCount - 1) * step + CASCADE_POP_MS }
}
