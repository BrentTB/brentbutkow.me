import { useSyncExternalStore } from 'react'

export type StickyHeaderState = {
  // Scrolled past the threshold — Recall Radar's location control collapses from tabs to a dropdown.
  collapsed: boolean
  // The site navbar is shown only at the top of the page; any scroll past the threshold retracts it.
  // Direction-independent: scrolling back up does NOT reveal it — only returning to the top does.
  navHidden: boolean
}

// Scrolling past this many pixels collapses the location control and retracts the navbar. Small, so
// the navbar steps aside as soon as you leave the very top, but with enough tolerance not to flicker.
const THRESHOLD = 72

let state: StickyHeaderState = { collapsed: false, navHidden: false }
let frame = 0
const listeners = new Set<() => void>()

function recompute(): void {
  frame = 0
  // collapsed and navHidden are the same signal — "away from the top" — named separately for the two
  // consumers (the location control collapses; the navbar retracts).
  const scrolled = window.scrollY > THRESHOLD
  if (scrolled !== state.collapsed) {
    // New object only when it changed — useSyncExternalStore bails out on a stable reference.
    state = { collapsed: scrolled, navHidden: scrolled }
    for (const notify of listeners) notify()
  }
}

function onScroll(): void {
  // Coalesce a burst of scroll events into one read per frame.
  if (!frame) frame = requestAnimationFrame(recompute)
}

function subscribe(notify: () => void): () => void {
  listeners.add(notify)
  if (listeners.size === 1) {
    window.addEventListener('scroll', onScroll, { passive: true })
  }
  return () => {
    listeners.delete(notify)
    if (listeners.size === 0) {
      window.removeEventListener('scroll', onScroll)
      if (frame) cancelAnimationFrame(frame)
      frame = 0
    }
  }
}

function getSnapshot(): StickyHeaderState {
  return state
}

// One scroll listener, one source of truth — shared by the site navbar (auto-hide on the Recall
// Radar route) and Recall Radar's sticky bar (location collapse + the offset it sits at), so the two
// can never disagree about whether the page is scrolled. Module-level so every consumer reads the
// same store rather than each attaching its own listener.
export function useStickyHeader(): StickyHeaderState {
  return useSyncExternalStore(subscribe, getSnapshot, getSnapshot)
}
