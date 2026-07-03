import { KeyboardEvent, useCallback, useEffect, useRef, useState } from 'react'
import styles from './Terminal.module.scss'
import { TRAIN_DURATION_MS } from './ascii'
import { useMatrixRain } from './useMatrixRain'
import { TerminalLineKind, TerminalMode, useTerminal } from './useTerminal'

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
  const sectionRef = useRef<HTMLElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)
  const logRef = useRef<HTMLDivElement>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const matrixRef = useRef<HTMLDivElement>(null)
  const matrixArmed = useRef(false)
  const refocusAfterMatrix = useRef(false)
  const [active, setActive] = useState(false)

  const close = useCallback(() => {
    setActive(false)
    inputRef.current?.blur()
  }, [])

  const {
    lines,
    input,
    setInput,
    ghost,
    animation,
    mode,
    run,
    acceptCompletion,
    recallHistory,
    cancelAnimation,
    exitFullscreen,
    exitMatrix,
  } = useTerminal({ onExit: close })

  useMatrixRain(canvasRef, mode === TerminalMode.matrix)

  // Fullscreen grows the terminal past the fold — scroll it to the viewport center so the whole
  // thing is visible without the user chasing it down the page.
  useEffect(() => {
    if (mode === TerminalMode.inline) return
    const reduce = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches
    sectionRef.current?.scrollIntoView({ block: 'center', behavior: reduce ? 'auto' : 'smooth' })
  }, [mode])

  // Closing the terminal stops any train and drops out of fullscreen (Escape or the exit command).
  useEffect(() => {
    if (!active) {
      cancelAnimation()
      exitFullscreen()
    }
  }, [active, cancelAnimation, exitFullscreen])

  // Focus the rain so its own keydown handler can catch the exit — the rain closes only on a key
  // pressed while it holds focus, never on a click or a key aimed elsewhere. Arm only after the
  // launching key is released: a held Enter fires repeat keydowns, and without this the command's
  // own Enter would exit on entry.
  useEffect(() => {
    if (mode !== TerminalMode.matrix) return
    matrixArmed.current = false
    matrixRef.current?.focus()
    const arm = () => {
      matrixArmed.current = true
    }
    window.addEventListener('keyup', arm, { once: true })
    return () => window.removeEventListener('keyup', arm)
  }, [mode])

  const onMatrixKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    if (!matrixArmed.current) return
    event.preventDefault()
    // The input isn't mounted yet (still matrix this render) — refocus once it comes back.
    refocusAfterMatrix.current = true
    exitMatrix()
  }

  // Return focus to the command input after the rain closes, so typing continues uninterrupted.
  useEffect(() => {
    if (mode !== TerminalMode.matrix && refocusAfterMatrix.current) {
      refocusAfterMatrix.current = false
      inputRef.current?.focus({ preventScroll: true })
    }
  }, [mode])

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

  // Pin to the newest line — on each new command, when the log remounts on reopen, and when a
  // train appears (animation flips null → sprite, not per frame — CSS drives the motion).
  useEffect(() => {
    if (logRef.current) logRef.current.scrollTop = logRef.current.scrollHeight
  }, [lines, active, animation])

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
        // Step down one level: fullscreen → inline, then inline → closed.
        if (mode !== TerminalMode.inline) exitFullscreen()
        else close()
        break
    }
  }

  // Expanded shows the (tall) log even before any command, so `fullscreen` visibly grows at once.
  const showLog =
    mode !== TerminalMode.matrix && (mode === TerminalMode.expanded || (active && lines.length > 0))

  return (
    <section
      ref={sectionRef}
      className={styles.terminal}
      aria-label="Site terminal"
      data-mode={mode}
    >
      <div
        className={styles.frame}
        data-active={active || undefined}
        // Mouse convenience only — the input itself is the keyboard-accessible control.
        role="presentation"
        onClick={() => {
          if (mode === TerminalMode.matrix) return // the rain closes only via its own keydown
          // Focus unless the click was selecting log text to copy.
          if (window.getSelection()?.toString() === '') inputRef.current?.focus()
        }}
      >
        {mode === TerminalMode.matrix && (
          <div
            ref={matrixRef}
            className={styles.matrixWrap}
            role="button"
            aria-label="Matrix rain, press any key to close"
            tabIndex={0}
            onKeyDown={onMatrixKeyDown}
          >
            <canvas ref={canvasRef} className={styles.matrix} aria-hidden="true" />
            <span className={styles.matrixHint} aria-hidden="true">
              press any key
            </span>
          </div>
        )}
        {mode !== TerminalMode.matrix && showLog && (
          <div ref={logRef} className={styles.log} role="log" aria-live="polite">
            {lines.map((line, index) =>
              line.kind === TerminalLineKind.art ? (
                <pre key={index} className={styles.art}>
                  {line.text}
                </pre>
              ) : (
                <p key={index} className={styles.line}>
                  {line.kind === TerminalLineKind.command && (
                    <span className={styles.prompt} aria-hidden="true">
                      {PROMPT}{' '}
                    </span>
                  )}
                  {line.text}
                </p>
              )
            )}
            {animation !== null && (
              <div className={styles.track}>
                <pre
                  className={styles.train}
                  style={{ animationDuration: `${TRAIN_DURATION_MS}ms` }}
                >
                  {animation}
                </pre>
              </div>
            )}
          </div>
        )}
        {mode !== TerminalMode.matrix && (
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
        )}
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
        press / to jump here · Tab completes · Esc closes
      </p>
    </section>
  )
}
