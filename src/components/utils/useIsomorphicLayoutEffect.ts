import { useEffect, useLayoutEffect } from 'react'

// useLayoutEffect in the browser; useEffect during prerender, where layout effects never run anyway
// and React warns on every one it meets.
export const useIsomorphicLayoutEffect =
  typeof document === 'undefined' ? useEffect : useLayoutEffect
