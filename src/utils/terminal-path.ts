// Route pathname → terminal home path. Matches what the home-page terminal's `cd` accepts, so the
// path shown on a page is the same string that navigates to it: `/experience` → `~/experience`.
export function toTerminalPath(pathname: string): string {
  const trimmed = pathname.replace(/\/+$/, '')
  return trimmed === '' ? '~' : `~${trimmed}`
}

export type Breadcrumb = { label: string; href: string; current: boolean }

// Splits a route path into a clickable terminal breadcrumb: `~` (home) followed by one crumb per
// segment, each carrying the cumulative href it links to. `lastIsCurrent` marks the final segment as
// the page you're on (rendered plain, not a link) — pass false when the path is a parent stand-in
// (e.g. a detail page pointing at its list), so every crumb stays navigable.
export function toBreadcrumbs(displayPath: string, lastIsCurrent: boolean): Breadcrumb[] {
  const segments = displayPath.split('/').filter(Boolean)
  const crumbs: Breadcrumb[] = [{ label: '~', href: '/', current: segments.length === 0 }]
  let href = ''
  segments.forEach((segment, index) => {
    href += `/${segment}`
    const isLast = index === segments.length - 1
    crumbs.push({ label: segment, href, current: isLast && lastIsCurrent })
  })
  return crumbs
}
