import { describe, expect, it } from 'vitest'
import { Base } from '../image-encoder.types'
import { headerSlotCount, maxPayloadBytes, payloadFits, smallestBaseThatFits } from './capacity'
import { CORE_HEADER_BYTES, CRYPTO_PARAM_BYTES } from './header'

describe('headerSlotCount', () => {
  it('counts one base-2 slot per header bit', () => {
    expect(headerSlotCount(false)).toBe(CORE_HEADER_BYTES * 8)
    expect(headerSlotCount(true)).toBe((CORE_HEADER_BYTES + CRYPTO_PARAM_BYTES) * 8)
  })
})

describe('maxPayloadBytes', () => {
  it('grows with the base', () => {
    const args = [256, 256] as const
    expect(maxPayloadBytes(...args, Base.quaternary, false)).toBeGreaterThan(
      maxPayloadBytes(...args, Base.ternary, false)
    )
    expect(maxPayloadBytes(...args, Base.ternary, false)).toBeGreaterThan(
      maxPayloadBytes(...args, Base.binary, false)
    )
  })

  it('shrinks when encryption reserves header room', () => {
    expect(maxPayloadBytes(256, 256, Base.binary, true)).toBeLessThan(
      maxPayloadBytes(256, 256, Base.binary, false)
    )
  })

  it('reports zero when the image cannot even hold the header', () => {
    expect(maxPayloadBytes(2, 2, Base.binary, false)).toBe(0)
  })
})

describe('payloadFits', () => {
  it('accepts the exact capacity and rejects one byte more', () => {
    const max = maxPayloadBytes(128, 128, Base.binary, false)
    expect(payloadFits(128, 128, Base.binary, false, max)).toBe(true)
    expect(payloadFits(128, 128, Base.binary, false, max + 1)).toBe(false)
  })
})

describe('smallestBaseThatFits', () => {
  const w = 16
  const h = 16

  it('returns the gentlest base whose capacity holds the payload', () => {
    const binaryMax = maxPayloadBytes(w, h, Base.binary, false)
    expect(smallestBaseThatFits(w, h, false, binaryMax)).toBe(Base.binary)
    // One byte past binary should bump up to the next base that fits.
    expect(smallestBaseThatFits(w, h, false, binaryMax + 1)).toBe(Base.ternary)
  })

  it('returns null when even quaternary is too small', () => {
    const quaternaryMax = maxPayloadBytes(w, h, Base.quaternary, false)
    expect(smallestBaseThatFits(w, h, false, quaternaryMax + 1)).toBeNull()
  })
})
