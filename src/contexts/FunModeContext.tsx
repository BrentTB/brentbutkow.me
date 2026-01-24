import { createContext, useContext, ReactNode, useState, useEffect } from 'react'
import { disableFunMode, enableFunMode, isFunModeEnabled } from '../modes/fun-mode'

type FunModeContextType = {
  isFunMode: boolean
  setIsFunMode: (value: boolean) => void
}

const FunModeContext = createContext<FunModeContextType | undefined>(undefined)

type FunModeProviderProps = {
  children: ReactNode
}

export function FunModeProvider({ children }: FunModeProviderProps) {
  const [isFunMode, setIsFunMode] = useState(() => isFunModeEnabled())

  useEffect(() => {
    if (isFunMode) {
      enableFunMode()
    } else {
      disableFunMode()
    }
  }, [isFunMode])

  return (
    <FunModeContext.Provider value={{ isFunMode, setIsFunMode }}>
      {children}
    </FunModeContext.Provider>
  )
}

export function useFunMode() {
  const context = useContext(FunModeContext)
  if (context === undefined) {
    throw new Error('useFunMode must be used within a FunModeProvider')
  }
  return context
}
