import { useEffect, useRef, useState } from 'react'

// Copies text to the clipboard and flips a `copied` flag for `resetMs` before
// clearing it. The pending reset timer is cancelled on re-copy and on unmount,
// so a quickly-unmounted component never sets state after it's gone.
export function useCopyToClipboard(resetMs = 2000) {
  const [copied, setCopied] = useState(false)
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => {
    return () => {
      if (timeoutRef.current !== null) {
        clearTimeout(timeoutRef.current)
      }
    }
  }, [])

  const copy = async (text: string) => {
    try {
      if (timeoutRef.current !== null) {
        clearTimeout(timeoutRef.current)
      }

      await navigator.clipboard.writeText(text)
      setCopied(true)

      timeoutRef.current = setTimeout(() => {
        setCopied(false)
        timeoutRef.current = null
      }, resetMs)
    } catch (err) {
      console.error('Failed to copy text:', err)
    }
  }

  return { copied, copy }
}
