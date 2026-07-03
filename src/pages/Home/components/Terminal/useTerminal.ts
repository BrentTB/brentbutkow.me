import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useFunMode } from '../../../../contexts/useFunMode'
import { jokesForMode } from '../../../../data/jokes'
import { cvHref } from '../../data'
import { completions, execute, TerminalActionType } from './terminal-engine'

export const TerminalLineKind = {
  command: 'command',
  output: 'output',
} as const
export type TerminalLineKind = (typeof TerminalLineKind)[keyof typeof TerminalLineKind]

export type TerminalLine = {
  kind: TerminalLineKind
  text: string
}

// Long enough to read the command's output before the page changes underneath it.
const NAVIGATE_AFTER_OUTPUT_MS = 900

type UseTerminalOptions = {
  onExit: () => void
}

export function useTerminal({ onExit }: UseTerminalOptions) {
  const navigate = useNavigate()
  const { isFunMode, setIsFunMode } = useFunMode()
  const [lines, setLines] = useState<TerminalLine[]>([])
  const [input, setInput] = useState('')
  const [history, setHistory] = useState<string[]>([])
  const [historyIndex, setHistoryIndex] = useState<number | null>(null)
  const navigateTimeout = useRef<ReturnType<typeof setTimeout>>()

  useEffect(() => () => clearTimeout(navigateTimeout.current), [])

  const ghost = useMemo(() => {
    const best = completions(input)[0]
    return best ? best.slice(input.length) : ''
  }, [input])

  const pickJoke = useCallback(() => {
    const pool = jokesForMode(isFunMode)
    return pool[Math.floor(Math.random() * pool.length)].joke
  }, [isFunMode])

  const run = useCallback(
    (command?: string) => {
      const raw = (command ?? input).trim()
      if (!raw) return
      setInput('')
      setHistory((previous) => [...previous, raw])
      setHistoryIndex(null)

      const result = execute(raw, { isFunMode, cvHref, pickJoke })
      const echoed: TerminalLine[] = [
        { kind: TerminalLineKind.command, text: raw },
        ...result.output.map((text) => ({ kind: TerminalLineKind.output, text })),
      ]

      switch (result.action.type) {
        case TerminalActionType.navigate: {
          const path = result.action.path
          if (!path) break
          setLines((previous) => [...previous, ...echoed])
          if (result.output.length > 0) {
            navigateTimeout.current = setTimeout(() => navigate(path), NAVIGATE_AFTER_OUTPUT_MS)
          } else {
            navigate(path)
          }
          return
        }
        case TerminalActionType.back:
          navigate(-1)
          return
        case TerminalActionType.toggleFun:
          setIsFunMode(!isFunMode)
          break
        case TerminalActionType.downloadCv: {
          if (cvHref) {
            const anchor = document.createElement('a')
            anchor.href = cvHref
            anchor.download = ''
            anchor.click()
          }
          break
        }
        case TerminalActionType.clear:
          setLines([])
          return
        case TerminalActionType.exit:
          setLines((previous) => [...previous, ...echoed])
          onExit()
          return
        case TerminalActionType.none:
          break
      }
      setLines((previous) => [...previous, ...echoed])
    },
    [input, isFunMode, navigate, onExit, pickJoke, setIsFunMode]
  )

  const acceptCompletion = useCallback(() => {
    const best = completions(input)[0]
    if (best) setInput(best)
  }, [input])

  const recallHistory = useCallback(
    (direction: -1 | 1) => {
      if (history.length === 0) return
      const current = historyIndex ?? history.length
      const next = current + direction
      if (next < 0) return
      if (next >= history.length) {
        setHistoryIndex(null)
        setInput('')
        return
      }
      setHistoryIndex(next)
      setInput(history[next])
    },
    [history, historyIndex]
  )

  return { lines, input, setInput, ghost, run, acceptCompletion, recallHistory }
}
