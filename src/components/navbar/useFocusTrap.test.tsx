import { describe, it, expect, vi } from 'vitest'
import { useRef } from 'react'
import { renderHook } from '@testing-library/react'
import { useFocusTrap } from './useFocusTrap'

const pressEscape = () => document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' }))

const pressTab = (shiftKey = false) => {
  const event = new KeyboardEvent('keydown', { key: 'Tab', shiftKey, cancelable: true })
  document.dispatchEvent(event)
  return event
}

// jsdom does no layout, so offsetParent is always null and the hook's visibility
// filter would drop every control — force it truthy so our buttons survive.
const makeTrap = () => {
  const container = document.createElement('div')
  const first = document.createElement('button')
  const last = document.createElement('button')
  container.append(first, last)
  document.body.appendChild(container)
  ;[first, last].forEach((el) =>
    Object.defineProperty(el, 'offsetParent', { configurable: true, get: () => container })
  )
  return { container, first, last }
}

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

  it('wraps focus to the first element when Tab is pressed on the last', () => {
    const { container, first, last } = makeTrap()
    const { unmount } = renderHook(() => useFocusTrap({ current: container }, true, () => {}))
    last.focus()
    const event = pressTab()
    expect(document.activeElement).toBe(first)
    expect(event.defaultPrevented).toBe(true)
    unmount()
    container.remove()
  })

  it('wraps focus to the last element when Shift+Tab is pressed on the first', () => {
    const { container, first, last } = makeTrap()
    const { unmount } = renderHook(() => useFocusTrap({ current: container }, true, () => {}))
    first.focus()
    const event = pressTab(true)
    expect(document.activeElement).toBe(last)
    expect(event.defaultPrevented).toBe(true)
    unmount()
    container.remove()
  })
})
