// Pure encoding + animation-timeline maths for the EncodingDemo. Kept out of the
// component so it stays unit-testable and the component file exports only its view.

// Round a value down to the base block below it: the largest multiple of the base
// that is at most the value.
export function blockOf(value: number, base: number): number {
  return value - (value % base)
}

// The stored value: round down to the block, then add the digit, so the value's
// remainder becomes the digit you can read back.
export function encodeChannel(value: number, base: number, digit: number): number {
  return blockOf(value, base) + digit
}

// Animation timeline, two passes over the channels. IDLE shows the finished bars.
// Step 0 shows the untouched originals. Pass one walks left to right rounding each
// channel down to its block; pass two walks left to right adding each digit. Within
// a pass every channel takes two steps: a brief highlight (value unchanged), then
// its move. Splitting rounding and adding into separate passes keeps the two ideas
// distinct instead of interleaving them per column.
export const IDLE = -1
export const START_STEP = 0
const STEPS_PER_CHANNEL = 2

// Steps in a single pass over every channel.
export function passLength(channelCount: number): number {
  return channelCount * STEPS_PER_CHANNEL
}

export function finalStep(channelCount: number): number {
  return passLength(channelCount) * 2
}

// Which pass the animation is in at a step — drives which explanation line is highlighted.
export const Phase = { idle: 0, rounding: 1, adding: 2 } as const
export type Phase = (typeof Phase)[keyof typeof Phase]

export function phaseAt(step: number, channelCount: number): Phase {
  if (step === IDLE) return Phase.idle
  return step <= passLength(channelCount) ? Phase.rounding : Phase.adding
}

// Step counted from the start of its own pass (1-based), so both passes share the
// same per-channel arithmetic.
function stepInPass(step: number, channelCount: number): number {
  const pass = passLength(channelCount)
  return step <= pass ? step : step - pass
}

// The channel the animation is working on at a step, or -1 before any starts.
export function activeChannelAt(step: number, channelCount: number): number {
  if (step < 1) return -1
  return Math.floor((stepInPass(step, channelCount) - 1) / STEPS_PER_CHANNEL)
}

// True on a step that only highlights the channel without changing its value.
export function isHighlightStep(step: number, channelCount: number): boolean {
  if (step < 1) return false
  return (stepInPass(step, channelCount) - 1) % STEPS_PER_CHANNEL === 0
}

// The value a channel shows at a step. Pass one moves channels from their original
// value to their block; pass two moves them from block to stored value. The active
// channel holds its incoming value on the highlight step, then makes its move.
export function channelValueAt(
  step: number,
  channel: number,
  value: number,
  base: number,
  digit: number,
  channelCount: number
): number {
  if (step === START_STEP) return value
  const block = blockOf(value, base)
  const stored = encodeChannel(value, base, digit)
  const active = activeChannelAt(step, channelCount)
  const moved = !isHighlightStep(step, channelCount)

  if (step <= passLength(channelCount)) {
    // Rounding pass: original → block.
    if (channel < active) return block
    if (channel > active) return value
    return moved ? block : value
  }
  // Adding pass: block → stored.
  if (channel < active) return stored
  if (channel > active) return block
  return moved ? stored : block
}
