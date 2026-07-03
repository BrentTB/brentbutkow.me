import { KeyboardEvent, useCallback, useEffect, useRef, useState } from 'react'
import styles from './Terminal.module.scss'
import { TerminalLineKind, useTerminal } from './useTerminal'

const PROMPT = 'brent@butkow:~$'

// Tap-to-run starters shown on narrow screens, where Tab-completion isn't available.
const mobileChips = ['help', 'ls', 'cd projects', 'joke', 'fun']

function isTypingTarget(target: EventTarget | null): boolean {
  return (
    target instanceof HTMLElement &&
    (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable)
  )
}

export function Terminal() {
  const inputRef = useRef<HTMLInputElement>(null)
  const logRef = useRef<HTMLDivElement>(null)
  const [active, setActive] = useState(false)

  const close = useCallback(() => {
    setActive(false)
    inputRef.current?.blur()
  }, [])

  const { lines, input, setInput, ghost, run, acceptCompletion, recallHistory } = useTerminal({
    onExit: close,
  })

  // '/' or '~' focuses the terminal from anywhere on the page, terminal-style.
  useEffect(() => {
    const onKeyDown = (event: globalThis.KeyboardEvent) => {
      if (event.key !== '/' && event.key !== '~') return
      if (isTypingTarget(event.target) || event.metaKey || event.ctrlKey || event.altKey) return
      event.preventDefault()
      inputRef.current?.focus()
    }
    document.addEventListener('keydown', onKeyDown)
    return () => document.removeEventListener('keydown', onKeyDown)
  }, [])

  // Pin to the newest line — on each new command and when the log remounts on reopen.
  useEffect(() => {
    if (logRef.current) logRef.current.scrollTop = logRef.current.scrollHeight
  }, [lines, active])

  const onInputKeyDown = (event: KeyboardEvent<HTMLInputElement>) => {
    switch (event.key) {
      case 'Enter':
        run()
        break
      case 'Tab':
        event.preventDefault()
        acceptCompletion()
        break
      case 'ArrowUp':
        event.preventDefault()
        recallHistory(-1)
        break
      case 'ArrowDown':
        event.preventDefault()
        recallHistory(1)
        break
      case 'Escape':
        // Consume the key so the browser doesn't also act on it (e.g. exiting fullscreen).
        event.preventDefault()
        event.stopPropagation()
        close()
        break
    }
  }

  const showLog = active && lines.length > 0

  return (
    <section className={styles.terminal} aria-label="Site terminal">
      <div
        className={styles.frame}
        data-active={active || undefined}
        onClick={() => {
          // Focus unless the click was selecting log text to copy.
          if (window.getSelection()?.toString() === '') inputRef.current?.focus()
        }}
      >
        {showLog && (
          <div ref={logRef} className={styles.log} role="log" aria-live="polite">
            {lines.map((line, index) => (
              <p key={index} className={styles.line}>
                {line.kind === TerminalLineKind.command && (
                  <span className={styles.prompt} aria-hidden="true">
                    {PROMPT}{' '}
                  </span>
                )}
                {line.text}
              </p>
            ))}
          </div>
        )}
        <div className={styles.promptRow}>
          <span className={styles.prompt} aria-hidden="true">
            {PROMPT}
          </span>
          <div className={styles.inputWrap}>
            {ghost && (
              <span className={styles.ghost} aria-hidden="true">
                <span className={styles.ghostTyped}>{input}</span>
                {ghost}
              </span>
            )}
            <input
              ref={inputRef}
              className={styles.input}
              value={input}
              onChange={(event) => setInput(event.target.value)}
              onKeyDown={onInputKeyDown}
              onFocus={() => setActive(true)}
              placeholder="try 'help'"
              aria-label="Type a command"
              spellCheck={false}
              autoComplete="off"
              autoCapitalize="off"
              autoCorrect="off"
            />
          </div>
        </div>
      </div>
      <div className={styles.chips}>
        {mobileChips.map((chip) => (
          <button
            key={chip}
            className={styles.chip}
            onClick={() => {
              setActive(true)
              run(chip)
            }}
          >
            {chip}
          </button>
        ))}
      </div>
      <p className={styles.hint} aria-hidden="true">
        press / anywhere to jump to the terminal · Tab completes · Esc closes
      </p>
    </section>
  )
}
