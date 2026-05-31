import { describe, it, expect, vi } from 'vitest'
import { useRef } from 'react'
import { renderHook } from '@testing-library/react'
import { useFocusTrap } from './useFocusTrap'

const pressEscape = () => document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' }))

describe('useFocusTrap', () => {
  it('calls onEscape when Escape is pressed while active', () => {
    const onEscape = vi.fn()
    renderHook(() => {
      const ref = useRef<HTMLElement>(null)
      useFocusTrap(ref, true, onEscape)
    })
    pressEscape()
    expect(onEscape).toHaveBeenCalledTimes(1)
  })

  it('ignores Escape while inactive', () => {
    const onEscape = vi.fn()
    renderHook(() => {
      const ref = useRef<HTMLElement>(null)
      useFocusTrap(ref, false, onEscape)
    })
    pressEscape()
    expect(onEscape).not.toHaveBeenCalled()
  })

  it('always invokes the latest callback without re-subscribing', () => {
    const first = vi.fn()
    const second = vi.fn()
    const { rerender } = renderHook(
      ({ cb }: { cb: () => void }) => {
        const ref = useRef<HTMLElement>(null)
        useFocusTrap(ref, true, cb)
      },
      { initialProps: { cb: first } }
    )
    rerender({ cb: second })
    pressEscape()
    expect(first).not.toHaveBeenCalled()
    expect(second).toHaveBeenCalledTimes(1)
  })
})
