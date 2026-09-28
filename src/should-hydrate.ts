import { isFunModeEnabled } from './modes/fun-mode'

// Prerendered pages are always the Professional view, so a Fun-mode visitor gets a fresh client render
// instead of a hydration mismatch. An empty root (the SPA fallback shell) has nothing to hydrate.
export const shouldHydrate = (container: HTMLElement): boolean =>
  container.hasChildNodes() && !isFunModeEnabled()
