import { ReactNode } from 'react'
import { RouteMeta } from './routes.meta'

// Routing fields plus the SEO/meta fields from RouteMeta, which routes.config spreads in via
// metaFor(). Meta is Partial because redirect-only routes carry none — RouteMeta stays the single
// definition of the meta shape, so the two can't drift.
export type AppRoute = Partial<RouteMeta> & {
  path: string
  element: ReactNode
  dontShowInNavbar?: boolean
  label?: string
  /** Redirect-only route (legacy URL → new home). Not indexed, no title/description. */
  redirect?: boolean
}
