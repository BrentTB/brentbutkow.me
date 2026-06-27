import { describe, expect, it, vi } from 'vitest'
import { act, renderHook } from '@testing-library/react'
import { ChangeEvent, DragEvent } from 'react'
import { useFileDrop } from './useFileDrop'

const file = new File(['x'], 'a.png', { type: 'image/png' })

function changeEvent(files: File[]): ChangeEvent<HTMLInputElement> {
  return { target: { files, value: 'keep' } } as unknown as ChangeEvent<HTMLInputElement>
}

function dropEvent(files: File[]): DragEvent {
  return { preventDefault: vi.fn(), dataTransfer: { files } } as unknown as DragEvent
}

describe('useFileDrop', () => {
  it('passes a picked file to onFile and resets the input', () => {
    const onFile = vi.fn()
    const { result } = renderHook(() => useFileDrop(onFile))
    const event = changeEvent([file])
    act(() => result.current.pick(event))
    expect(onFile).toHaveBeenCalledWith(file)
    expect(event.target.value).toBe('') // lets the same file be re-picked
  })

  it('ignores a pick with no file', () => {
    const onFile = vi.fn()
    const { result } = renderHook(() => useFileDrop(onFile))
    act(() => result.current.pick(changeEvent([])))
    expect(onFile).not.toHaveBeenCalled()
  })

  it('passes a dropped file to onFile and clears the dragging state', () => {
    const onFile = vi.fn()
    const { result } = renderHook(() => useFileDrop(onFile))
    act(() => result.current.dragProps.onDragOver(dropEvent([])))
    expect(result.current.dragging).toBe(true)
    act(() => result.current.dragProps.onDrop(dropEvent([file])))
    expect(onFile).toHaveBeenCalledWith(file)
    expect(result.current.dragging).toBe(false)
  })

  it('clears dragging on drag leave', () => {
    const onFile = vi.fn()
    const { result } = renderHook(() => useFileDrop(onFile))
    act(() => result.current.dragProps.onDragOver(dropEvent([])))
    act(() => result.current.dragProps.onDragLeave())
    expect(result.current.dragging).toBe(false)
  })
})
