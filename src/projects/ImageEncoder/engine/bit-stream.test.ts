import { describe, expect, it } from 'vitest'
import {
  blockRatio,
  byteCountToDigits,
  bytesToDigits,
  digitCapacityToBytes,
  digitsToBytes,
} from './bit-stream'

const BASES = [2, 3, 4]
const SAMPLE = Uint8Array.from([0, 1, 2, 0x55, 0xaa, 0xff, 0x10, 0x80, 0x7f])

describe('blockRatio', () => {
  it('slices powers of two with one digit per block', () => {
    expect(blockRatio(2)).toEqual({ bitsPerBlock: 1, digitsPerBlock: 1 })
    expect(blockRatio(4)).toEqual({ bitsPerBlock: 2, digitsPerBlock: 1 })
  })

  it('keeps 2^bits <= base^digits for non-powers of two', () => {
    const { bitsPerBlock, digitsPerBlock } = blockRatio(3)
    expect(2 ** bitsPerBlock).toBeLessThanOrEqual(3 ** digitsPerBlock)
    // Density should beat the naive one-bit-per-trit packing.
    expect(bitsPerBlock / digitsPerBlock).toBeGreaterThan(1)
  })

  it('rejects bases below two', () => {
    expect(() => blockRatio(1)).toThrow(RangeError)
    expect(() => blockRatio(2.5)).toThrow(RangeError)
  })
})

describe('bytesToDigits / digitsToBytes', () => {
  for (const base of BASES) {
    it(`round-trips bytes through base ${base}`, () => {
      const digits = bytesToDigits(SAMPLE, base)
      expect(digits.every((d) => Number.isInteger(d) && d >= 0 && d < base)).toBe(true)
      expect(digitsToBytes(digits, base, SAMPLE.length)).toEqual(SAMPLE)
    })
  }

  it('handles an empty buffer', () => {
    expect(bytesToDigits(new Uint8Array(0), 3)).toEqual([])
    expect(digitsToBytes([], 3, 0)).toEqual(new Uint8Array(0))
  })
})

describe('capacity helpers', () => {
  for (const base of BASES) {
    it(`reports enough digits to hold the bytes for base ${base}`, () => {
      const byteCount = SAMPLE.length
      const digits = byteCountToDigits(byteCount, base)
      expect(digits).toBeGreaterThanOrEqual(bytesToDigits(SAMPLE, base).length)
      expect(digitCapacityToBytes(digits, base)).toBeGreaterThanOrEqual(byteCount)
    })
  }

  it('gives more capacity per digit as the base grows', () => {
    expect(digitCapacityToBytes(1000, 4)).toBeGreaterThanOrEqual(digitCapacityToBytes(1000, 3))
    expect(digitCapacityToBytes(1000, 3)).toBeGreaterThan(digitCapacityToBytes(1000, 2))
  })
})
