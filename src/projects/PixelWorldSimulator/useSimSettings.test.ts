import { describe, it, expect, beforeEach } from 'vitest'
import { act, renderHook } from '@testing-library/react'
import { SimSetting } from './pixel-world.types'
import { DEFAULT_SETTINGS, SETTINGS_KEY } from './data'
import { useSimSettings } from './useSimSettings'

beforeEach(() => localStorage.clear())

describe('useSimSettings', () => {
  it('starts at the defaults with nothing saved', () => {
    const { result } = renderHook(() => useSimSettings())

    expect(result.current.settings).toEqual(DEFAULT_SETTINGS)
  })

  it('starts a first visit with only the material tint on', () => {
    // Comparing against `DEFAULT_SETTINGS` above cannot catch a default being flipped, since it moves with
    // it. These two are deliberate calls about what a visitor sees before touching anything: warm cells are
    // worth colouring straight away, and the two overlays that draw things which are not really there are
    // not. Both are easy to turn on by accident and hard to notice in review.
    expect(DEFAULT_SETTINGS[SimSetting.tintBlocks]).toBe(true)
    expect(DEFAULT_SETTINGS[SimSetting.tintAir]).toBe(false)
    expect(DEFAULT_SETTINGS[SimSetting.showFlow]).toBe(false)
  })

  it('toggles a setting and leaves the other one alone', () => {
    const { result } = renderHook(() => useSimSettings())

    act(() => result.current.toggle(SimSetting.tintAir))

    expect(result.current.settings.tintAir).toBe(!DEFAULT_SETTINGS.tintAir)
    expect(result.current.settings.tintBlocks).toBe(DEFAULT_SETTINGS.tintBlocks)
  })

  it('saves a change and reads it back on the next visit', () => {
    const first = renderHook(() => useSimSettings())
    act(() => first.result.current.toggle(SimSetting.tintBlocks))

    const second = renderHook(() => useSimSettings())

    expect(second.result.current.settings.tintBlocks).toBe(!DEFAULT_SETTINGS.tintBlocks)
  })

  it('falls back to the defaults on unparseable storage', () => {
    localStorage.setItem(SETTINGS_KEY, '{ not json')

    const { result } = renderHook(() => useSimSettings())

    expect(result.current.settings).toEqual(DEFAULT_SETTINGS)
  })

  it('defaults any field that is saved as the wrong type', () => {
    // A truthy string would otherwise reach the renderer as an "on" the viewer never chose.
    localStorage.setItem(SETTINGS_KEY, JSON.stringify({ tintBlocks: 'yes', tintAir: true }))

    const { result } = renderHook(() => useSimSettings())

    expect(result.current.settings.tintBlocks).toBe(DEFAULT_SETTINGS.tintBlocks)
    expect(result.current.settings.tintAir).toBe(true)
  })

  it('ignores a saved value that is not an object at all', () => {
    localStorage.setItem(SETTINGS_KEY, JSON.stringify('tintBlocks'))

    const { result } = renderHook(() => useSimSettings())

    expect(result.current.settings).toEqual(DEFAULT_SETTINGS)
  })

  it('keeps a setting it does not recognise out of the settings it hands back', () => {
    localStorage.setItem(SETTINGS_KEY, JSON.stringify({ ...DEFAULT_SETTINGS, tintWater: true }))

    const { result } = renderHook(() => useSimSettings())

    expect(Object.keys(result.current.settings).sort()).toEqual(
      Object.keys(DEFAULT_SETTINGS).sort()
    )
  })
})

describe('setting one outright', () => {
  it('sets rather than flips, so an arriving world lands on what it asked for', () => {
    // A shared world says which way it was built. `toggle` cannot express that: asking for "off" when it is
    // already off would turn it on.
    const { result } = renderHook(() => useSimSettings())
    expect(result.current.settings[SimSetting.airCurrents]).toBe(true)

    act(() => result.current.set(SimSetting.airCurrents, false))
    expect(result.current.settings[SimSetting.airCurrents]).toBe(false)

    act(() => result.current.set(SimSetting.airCurrents, false))
    expect(result.current.settings[SimSetting.airCurrents]).toBe(false)
  })

  it('saves it, so a shared world still behaves that way on the next visit', () => {
    const { result } = renderHook(() => useSimSettings())

    act(() => result.current.set(SimSetting.airCurrents, false))

    const saved = JSON.parse(localStorage.getItem(SETTINGS_KEY) ?? '{}')
    expect(saved[SimSetting.airCurrents]).toBe(false)
  })

  it('hands back the same object when nothing changes, so the page does not re-render for nothing', () => {
    const { result } = renderHook(() => useSimSettings())
    const before = result.current.settings

    act(() => result.current.set(SimSetting.tintBlocks, DEFAULT_SETTINGS[SimSetting.tintBlocks]))

    expect(result.current.settings).toBe(before)
  })

  it('leaves the other settings alone', () => {
    const { result } = renderHook(() => useSimSettings())

    act(() => result.current.set(SimSetting.airCurrents, false))

    expect(result.current.settings[SimSetting.tintBlocks]).toBe(
      DEFAULT_SETTINGS[SimSetting.tintBlocks]
    )
    expect(result.current.settings[SimSetting.tintAir]).toBe(DEFAULT_SETTINGS[SimSetting.tintAir])
  })
})
