// Records the route at each browser-history index. A back button uses this to tell whether the entry
// it would return to is its structural parent: if so it goes back (keeping that entry's query string
// and scroll), otherwise it navigates to the parent fresh. Keyed by history index so it stays correct
// across back/forward, not just linear forward navigation.
const visitedByIndex = new Map<number, string>()

function currentHistoryIndex(): number {
  const state = window.history.state as { idx?: number } | null
  return typeof state?.idx === 'number' ? state.idx : 0
}

export function recordVisit(pathname: string) {
  visitedByIndex.set(currentHistoryIndex(), pathname)
}

export function previousVisitedPath(): string | undefined {
  return visitedByIndex.get(currentHistoryIndex() - 1)
}

export function clearVisitedHistory() {
  visitedByIndex.clear()
}
