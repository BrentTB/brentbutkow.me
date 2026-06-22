import { ReactNode } from 'react'

export type AppRoute = {
  path: string
  element: ReactNode
  dontShowInNavbar?: boolean
  label?: string
  /** Full document title for this route (drives the browser tab / SEO). */
  title?: string
  /** Meta description for this route (drives search snippets + Open Graph). */
  description?: string
}
