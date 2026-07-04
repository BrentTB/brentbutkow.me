// Route pathname → terminal home path. Matches what the home-page terminal's `cd` accepts, so the
// path shown on a page is the same string that navigates to it: `/experience` → `~/experience`.
export function toTerminalPath(pathname: string): string {
  const trimmed = pathname.replace(/\/+$/, '')
  return trimmed === '' ? '~' : `~${trimmed}`
}

export type Breadcrumb = { label: string; href: string; linkable: boolean; current: boolean }

// The structural parent of a route — one segment up. Used as the default back target when a page
// doesn't name its own (e.g. a detail page pointing past URL segments that have no page).
export function getRouteFallbackPath(pathname: string): string | undefined {
  if (pathname === '/' || pathname === '') return undefined
  const trimmed = pathname.replace(/\/$/, '')
  const lastSlash = trimmed.lastIndexOf('/')
  return lastSlash <= 0 ? '/' : trimmed.slice(0, lastSlash)
}

// Splits a route into a terminal breadcrumb: `~` (home) then one crumb per segment, each with its
// cumulative href. A crumb is `linkable` when it maps to a real page — every ancestor by default, or
// only those up to `linkableThrough` when the tail segments have no page of their own (a recall's
// `/fda/H-1078-2026`). The final segment is the `current` page: shown, never a link.
export function toBreadcrumbs(pathname: string, linkableThrough?: string): Breadcrumb[] {
  const segments = pathname.split('/').filter(Boolean)
  const crumbs: Breadcrumb[] = [
    { label: '~', href: '/', linkable: segments.length > 0, current: segments.length === 0 },
  ]
  let href = ''
  segments.forEach((segment, index) => {
    href += `/${segment}`
    const isLast = index === segments.length - 1
    const withinReach =
      linkableThrough === undefined ||
      href === linkableThrough ||
      linkableThrough.startsWith(`${href}/`)
    crumbs.push({ label: segment, href, linkable: !isLast && withinReach, current: isLast })
  })
  return crumbs
}
