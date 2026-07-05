import { KeyboardEvent, useCallback, useEffect, useRef, useState } from 'react'
import styles from './Terminal.module.scss'
import { useFunMode } from '../../../../contexts/useFunMode'
import { TRAIN_DURATION_MS } from './ascii'
import { cascadeTiming } from './terminal-cascade'
import { useMatrixRain } from './useMatrixRain'
import { TerminalLineKind, TerminalMode, useTerminal } from './useTerminal'

const PROMPT = 'brent@butkow:~$'

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
  // The rain closes on a key (desktop) or a second tap (works on mobile, which has no keys). The
  // first tap only "selects" it, so the tap that might have been meant for something else can't
  // dismiss it by accident.
  const [matrixSelected, setMatrixSelected] = useState(false)
  const { isFunMode } = useFunMode()
  // Fun-mode-only: the just-accepted completion suffix, lit letter-by-letter over an input whose
  // own text is hidden for the moment. Null when no cascade is playing.
  const [cascade, setCascade] = useState<{ prefix: string; suffix: string } | null>(null)
  const cascadeTimeout = useRef<ReturnType<typeof setTimeout>>()

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

  // Focus the rain so its keydown handler can catch a key-press exit; start it unselected so the
  // first tap only selects. Arm the key path only after the launching key is released: a held Enter
  // fires repeat keydowns, and without this the command's own Enter would exit on entry.
  useEffect(() => {
    if (mode !== TerminalMode.matrix) return
    matrixArmed.current = false
    setMatrixSelected(false)
    matrixRef.current?.focus()
    const arm = () => {
      matrixArmed.current = true
    }
    window.addEventListener('keyup', arm, { once: true })
    return () => window.removeEventListener('keyup', arm)
  }, [mode])

  // A tap/click anywhere outside the rain resets the two-step counter (and clears the ring), so
  // re-selecting it always takes two taps again — one stray tap can never leave it one-tap-from-close.
  useEffect(() => {
    if (mode !== TerminalMode.matrix) return
    const onOutside = (event: PointerEvent) => {
      if (matrixRef.current && !matrixRef.current.contains(event.target as Node)) {
        setMatrixSelected(false)
        matrixRef.current.blur()
      }
    }
    document.addEventListener('pointerdown', onOutside)
    return () => document.removeEventListener('pointerdown', onOutside)
  }, [mode])

  const dismissMatrix = () => {
    // The input isn't mounted yet (still matrix this render) — refocus once it comes back.
    refocusAfterMatrix.current = true
    exitMatrix()
  }

  const onMatrixKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    if (!matrixArmed.current) return
    // '/' and '~' are the terminal's focus keys — in the rain they only (re)highlight it, so the
    // press that brings focus here never doubles as the press that dismisses it.
    if (event.key === '/' || event.key === '~') return
    event.preventDefault()
    dismissMatrix()
  }

  // Tap/click to close — the mobile path, since there's no key to press there. The first tap only
  // selects (arming the exit); the next tap closes. Mirrors the '/'-then-key flow for keyboards.
  const onMatrixClick = () => {
    if (matrixSelected) {
      dismissMatrix()
    } else {
      setMatrixSelected(true)
      matrixRef.current?.focus()
    }
  }

  // Return focus to the command input after the rain closes, so typing continues uninterrupted.
  useEffect(() => {
    if (mode !== TerminalMode.matrix && refocusAfterMatrix.current) {
      refocusAfterMatrix.current = false
      inputRef.current?.focus({ preventScroll: true })
    }
  }, [mode])

  // '/' or '~' focuses the terminal from anywhere on the page, terminal-style. During the rain the
  // input isn't mounted, so it highlights the rain instead — a following key then dismisses it.
  useEffect(() => {
    const onKeyDown = (event: globalThis.KeyboardEvent) => {
      if (event.key !== '/' && event.key !== '~') return
      if (isTypingTarget(event.target) || event.metaKey || event.ctrlKey || event.altKey) return
      event.preventDefault()
      if (mode === TerminalMode.matrix) {
        matrixRef.current?.focus()
      } else {
        inputRef.current?.focus()
      }
    }
    document.addEventListener('keydown', onKeyDown)
    return () => document.removeEventListener('keydown', onKeyDown)
  }, [mode])

  // Pin to the newest line — on each new command, when the log remounts on reopen, and when a
  // train appears (animation flips null → sprite, not per frame — CSS drives the motion).
  useEffect(() => {
    if (logRef.current) logRef.current.scrollTop = logRef.current.scrollHeight
  }, [lines, active, animation])

  const cancelCascade = useCallback(() => {
    clearTimeout(cascadeTimeout.current)
    setCascade(null)
  }, [])

  // Play the fun-mode reveal over the accepted suffix. The completion is already applied, so this is
  // purely cosmetic: it tears down on any keystroke (see onChange / onInputKeyDown) and on unmount.
  const startCascade = (prefix: string, suffix: string) => {
    if (!isFunMode || !suffix) return
    if (window.matchMedia?.('(prefers-reduced-motion: reduce)')?.matches) return
    clearTimeout(cascadeTimeout.current)
    setCascade({ prefix, suffix })
    const { clearAfter } = cascadeTiming(suffix.length)
    cascadeTimeout.current = setTimeout(() => setCascade(null), clearAfter)
  }

  useEffect(() => () => clearTimeout(cascadeTimeout.current), [])

  const onInputKeyDown = (event: KeyboardEvent<HTMLInputElement>) => {
    if (event.key !== 'Tab') cancelCascade() // any other key finalizes the reveal
    switch (event.key) {
      case 'Enter':
        run()
        break
      case 'Tab': {
        event.preventDefault()
        const prefix = input
        const suffix = ghost
        acceptCompletion()
        startCascade(prefix, suffix)
        break
      }
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
          if (mode === TerminalMode.matrix) return // the rain handles its own tap/key close
          // Focus unless the click was selecting log text to copy.
          if (window.getSelection()?.toString() === '') inputRef.current?.focus()
        }}
      >
        {mode === TerminalMode.matrix && (
          <div
            ref={matrixRef}
            className={styles.matrixWrap}
            role="button"
            aria-label="Matrix rain, tap or press a key to close"
            tabIndex={0}
            onKeyDown={onMatrixKeyDown}
            onClick={onMatrixClick}
          >
            <canvas ref={canvasRef} className={styles.matrix} aria-hidden="true" />
            <span className={styles.matrixHint} aria-hidden="true">
              {matrixSelected ? 'tap again to close' : 'tap or press a key'}
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
              {ghost && !cascade && (
                <span className={styles.ghost} aria-hidden="true">
                  <span className={styles.ghostTyped}>{input}</span>
                  {/* Touch stand-in for Tab: on mobile the greyed suffix is tappable to accept the
                      completion (pointer-events gated to mobile in CSS). Decorative for a11y — typing
                      the full command works for everyone; desktop keeps Tab. */}
                  {/* eslint-disable-next-line jsx-a11y/no-static-element-interactions, jsx-a11y/click-events-have-key-events */}
                  <span
                    className={styles.ghostSuffix}
                    data-ghost-suffix
                    onPointerDown={(event) => event.preventDefault()}
                    onClick={() => {
                      const prefix = input
                      const suffix = ghost
                      acceptCompletion()
                      startCascade(prefix, suffix)
                      inputRef.current?.focus()
                    }}
                  >
                    {ghost}
                  </span>
                </span>
              )}
              {cascade &&
                (() => {
                  const { step } = cascadeTiming(cascade.suffix.length)
                  return (
                    <span className={styles.cascade} aria-hidden="true" data-cascade>
                      <span className={styles.cascadePrefix}>{cascade.prefix}</span>
                      {[...cascade.suffix].map((char, index) => (
                        <span
                          key={index}
                          className={styles.cascadeChar}
                          data-cascade-char
                          style={{ animationDelay: `${index * step}ms` }}
                        >
                          {char}
                        </span>
                      ))}
                    </span>
                  )
                })()}
              <input
                ref={inputRef}
                className={`${styles.input}${cascade ? ` ${styles.inputCascading}` : ''}`}
                value={input}
                onChange={(event) => {
                  cancelCascade()
                  setInput(event.target.value)
                }}
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
      <p className={styles.hint} aria-hidden="true">
        press / to jump here · Tab completes · Esc closes
      </p>
      <p className={styles.hintMobile} aria-hidden="true">
        tap the grey text to complete
      </p>
    </section>
  )
}
