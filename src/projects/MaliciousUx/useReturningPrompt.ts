import { useCallback, useEffect, useState } from 'react'

type ReturningPrompt = {
  visible: boolean
  /** Dismissed and staying dismissed. */
  gone: boolean
  /** How many times it has come back on its own. */
  returns: number
  /** Seconds until the next appearance, or null while it is showing or dismissed for good. */
  secondsLeft: number | null
  /** Dismiss it. `forGood` is the keyboard path: gone means gone. */
  dismiss: (forGood: boolean) => void
  /** Put it back and forget the count. */
  reset: () => void
}

/**
 * A prompt that treats "no" as "not yet": dismiss it and it waits out a timer, then asks again. The
 * countdown is exposed so an exhibit can show the visitor the thing a real banner keeps to itself.
 */
export function useReturningPrompt(delayMs: number): ReturningPrompt {
  const [visible, setVisible] = useState(true)
  const [gone, setGone] = useState(false)
  const [returns, setReturns] = useState(0)
  const [secondsLeft, setSecondsLeft] = useState<number | null>(null)

  useEffect(() => {
    if (visible || gone) return

    setSecondsLeft(Math.ceil(delayMs / 1000))
    const tick = setInterval(() => {
      setSecondsLeft((left) => (left === null || left <= 1 ? 0 : left - 1))
    }, 1000)
    const comeBack = setTimeout(() => {
      setVisible(true)
      setSecondsLeft(null)
      setReturns((count) => count + 1)
    }, delayMs)

    return () => {
      clearInterval(tick)
      clearTimeout(comeBack)
    }
  }, [visible, gone, delayMs])

  const dismiss = useCallback((forGood: boolean) => {
    setVisible(false)
    if (forGood) setGone(true)
  }, [])

  const reset = useCallback(() => {
    setVisible(true)
    setGone(false)
    setReturns(0)
    setSecondsLeft(null)
  }, [])

  return { visible, gone, returns, secondsLeft, dismiss, reset }
}
