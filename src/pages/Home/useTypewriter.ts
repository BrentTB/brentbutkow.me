import { useEffect, useState } from 'react'
import { shuffle } from '../../utils/shuffled-cycle'

type TypewriterOptions = {
  /** Extra texts the typewriter cycles through, returning to the primary text between each. */
  alternates?: string[]
  /** Milliseconds per typed character. */
  typeMs?: number
  /** Milliseconds per deleted character — quicker than typing, like a held backspace. */
  deleteMs?: number
  /** How long the primary text stays before cycling. Most of the airtime belongs here. */
  holdPrimaryMs?: number
  /** How long an alternate stays before returning to the primary. */
  holdAltMs?: number
  /** How many leading characters survive a backspace (the `~/` prompt root). */
  keepChars?: number
  /** Shuffles the alternates once per mount — every visitor sees all of them, in their own order. */
  randomizeOrder?: boolean
  /**
   * Asked before each swap away from the primary; a non-null return is typed as the next
   * alternate instead of the rotation's pick (which stays put for the swap after). Must be a
   * stable reference — a fresh function every render restarts the animation.
   */
  nextOverride?: () => string | null
  /** When false, returns the primary text with no animation. */
  enabled?: boolean
}

/**
 * Types `text` one character at a time like a terminal, then — given alternates —
 * periodically backspaces to the prompt root and types the next identity, always
 * returning to the primary in between. Disabled hooks, reduced-motion users, and
 * environments without matchMedia (e.g. jsdom) get the primary text immediately.
 */
export function useTypewriter(
  text: string,
  {
    alternates = [],
    typeMs = 55,
    deleteMs = 35,
    holdPrimaryMs = 6500,
    holdAltMs = 4000,
    keepChars = 2,
    randomizeOrder = false,
    nextOverride,
    enabled = true,
  }: TypewriterOptions = {}
): string {
  const [display, setDisplay] = useState('')
  // Serialized so a caller passing a fresh array literal doesn't restart the cycle every render.
  const alternatesKey = JSON.stringify(alternates)

  useEffect(() => {
    const parsed: string[] = JSON.parse(alternatesKey)
    const alternateTexts = randomizeOrder ? shuffle(parsed) : parsed
    const reduceMotion =
      typeof window.matchMedia !== 'function' ||
      window.matchMedia('(prefers-reduced-motion: reduce)').matches
    if (!enabled || reduceMotion) {
      setDisplay(text)
      return
    }

    let timer: number
    let altIndex = 0
    const schedule = (fn: () => void, ms: number) => {
      timer = window.setTimeout(fn, ms)
    }

    const type = (target: string, chars: number, onDone: () => void) => {
      setDisplay(target.slice(0, chars))
      if (chars >= target.length) {
        onDone()
        return
      }
      schedule(() => type(target, chars + 1, onDone), typeMs)
    }

    const erase = (from: string, chars: number, onDone: () => void) => {
      setDisplay(from.slice(0, chars))
      if (chars <= keepChars) {
        onDone()
        return
      }
      schedule(() => erase(from, chars - 1, onDone), deleteMs)
    }

    const settle = (current: string) => {
      if (alternateTexts.length === 0) return
      const isPrimary = current === text
      schedule(
        () =>
          erase(current, current.length, () => {
            // Chosen here, the last instant before typing, so an eyebrow queued during the hold or
            // the erase-back-to-primary still lands on this cycle rather than the next one.
            // ?? short-circuits: an override leaves altIndex untouched, so rotation resumes in place.
            const next = isPrimary
              ? (nextOverride?.() ?? alternateTexts[altIndex++ % alternateTexts.length])
              : text
            type(next, keepChars, () => settle(next))
          }),
        isPrimary ? holdPrimaryMs : holdAltMs
      )
    }

    type(text, 0, () => settle(text))
    return () => window.clearTimeout(timer)
  }, [
    text,
    alternatesKey,
    typeMs,
    deleteMs,
    holdPrimaryMs,
    holdAltMs,
    keepChars,
    randomizeOrder,
    nextOverride,
    enabled,
  ])

  return display
}
