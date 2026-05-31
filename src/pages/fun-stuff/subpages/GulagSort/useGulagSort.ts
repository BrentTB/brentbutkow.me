import { useCallback, useRef, useState } from 'react'
import {
  GulagBlock,
  moveBlockBetweenGulags,
  performGulagSort,
  removeEmptyFinalGulag,
  removeRemovedFromGulags,
} from './gulag-sort'

const ANIMATION_FRAME_DURATION_S = 0.7

// Drives the Gulag Sort visualisation: holds the live gulag state, runs the
// async frame-by-frame animation produced by `performGulagSort`, and exposes
// `start` / `reset`. `gulagsRef` mirrors `gulags` so each step can read the
// latest state without waiting for a re-render between frames.
export function useGulagSort() {
  const [gulags, setGulags] = useState<GulagBlock[][]>([])
  const [isAnimating, setIsAnimating] = useState(false)
  const gulagsRef = useRef<GulagBlock[][]>([])

  const start = useCallback(
    async (numbers: number[], speedMultiplier: number) => {
      if (isAnimating || numbers.length === 0) return

      const newBlocks: GulagBlock[] = numbers.map((value, i) => ({
        value,
        id: `${Date.now()}-${i}`,
      }))

      const initialGulags = [[...newBlocks]]
      setGulags(initialGulags)
      gulagsRef.current = initialGulags
      setIsAnimating(true)

      const frames = performGulagSort(structuredClone(initialGulags))

      for (let i = 0; i < frames.length; i++) {
        await new Promise((resolve) =>
          setTimeout(resolve, ANIMATION_FRAME_DURATION_S * speedMultiplier * 1000)
        )
        const updatedGulags = structuredClone(gulagsRef.current)

        if (frames[i].isMerging) {
          removeRemovedFromGulags(updatedGulags)
          removeEmptyFinalGulag(updatedGulags)
        }

        if (frames[i].toGulagIndex === updatedGulags.length) {
          updatedGulags.push([])
        }
        moveBlockBetweenGulags(updatedGulags, frames[i])

        setGulags(updatedGulags)
        gulagsRef.current = updatedGulags
      }

      removeEmptyFinalGulag(gulagsRef.current)
      setIsAnimating(false)
    },
    [isAnimating]
  )

  const reset = useCallback(() => {
    setGulags([])
    gulagsRef.current = []
    setIsAnimating(false)
  }, [])

  return { gulags, isAnimating, start, reset }
}
