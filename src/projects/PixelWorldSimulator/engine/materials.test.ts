import { describe, it, expect } from 'vitest'
import { MaterialBehavior, MaterialId } from '../pixel-world.types'
import { MATERIALS } from './materials'

describe('MATERIALS', () => {
  it('is indexed by MaterialId', () => {
    MATERIALS.forEach((material, index) => expect(material.id).toBe(index))
    expect(MATERIALS).toHaveLength(Object.keys(MaterialId).length)
  })

  it('orders densities so sand sinks through water', () => {
    expect(MATERIALS[MaterialId.sand].density).toBeGreaterThan(MATERIALS[MaterialId.water].density)
    expect(MATERIALS[MaterialId.water].density).toBeGreaterThan(MATERIALS[MaterialId.empty].density)
  })

  it('gives every liquid room to spread and every non-liquid none', () => {
    for (const material of MATERIALS) {
      if (material.behavior === MaterialBehavior.liquid) {
        expect(material.dispersion).toBeGreaterThan(0)
      } else {
        expect(material.dispersion).toBe(0)
      }
    }
  })

  it('keeps colours inside the byte range once jitter is applied', () => {
    for (const material of MATERIALS) {
      for (const channel of material.color) {
        expect(channel - material.jitter).toBeGreaterThanOrEqual(0)
        expect(channel + material.jitter).toBeLessThanOrEqual(255)
      }
    }
  })
})
