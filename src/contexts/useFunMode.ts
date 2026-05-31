import { createContext, useContext } from 'react'

export type FunModeContextType = {
  isFunMode: boolean
  setIsFunMode: (value: boolean) => void
}

export const FunModeContext = createContext<FunModeContextType | undefined>(undefined)

export function useFunMode() {
  const context = useContext(FunModeContext)
  if (context === undefined) {
    throw new Error('useFunMode must be used within a FunModeProvider')
  }
  return context
}
