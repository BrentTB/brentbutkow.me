import { act, cleanup, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it } from 'vitest'
import { HOSTILITY } from './data'
import { useEvasiveTarget } from './useEvasiveTarget'

const ARENA = { left: 0, top: 0, width: 400, height: 200 }
const TARGET = { left: 180, top: 90, width: 40, height: 20 }

const boxOf = (box: typeof ARENA) => () =>
  ({
    ...box,
    right: box.left + box.width,
    bottom: box.top + box.height,
    x: box.left,
    y: box.top,
    toJSON: () => box,
  }) as DOMRect

function Subject() {
  const { arenaRef, targetRef, offset, dodges, settle } = useEvasiveTarget(HOSTILITY.evadeRadius)

  return (
    <div ref={arenaRef} data-testid="arena">
      <button type="button" ref={targetRef} data-testid="target">
        No
      </button>
      <output data-testid="offset">{`${offset.x},${offset.y}`}</output>
      <output data-testid="dodges">{dodges}</output>
      <button type="button" onClick={settle}>
        settle
      </button>
    </div>
  )
}

function renderSubject() {
  render(<Subject />)
  const arena = screen.getByTestId('arena')
  const target = screen.getByTestId('target')
  arena.getBoundingClientRect = boxOf(ARENA)
  target.getBoundingClientRect = boxOf(TARGET)
  return { arena, target }
}

const movePointerTo = (arena: HTMLElement, x: number, y: number) =>
  act(() => {
    arena.dispatchEvent(new PointerEvent('pointermove', { clientX: x, clientY: y, bubbles: true }))
  })

afterEach(cleanup)

describe('useEvasiveTarget', () => {
  it('starts at rest', () => {
    renderSubject()
    expect(screen.getByTestId('offset').textContent).toBe('0,0')
    expect(screen.getByTestId('dodges').textContent).toBe('0')
  })

  it('ignores a pointer that stays outside the trigger radius', () => {
    const { arena } = renderSubject()

    movePointerTo(arena, 0, 0)
    expect(screen.getByTestId('dodges').textContent).toBe('0')
  })

  it('moves and counts a dodge when the pointer closes in', () => {
    const { arena } = renderSubject()

    movePointerTo(arena, TARGET.left + TARGET.width / 2 - 10, TARGET.top + TARGET.height / 2)

    expect(screen.getByTestId('offset').textContent).not.toBe('0,0')
    expect(screen.getByTestId('dodges').textContent).toBe('1')
  })

  it('stops dodging once the pointer backs off', () => {
    const { arena } = renderSubject()

    movePointerTo(arena, TARGET.left + TARGET.width / 2 - 10, TARGET.top + TARGET.height / 2)
    const settled = screen.getByTestId('offset').textContent

    movePointerTo(arena, ARENA.left, ARENA.top)

    expect(screen.getByTestId('dodges').textContent).toBe('1')
    expect(screen.getByTestId('offset').textContent).toBe(settled)
  })

  it('settles back to rest and forgets the count', () => {
    const { arena } = renderSubject()

    movePointerTo(arena, TARGET.left + TARGET.width / 2 - 10, TARGET.top + TARGET.height / 2)
    act(() => screen.getByText('settle').click())

    expect(screen.getByTestId('offset').textContent).toBe('0,0')
    expect(screen.getByTestId('dodges').textContent).toBe('0')
  })
})
