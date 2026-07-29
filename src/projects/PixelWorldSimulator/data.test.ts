import { describe, it, expect } from 'vitest'
import { MaterialId } from './pixel-world.types'
import { MATERIALS } from './engine/materials'
import { MATERIAL_GROUPS } from './data'

/**
 * The materials no tab lists, on purpose. Erase is a tool rather than a material, and it sits outside the tabs
 * so it is never a tab away. A lit firework is the half-second between striking one and it going off: you get
 * there by heating a firework, and a swatch for it would be a swatch for a state rather than a thing. Anything
 * else absent from the tabs is a material nobody can reach, so this list stays short and deliberate.
 */
const UNPAINTABLE: readonly MaterialId[] = [MaterialId.empty, MaterialId.fireworkLit]

describe('MATERIAL_GROUPS', () => {
  const listed = MATERIAL_GROUPS.flatMap(({ materials }) => materials)

  it('files every material in exactly one group', () => {
    // The tabs are the only way to reach a material, so one dropped while the groups were being reshuffled is
    // a material nobody can paint with.
    const missing = MATERIALS.map(({ id }) => id)
      .filter((id) => !UNPAINTABLE.includes(id))
      .filter((id) => !listed.includes(id))
    const twice = listed.filter((id, at) => listed.indexOf(id) !== at)

    expect(missing.map((id) => MATERIALS[id].label)).toEqual([])
    expect(twice.map((id) => MATERIALS[id].label)).toEqual([])
    for (const id of UNPAINTABLE) expect(listed).not.toContain(id)
  })

  it('gives every group a label and something in it', () => {
    for (const { label, materials } of MATERIAL_GROUPS) {
      expect(label).toMatch(/^[A-Z]/)
      expect(materials.length).toBeGreaterThan(0)
    }
  })

  it('keeps the groups within sight of each other in size', () => {
    // Powders once held fourteen against the smallest tab's two, which is the wall a tab strip is meant to
    // prevent. Splitting it and folding Energy away closed that to a factor of three.
    const sizes = MATERIAL_GROUPS.map(({ materials }) => materials.length)
    expect(Math.max(...sizes)).toBeLessThanOrEqual(Math.min(...sizes) * 3)
  })
})
