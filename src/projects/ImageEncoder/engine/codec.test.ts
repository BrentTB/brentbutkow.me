import { describe, expect, it } from 'vitest'
import { Base } from '../image-encoder.types'
import { CapacityExceededError, embedPayload, extractPayload } from './codec'

// Deterministic RGBA image: channels ramp, alpha pinned opaque.
function makeImage(width: number, height: number): Uint8ClampedArray {
  const data = new Uint8ClampedArray(width * height * 4)
  for (let p = 0; p < width * height; p++) {
    data[p * 4] = (p * 7) % 256
    data[p * 4 + 1] = (p * 13) % 256
    data[p * 4 + 2] = (p * 29) % 256
    data[p * 4 + 3] = 255
  }
  return data
}

// Re-wrap in the local realm so toEqual matches the codec's Uint8Array output
// (jsdom's TextEncoder yields a cross-realm array that deep-equal rejects).
const message = Uint8Array.from(new TextEncoder().encode('Hello, hidden world! 🌍 keep it secret.'))
const BASES = [Base.binary, Base.ternary, Base.quaternary]

describe('embedPayload / extractPayload', () => {
  for (const base of BASES) {
    it(`round-trips a payload through base ${base}`, () => {
      const original = makeImage(64, 64)
      const stego = embedPayload(original, 64, 64, message, {
        base,
        encrypted: false,
        salt: null,
        iv: null,
      })
      const decoded = extractPayload(stego, 64, 64)
      expect(decoded?.base).toBe(base)
      expect(decoded?.encrypted).toBe(false)
      expect(decoded?.payload).toEqual(message)
      expect(decoded?.salt).toBeNull()
    })
  }

  it('carries crypto params for an encrypted payload', () => {
    const salt = Uint8Array.from({ length: 16 }, (_, i) => i)
    const iv = Uint8Array.from({ length: 12 }, (_, i) => i * 2)
    const cipher = Uint8Array.from({ length: 40 }, (_, i) => (i * 91) % 256)
    const stego = embedPayload(makeImage(48, 48), 48, 48, cipher, {
      base: Base.ternary,
      encrypted: true,
      salt,
      iv,
    })
    const decoded = extractPayload(stego, 48, 48)
    expect(decoded?.encrypted).toBe(true)
    expect(decoded?.salt).toEqual(salt)
    expect(decoded?.iv).toEqual(iv)
    expect(decoded?.payload).toEqual(cipher)
  })

  it('leaves the original buffer and every alpha channel untouched', () => {
    const original = makeImage(32, 32)
    const snapshot = original.slice()
    const stego = embedPayload(original, 32, 32, message, {
      base: Base.quaternary,
      encrypted: false,
      salt: null,
      iv: null,
    })
    expect(original).toEqual(snapshot)
    for (let i = 3; i < stego.length; i += 4) expect(stego[i]).toBe(255)
  })

  it('moves each channel to the nearest matching value', () => {
    const original = makeImage(40, 40)
    const stego = embedPayload(original, 40, 40, message, {
      base: Base.quaternary,
      encrypted: false,
      salt: null,
      iv: null,
    })
    for (let i = 0; i < stego.length; i++) {
      if (i % 4 === 3) continue
      expect(Math.abs(stego[i] - original[i])).toBeLessThanOrEqual(Base.quaternary - 1)
    }
  })

  it('throws when the payload outgrows the image', () => {
    expect(() =>
      embedPayload(makeImage(2, 2), 2, 2, message, {
        base: Base.binary,
        encrypted: false,
        salt: null,
        iv: null,
      })
    ).toThrow(CapacityExceededError)
  })

  it('returns null for an image with no embedded header', () => {
    const blank = new Uint8ClampedArray(32 * 32 * 4)
    expect(extractPayload(blank, 32, 32)).toBeNull()
  })
})
