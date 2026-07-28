import { describe, it, expect, beforeEach } from 'vitest'
import { act, renderHook } from '@testing-library/react'
import { MaterialId } from './pixel-world.types'
import { FAVOURITES_KEY, MATERIAL_SLOTS } from './data'
import { MATERIALS } from './engine/materials'
import { useFavouriteSlots } from './useFavouriteSlots'

beforeEach(() => localStorage.clear())

describe('useFavouriteSlots', () => {
  it('starts empty with nothing saved', () => {
    const { result } = renderHook(() => useFavouriteSlots())

    expect(result.current.slots).toEqual(Array.from({ length: MATERIAL_SLOTS }, () => null))
  })

  it('fills one slot and leaves the others alone', () => {
    const { result } = renderHook(() => useFavouriteSlots())

    act(() => result.current.assign(1, MaterialId.lava))

    expect(result.current.slots[0]).toBeNull()
    expect(result.current.slots[1]).toBe(MaterialId.lava)
    expect(result.current.slots[2]).toBeNull()
  })

  it('still holds what was assigned on the next visit', () => {
    // The whole point: the materials you reach for without looking are still there next time.
    const first = renderHook(() => useFavouriteSlots())
    act(() => first.result.current.assign(0, MaterialId.tnt))
    act(() => first.result.current.assign(2, MaterialId.water))
    first.unmount()

    const second = renderHook(() => useFavouriteSlots())

    expect(second.result.current.slots).toEqual([MaterialId.tnt, null, MaterialId.water])
  })

  it('replaces what a slot already held', () => {
    const { result } = renderHook(() => useFavouriteSlots())

    act(() => result.current.assign(0, MaterialId.sand))
    act(() => result.current.assign(0, MaterialId.oil))

    expect(result.current.slots[0]).toBe(MaterialId.oil)
  })

  it('ignores a slot index that does not exist', () => {
    const { result } = renderHook(() => useFavouriteSlots())
    const before = result.current.slots

    act(() => result.current.assign(MATERIAL_SLOTS, MaterialId.sand))
    act(() => result.current.assign(-1, MaterialId.sand))

    expect(result.current.slots).toBe(before)
  })
})

describe('reading what is in storage', () => {
  it('treats anything that is not a list of slots as empty', () => {
    for (const junk of ['not json at all', '"a string"', '42', '{"0":2}', 'null']) {
      localStorage.setItem(FAVOURITES_KEY, junk)
      const { result, unmount } = renderHook(() => useFavouriteSlots())
      expect(result.current.slots).toEqual(Array.from({ length: MATERIAL_SLOTS }, () => null))
      unmount()
    }
  })

  it('drops an id that names no material rather than handing it to the renderer', () => {
    // An id past the end of the table would read colours off the end of the array. Storage came from an older
    // build or a hand-edited value, so none of it is trusted.
    localStorage.setItem(FAVOURITES_KEY, JSON.stringify([MATERIALS.length, -1, MaterialId.sand]))

    const { result } = renderHook(() => useFavouriteSlots())

    expect(result.current.slots).toEqual([null, null, MaterialId.sand])
  })

  it('drops values of the wrong type, and things that are nearly numbers', () => {
    localStorage.setItem(FAVOURITES_KEY, JSON.stringify(['2', 1.5, MaterialId.stone]))

    const { result } = renderHook(() => useFavouriteSlots())

    expect(result.current.slots).toEqual([null, null, MaterialId.stone])
  })

  it('keeps the row the length the palette shows, however long the stored one is', () => {
    localStorage.setItem(
      FAVOURITES_KEY,
      JSON.stringify([MaterialId.sand, MaterialId.water, MaterialId.oil, MaterialId.lava, 99])
    )

    const { result } = renderHook(() => useFavouriteSlots())

    expect(result.current.slots).toHaveLength(MATERIAL_SLOTS)
  })

  it('fills the gaps when storage holds fewer slots than the palette shows', () => {
    localStorage.setItem(FAVOURITES_KEY, JSON.stringify([MaterialId.sand]))

    const { result } = renderHook(() => useFavouriteSlots())

    expect(result.current.slots).toEqual([MaterialId.sand, null, null])
  })
})
