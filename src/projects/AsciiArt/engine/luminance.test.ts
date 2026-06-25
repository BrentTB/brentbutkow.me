import { describe, it, expect } from 'vitest'
import { luminance } from './luminance'

describe('luminance', () => {
  it('maps black to 0 and white to 255', () => {
    expect(luminance(0, 0, 0)).toBe(0)
    expect(luminance(255, 255, 255)).toBe(255)
  })

  it('weights channels per Rec. 601 (matches Pillow convert("L"))', () => {
    expect(luminance(255, 0, 0)).toBe(76)
    expect(luminance(0, 255, 0)).toBe(150)
    expect(luminance(0, 0, 255)).toBe(29)
  })
})
