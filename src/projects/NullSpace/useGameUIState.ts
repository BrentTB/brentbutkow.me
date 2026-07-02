import { createContext, useContext } from 'react'
import type { GameUIState } from './useNullSpace'

// The whole game's live UI snapshot, shared with every HUD / overlay component so
// it never has to be threaded through intermediate layers as a prop.
const GameUIStateContext = createContext<GameUIState | null>(null)

export const GameUIStateProvider = GameUIStateContext.Provider

export function useGameUIState(): GameUIState {
  const uiState = useContext(GameUIStateContext)
  if (uiState === null) {
    throw new Error('useGameUIState must be used within a GameUIStateProvider')
  }
  return uiState
}
