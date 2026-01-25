import { ReactNode, useState, useEffect } from 'react'
import { FunModeContext } from './FunMode'
import { disableFunMode, enableFunMode, isFunModeEnabled } from '../modes/fun-mode'

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
