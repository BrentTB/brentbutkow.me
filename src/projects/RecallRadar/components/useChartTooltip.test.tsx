import { describe, expect, it } from 'vitest'
import { act, renderHook } from '@testing-library/react'
import type { MouseEvent } from 'react'
import { useChartTooltip } from './useChartTooltip'

const rectAt = (left: number, top: number) =>
  ({
    left,
    top,
    right: 0,
    bottom: 0,
    width: 0,
    height: 0,
    x: left,
    y: top,
    toJSON: () => ({}),
  }) as DOMRect

// Mount a fake <figure> behind the hook's ref so getBoundingClientRect resolves in jsdom.
const mountFigure = (ref: { current: HTMLElement | null }, rect: DOMRect) => {
  const figure = document.createElement('figure')
  figure.getBoundingClientRect = () => rect
  ;(ref as { current: HTMLElement | null }).current = figure
}

describe('useChartTooltip', () => {
  it('starts with no tooltip', () => {
    const { result } = renderHook(() => useChartTooltip())
    expect(result.current.tip).toBeNull()
  })

  it('showTip stores text at figure-relative coordinates', () => {
    const { result } = renderHook(() => useChartTooltip())
    mountFigure(result.current.figureRef, rectAt(100, 50))

    act(() => {
      result.current.showTip('Mar 2026: 12')({ clientX: 130, clientY: 80 } as MouseEvent)
    })
    expect(result.current.tip).toEqual({ text: 'Mar 2026: 12', x: 30, y: 30 })
  })

  it('hideTip clears the tooltip', () => {
    const { result } = renderHook(() => useChartTooltip())
    mountFigure(result.current.figureRef, rectAt(0, 0))

    act(() => result.current.showTip('x')({ clientX: 5, clientY: 5 } as MouseEvent))
    expect(result.current.tip).not.toBeNull()
    act(() => result.current.hideTip())
    expect(result.current.tip).toBeNull()
  })

  it('ignores showTip when no figure is mounted', () => {
    const { result } = renderHook(() => useChartTooltip())
    act(() => result.current.showTip('x')({ clientX: 5, clientY: 5 } as MouseEvent))
    expect(result.current.tip).toBeNull()
  })
})
