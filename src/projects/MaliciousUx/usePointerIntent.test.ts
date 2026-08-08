import { renderHook } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { usePointerIntent } from './usePointerIntent'

describe('usePointerIntent', () => {
  it('assumes the keyboard until a pointer says otherwise', () => {
    const { result } = renderHook(() => usePointerIntent())
    expect(result.current.viaPointer.current).toBe(false)
  })

  it('flags a press that started with a pointer', () => {
    const { result } = renderHook(() => usePointerIntent())

    result.current.intentProps.onPointerDown()
    expect(result.current.viaPointer.current).toBe(true)
  })

  it('hands control back to the keyboard on the next key press', () => {
    const { result } = renderHook(() => usePointerIntent())

    result.current.intentProps.onPointerDown()
    result.current.intentProps.onKeyDown()
    expect(result.current.viaPointer.current).toBe(false)
  })

  it('keeps the same handlers across renders, so nothing re-binds mid-interaction', () => {
    const { result, rerender } = renderHook(() => usePointerIntent())
    const first = result.current.intentProps

    rerender()
    expect(result.current.intentProps).toBe(first)
  })
})
