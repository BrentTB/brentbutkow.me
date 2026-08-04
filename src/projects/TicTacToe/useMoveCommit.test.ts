import { act, renderHook } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { MoveCommit } from './tic-tac-toe.types'
import { DEFAULT_MOVE_COMMIT, MOVE_COMMIT_KEY, useMoveCommit } from './useMoveCommit'

afterEach(() => {
  localStorage.clear()
  vi.restoreAllMocks()
})

describe('useMoveCommit', () => {
  it('starts on the default when nothing has been chosen', () => {
    const { result } = renderHook(() => useMoveCommit())
    expect(result.current.commit).toBe(DEFAULT_MOVE_COMMIT)
  })

  it('remembers a choice for the next visit', () => {
    const { result } = renderHook(() => useMoveCommit())
    act(() => result.current.choose(MoveCommit.confirm))
    expect(result.current.commit).toBe(MoveCommit.confirm)
    expect(localStorage.getItem(MOVE_COMMIT_KEY)).toBe(MoveCommit.confirm)

    const again = renderHook(() => useMoveCommit())
    expect(again.result.current.commit).toBe(MoveCommit.confirm)
  })

  it('ignores a stored value that is not a mode', () => {
    localStorage.setItem(MOVE_COMMIT_KEY, 'whatever an older build wrote')
    const { result } = renderHook(() => useMoveCommit())
    expect(result.current.commit).toBe(DEFAULT_MOVE_COMMIT)
  })

  it('plays on when storage is blocked entirely', () => {
    vi.spyOn(Storage.prototype, 'getItem').mockImplementation(() => {
      throw new Error('denied')
    })
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw new Error('denied')
    })
    const { result } = renderHook(() => useMoveCommit())
    expect(result.current.commit).toBe(DEFAULT_MOVE_COMMIT)
    act(() => result.current.choose(MoveCommit.confirm))
    expect(result.current.commit).toBe(MoveCommit.confirm)
  })
})
