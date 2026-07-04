// Route pathname → terminal home path. Matches what the home-page terminal's `cd` accepts, so the
// path shown on a page is the same string that navigates to it: `/experience` → `~/experience`.
export function toTerminalPath(pathname: string): string {
  const trimmed = pathname.replace(/\/+$/, '')
  return trimmed === '' ? '~' : `~${trimmed}`
}
