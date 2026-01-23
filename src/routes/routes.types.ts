import { ReactNode } from 'react'

export type AppRoute = {
  path: string
  element: ReactNode
  dontShowInNavbar?: boolean
  label?: string
}
