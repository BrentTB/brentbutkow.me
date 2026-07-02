import { describe, it, expect } from 'vitest'
import { renderHook } from '@testing-library/react'
import type { ReactNode } from 'react'
import { GameUIStateProvider, useGameUIState } from './useGameUIState'
import type { GameUIState } from './useNullSpace'

const uiState = { score: 42 } as unknown as GameUIState

describe('useGameUIState', () => {
  it('returns the provided uiState inside a provider', () => {
    const wrapper = ({ children }: { children: ReactNode }) => (
      <GameUIStateProvider value={uiState}>{children}</GameUIStateProvider>
    )
    const { result } = renderHook(() => useGameUIState(), { wrapper })
    expect(result.current).toBe(uiState)
  })

  it('throws when used outside a provider', () => {
    expect(() => renderHook(() => useGameUIState())).toThrow(/within a GameUIStateProvider/)
  })
})
