import { useSyncExternalStore } from 'react'

// Baked in by vite.config.ts. The prerendered footer shows this year, so hydration starts from it too.
export const BUILD_YEAR = Number(import.meta.env.VITE_BUILD_YEAR)

const noSubscription = () => () => {}
const currentYear = () => new Date().getFullYear()

// The visitor's current year, hydrating from the build year so a page built last December still
// hydrates cleanly in January.
export function useCurrentYear(): number {
  return useSyncExternalStore(noSubscription, currentYear, () => BUILD_YEAR)
}
