import { describe, expect, it } from 'vitest'
import {
  activeChannelAt,
  blockOf,
  channelValueAt,
  encodeChannel,
  finalStep,
  isHighlightStep,
  START_STEP,
} from './encoding'

describe('blockOf', () => {
  it('rounds down to the largest multiple of the base at or below the value', () => {
    expect(blockOf(13, 2)).toBe(12)
    expect(blockOf(6, 3)).toBe(6)
    expect(blockOf(17, 4)).toBe(16)
  })
})

describe('encodeChannel', () => {
  it('adds the digit onto the block, so the remainder equals the digit', () => {
    expect(encodeChannel(13, 2, 1)).toBe(13)
    expect(encodeChannel(6, 2, 1)).toBe(7)
    expect(encodeChannel(17, 4, 3)).toBe(19)
    for (const [value, base, digit] of [
      [13, 2, 1],
      [6, 3, 2],
      [17, 4, 3],
    ] as const) {
      expect(encodeChannel(value, base, digit) % base).toBe(digit)
    }
  })
})

// Three channels keeps the pass boundaries small: rounding pass is steps 1–6,
// adding pass is steps 7–12.
const CC = 3

describe('activeChannelAt', () => {
  it('has no active channel before the first step', () => {
    expect(activeChannelAt(START_STEP, CC)).toBe(-1)
  })

  it('spends two steps on each channel, then restarts for the second pass', () => {
    expect(activeChannelAt(1, CC)).toBe(0)
    expect(activeChannelAt(2, CC)).toBe(0)
    expect(activeChannelAt(3, CC)).toBe(1)
    expect(activeChannelAt(6, CC)).toBe(2) // last channel, end of rounding pass
    expect(activeChannelAt(7, CC)).toBe(0) // adding pass restarts at channel 0
    expect(activeChannelAt(finalStep(CC), CC)).toBe(CC - 1)
  })
})

describe('isHighlightStep', () => {
  it('flags the first step of each channel in both passes', () => {
    expect(isHighlightStep(START_STEP, CC)).toBe(false)
    expect(isHighlightStep(1, CC)).toBe(true) // highlight channel 0, rounding pass
    expect(isHighlightStep(2, CC)).toBe(false) // round channel 0
    expect(isHighlightStep(7, CC)).toBe(true) // highlight channel 0, adding pass
    expect(isHighlightStep(8, CC)).toBe(false) // add channel 0
  })
})

// Channel 0: value 13, digit 1 → block 12, stored 13.
// Channel 2: value 17, digit 1 → block 16, stored 17.
describe('channelValueAt', () => {
  it('shows every channel its original value at the start', () => {
    expect(channelValueAt(START_STEP, 0, 13, 2, 1, CC)).toBe(13)
  })

  it('rounding pass: highlight holds the original, the round step drops to the block', () => {
    expect(channelValueAt(1, 0, 13, 2, 1, CC)).toBe(13) // highlight → original
    expect(channelValueAt(2, 0, 13, 2, 1, CC)).toBe(12) // round → block
    expect(channelValueAt(2, 2, 17, 2, 1, CC)).toBe(17) // not reached → original
  })

  it('leaves every channel on its block at the end of the rounding pass', () => {
    expect(channelValueAt(6, 0, 13, 2, 1, CC)).toBe(12)
    expect(channelValueAt(6, 2, 17, 2, 1, CC)).toBe(16)
  })

  it('adding pass: highlight holds the block, the add step lands on the stored value', () => {
    expect(channelValueAt(7, 0, 13, 2, 1, CC)).toBe(12) // highlight → still block
    expect(channelValueAt(8, 0, 13, 2, 1, CC)).toBe(13) // add → stored
    expect(channelValueAt(8, 1, 6, 2, 0, CC)).toBe(6) // not yet added → block
  })

  it('lands every channel on its stored value by the final step', () => {
    const values = [13, 6, 17, 9, 18, 4]
    const digits = [1, 0, 0, 1, 1, 0]
    values.forEach((value, i) => {
      expect(channelValueAt(finalStep(6), i, value, 2, digits[i], 6)).toBe(
        encodeChannel(value, 2, digits[i])
      )
    })
  })
})
