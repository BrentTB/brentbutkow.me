import { act, renderHook } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { DEFAULT_MOVE_COMMIT, MOVE_COMMIT_KEY, useMoveCommit } from './useMoveCommit'
import { MoveCommit } from './othello.types'

beforeEach(() => localStorage.clear())
afterEach(() => localStorage.clear())

describe('useMoveCommit', () => {
  it('defaults to instant when nothing is stored', () => {
    const { result } = renderHook(() => useMoveCommit())
    expect(result.current.commit).toBe(DEFAULT_MOVE_COMMIT)
  })

  it('reads a stored preference', () => {
    localStorage.setItem(MOVE_COMMIT_KEY, MoveCommit.confirm)
    const { result } = renderHook(() => useMoveCommit())
    expect(result.current.commit).toBe(MoveCommit.confirm)
  })

  it('persists a chosen preference', () => {
    const { result } = renderHook(() => useMoveCommit())
    act(() => result.current.choose(MoveCommit.confirm))
    expect(result.current.commit).toBe(MoveCommit.confirm)
    expect(localStorage.getItem(MOVE_COMMIT_KEY)).toBe(MoveCommit.confirm)
  })

  it('ignores a junk stored value', () => {
    localStorage.setItem(MOVE_COMMIT_KEY, 'nonsense')
    const { result } = renderHook(() => useMoveCommit())
    expect(result.current.commit).toBe(DEFAULT_MOVE_COMMIT)
  })
})
