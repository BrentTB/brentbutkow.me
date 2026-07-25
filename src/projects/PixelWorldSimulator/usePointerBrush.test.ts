import { describe, it, expect, afterEach, vi } from 'vitest'
import { PointerEvent as ReactPointerEvent } from 'react'
import { renderHook, cleanup } from '@testing-library/react'
import { CellPoint } from './pixel-world.types'
import { GRID_HEIGHT, GRID_WIDTH } from './data'
import { usePointerBrush } from './usePointerBrush'

/** A canvas displayed at twice the grid's resolution, offset 20px from the viewport corner. */
function mockCanvas(width = GRID_WIDTH * 2, height = GRID_HEIGHT * 2) {
  const canvas = document.createElement('canvas')
  canvas.getBoundingClientRect = () => ({ left: 20, top: 20, width, height }) as unknown as DOMRect
  canvas.setPointerCapture = vi.fn()
  canvas.releasePointerCapture = vi.fn()
  canvas.hasPointerCapture = vi.fn().mockReturnValue(true)
  return canvas
}

function pointerEvent(canvas: HTMLCanvasElement, clientX: number, clientY: number) {
  return {
    clientX,
    clientY,
    pointerId: 7,
    currentTarget: canvas,
  } as unknown as ReactPointerEvent<HTMLCanvasElement>
}

function mountBrush(canvas: HTMLCanvasElement) {
  const strokes: [CellPoint, CellPoint][] = []
  const rendered = renderHook(() =>
    usePointerBrush({ current: canvas }, (from, to) => strokes.push([from, to]))
  )
  return { ...rendered, strokes }
}

afterEach(cleanup)

describe('usePointerBrush', () => {
  it('maps a press to the cell under the pointer', () => {
    const canvas = mockCanvas()
    const { result, strokes } = mountBrush(canvas)

    result.current.onPointerDown(pointerEvent(canvas, 120, 60))

    // 100px into a canvas drawn at 2x = cell 50; 40px down = cell 20.
    expect(strokes).toEqual([
      [
        { x: 50, y: 20 },
        { x: 50, y: 20 },
      ],
    ])
    expect(canvas.setPointerCapture).toHaveBeenCalledWith(7)
  })

  it('reports each drag segment from the previous sample', () => {
    const canvas = mockCanvas()
    const { result, strokes } = mountBrush(canvas)

    result.current.onPointerDown(pointerEvent(canvas, 20, 20))
    result.current.onPointerMove(pointerEvent(canvas, 40, 20))
    result.current.onPointerMove(pointerEvent(canvas, 60, 40))

    expect(strokes.slice(1)).toEqual([
      [
        { x: 0, y: 0 },
        { x: 10, y: 0 },
      ],
      [
        { x: 10, y: 0 },
        { x: 20, y: 10 },
      ],
    ])
  })

  it('ignores movement with no button held', () => {
    const canvas = mockCanvas()
    const { result, strokes } = mountBrush(canvas)

    result.current.onPointerMove(pointerEvent(canvas, 100, 100))

    expect(strokes).toEqual([])
  })

  it('stops painting after the press ends', () => {
    const canvas = mockCanvas()
    const { result, strokes } = mountBrush(canvas)

    result.current.onPointerDown(pointerEvent(canvas, 40, 40))
    result.current.onPointerUp(pointerEvent(canvas, 40, 40))
    result.current.onPointerMove(pointerEvent(canvas, 200, 200))

    expect(strokes).toHaveLength(1)
    expect(canvas.releasePointerCapture).toHaveBeenCalledWith(7)
  })

  it('treats a cancelled pointer as a released one', () => {
    const canvas = mockCanvas()
    const { result, strokes } = mountBrush(canvas)

    result.current.onPointerDown(pointerEvent(canvas, 40, 40))
    result.current.onPointerCancel(pointerEvent(canvas, 40, 40))
    result.current.onPointerMove(pointerEvent(canvas, 200, 200))

    expect(strokes).toHaveLength(1)
  })

  it('leaves an uncaptured pointer alone', () => {
    const canvas = mockCanvas()
    canvas.hasPointerCapture = vi.fn().mockReturnValue(false)
    const { result } = mountBrush(canvas)

    result.current.onPointerDown(pointerEvent(canvas, 40, 40))
    result.current.onPointerUp(pointerEvent(canvas, 40, 40))

    expect(canvas.releasePointerCapture).not.toHaveBeenCalled()
  })

  it('clamps a drag that leaves the canvas into the grid', () => {
    const canvas = mockCanvas()
    const { result, strokes } = mountBrush(canvas)

    result.current.onPointerDown(pointerEvent(canvas, -500, -500))
    result.current.onPointerMove(pointerEvent(canvas, 99_999, 99_999))

    expect(strokes[0][0]).toEqual({ x: 0, y: 0 })
    expect(strokes[1][1]).toEqual({ x: GRID_WIDTH - 1, y: GRID_HEIGHT - 1 })
  })

  it('reports nothing while the canvas has no layout', () => {
    const canvas = mockCanvas(0, 0)
    const { result, strokes } = mountBrush(canvas)

    result.current.onPointerDown(pointerEvent(canvas, 20, 20))

    expect(strokes).toEqual([])
    expect(canvas.setPointerCapture).not.toHaveBeenCalled()
  })
})
