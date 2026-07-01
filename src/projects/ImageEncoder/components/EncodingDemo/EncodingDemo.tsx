import { ChangeEvent, KeyboardEvent, useEffect, useState } from 'react'
import { Base } from '../../image-encoder.types'
import { baseOptions } from '../../data'
import { Segmented } from '../Segmented/Segmented'
import {
  activeChannelAt,
  channelValueAt,
  encodeChannel,
  finalStep,
  IDLE,
  isHighlightStep,
  Phase,
  phaseAt,
  START_STEP,
} from './encoding'
import styles from './EncodingDemo.module.scss'

// Two pixels, three channels each, so the message is a six-digit string.
const CHANNEL_META = [
  { key: 'r', name: 'R' },
  { key: 'g', name: 'G' },
  { key: 'b', name: 'B' },
] as const
const PIXEL_COUNT = 2
const CHANNEL_COUNT = PIXEL_COUNT * CHANNEL_META.length

// Channel values are scaled to 0..DEMO_MAX so the bars fit on one axis. Real
// channels run 0..255, but the maths is identical: the digit stored in a channel
// is value mod base. Originals stay inside 0..ORIGINAL_MAX, leaving headroom above
// the tallest bar for its value label.
const DEMO_MAX = 24
const ORIGINAL_MIN = 2
const ORIGINAL_MAX = 18

// How long each animation step holds before the next channel or phase, and the
// shorter beat a channel is only highlighted before it starts moving.
const STEP_MS = 500
const HIGHLIGHT_MS = 200

const baseSegments = baseOptions.map((option) => ({ value: option.value, label: option.label }))

function randomValues(): number[] {
  const span = ORIGINAL_MAX - ORIGINAL_MIN + 1
  return Array.from(
    { length: CHANNEL_COUNT },
    () => ORIGINAL_MIN + Math.floor(Math.random() * span)
  )
}

// A random six-digit message, every digit valid for the chosen base.
function randomCode(base: Base): string {
  return Array.from({ length: CHANNEL_COUNT }, () => Math.floor(Math.random() * base)).join('')
}

export function EncodingDemo() {
  const [base, setBase] = useState<Base>(Base.binary)
  const [values, setValues] = useState<number[]>(() => [13, 6, 17, 9, 18, 4])
  // The typed code is the source of truth. It can be shorter than six while
  // typing; any channel the code doesn't reach stores a 0.
  const [code, setCode] = useState('100110')
  const [animStep, setAnimStep] = useState(IDLE)
  const animating = animStep !== IDLE

  const digits = Array.from({ length: CHANNEL_COUNT }, (_, i) => Number(code[i] ?? 0))

  // Advance one step at a time, then return to the interactive idle state.
  useEffect(() => {
    if (animStep === IDLE) return
    const next = animStep >= finalStep(CHANNEL_COUNT) ? IDLE : animStep + 1
    const hold = isHighlightStep(animStep, CHANNEL_COUNT) ? HIGHLIGHT_MS : STEP_MS
    const id = setTimeout(() => setAnimStep(next), hold)
    return () => clearTimeout(id)
  }, [animStep])

  const activeChannel = animStep === IDLE ? -1 : activeChannelAt(animStep, CHANNEL_COUNT)
  const activePhase = phaseAt(animStep, CHANNEL_COUNT)

  // The height, label, and remainder a channel shows at the current step.
  const shownValue = (channel: number): number => {
    if (animStep === IDLE) return encodeChannel(values[channel], base, digits[channel])
    return channelValueAt(animStep, channel, values[channel], base, digits[channel], CHANNEL_COUNT)
  }

  // Pad the code first so every channel has a digit to add during playback.
  const play = () => {
    setCode((prev) => prev.padEnd(CHANNEL_COUNT, '0'))
    // Reduced-motion: skip the stepped playback and show the encoded result straight away (IDLE
    // already renders the finished bars).
    if (window.matchMedia?.('(prefers-reduced-motion: reduce)').matches) {
      setAnimStep(IDLE)
      return
    }
    setAnimStep(START_STEP)
  }

  const changeBase = (next: Base) => {
    setBase(next)
    // A digit must stay below its base, so fold any that overshoot the new one.
    setCode((prev) => [...prev].map((char) => Number(char) % next).join(''))
  }

  const nudgeDigit = (channel: number, step: number) => {
    const next = digits.slice()
    next[channel] = (next[channel] + step + base) % base
    setCode(next.join(''))
  }

  // Reject a character key that isn't a digit in range before it reaches the DOM,
  // so a bad key never bounces the caret to the end. Control keys and shortcuts
  // (Backspace, arrows, paste) carry through; a pasted code is cleaned in onChange.
  const onMessageKeyDown = (event: KeyboardEvent<HTMLInputElement>) => {
    if (event.ctrlKey || event.metaKey || event.altKey || event.key.length !== 1) return
    if (!/\d/.test(event.key) || Number(event.key) >= base) event.preventDefault()
  }

  // Keep the digits that fit the base and drop anything out of range, so the
  // field only ever holds a valid code.
  const onMessageChange = (event: ChangeEvent<HTMLInputElement>) => {
    const clean = event.target.value
      .replace(/\D/g, '')
      .split('')
      .filter((char) => Number(char) < base)
      .slice(0, CHANNEL_COUNT)
      .join('')
    setCode(clean)
  }

  // Fill out a short code once the field loses focus, so it reads as all six.
  const padCode = () => {
    setCode((prev) => prev.padEnd(CHANNEL_COUNT, '0'))
  }

  const digitLabel = base === Base.binary ? 'bit' : 'digit'

  return (
    <div className={styles.demo}>
      <div className={styles.controls}>
        <div className={styles.field}>
          <span className={styles.controlLabel}>Base</span>
          <Segmented
            ariaLabel="Number base stored per channel"
            options={baseSegments}
            value={base}
            onChange={changeBase}
            disabled={animating}
          />
        </div>

        <div className={styles.field}>
          <label className={styles.controlLabel} htmlFor="demo-message">
            Message ({CHANNEL_COUNT} {digitLabel}s{base === Base.binary ? '' : `, 0 to ${base - 1}`}
            )
          </label>
          <div className={styles.messageRow}>
            <input
              id="demo-message"
              className={styles.message}
              value={code}
              onKeyDown={onMessageKeyDown}
              onChange={onMessageChange}
              onBlur={padCode}
              inputMode="numeric"
              maxLength={CHANNEL_COUNT}
              spellCheck={false}
              disabled={animating}
              aria-describedby="demo-message-hint"
            />
            <button
              type="button"
              className={styles.randomizeCode}
              onClick={() => setCode(randomCode(base))}
              disabled={animating}
              aria-label={`Fill the message with random ${digitLabel}s`}
            >
              <span className={styles.reloadGlyph} aria-hidden="true">
                ⟳
              </span>
            </button>
          </div>
        </div>

        <div className={styles.actions}>
          <ol className={styles.phaseNote}>
            <li className={activePhase === Phase.rounding ? styles.phaseActive : ''}>
              Round each channel down to a multiple of {base}
            </li>
            <li className={activePhase === Phase.adding ? styles.phaseActive : ''}>
              Add the {digitLabel} you want to hide
            </li>
          </ol>
          <div className={styles.actionButtons}>
            <button
              type="button"
              className={styles.randomizeButton}
              onClick={() => setValues(randomValues())}
              disabled={animating}
            >
              New pixels
            </button>
            <button type="button" className={styles.playButton} onClick={play} disabled={animating}>
              {animating ? 'Encoding…' : '▶ Encode'}
            </button>
          </div>
        </div>
      </div>

      <p id="demo-message-hint" className={styles.hint}>
        Type the {digitLabel}s to hide, or nudge a channel with its arrows. Press Encode to watch it
        in two passes: first it rounds every channel down to a multiple of {base}, then it adds each{' '}
        {digitLabel} so the remainder carries your message.
      </p>

      <div className={styles.pixels}>
        {Array.from({ length: PIXEL_COUNT }, (_, pixelIndex) => (
          <div key={pixelIndex} className={styles.pixel}>
            <span className={styles.pixelLabel}>Pixel {pixelIndex + 1}</span>
            <div className={styles.channels}>
              {CHANNEL_META.map((channel, c) => {
                const i = pixelIndex * CHANNEL_META.length + c
                const original = values[i]
                const digit = digits[i]
                const shown = shownValue(i)
                const active = i === activeChannel

                return (
                  <div
                    key={channel.key}
                    className={`${styles.channel} ${styles[channel.key]} ${active ? styles.active : ''}`}
                  >
                    <div className={styles.track}>
                      <span
                        className={styles.original}
                        style={{ bottom: `${(original / DEMO_MAX) * 100}%` }}
                      >
                        <span className={styles.originalTag}>was {original}</span>
                      </span>
                      <div
                        className={styles.fill}
                        style={{ height: `${(shown / DEMO_MAX) * 100}%` }}
                      >
                        <span className={styles.fillValue}>{shown}</span>
                      </div>
                    </div>

                    <span className={styles.channelName}>{channel.name}</span>
                    <span className={styles.math}>
                      {shown} mod {base} = <strong>{shown % base}</strong>
                    </span>

                    <div className={styles.stepper}>
                      <button
                        type="button"
                        onClick={() => nudgeDigit(i, -1)}
                        disabled={animating}
                        aria-label={`Lower the ${digitLabel} in pixel ${pixelIndex + 1} ${channel.name}`}
                      >
                        −
                      </button>
                      <span className={styles.digit}>{digit}</span>
                      <button
                        type="button"
                        onClick={() => nudgeDigit(i, +1)}
                        disabled={animating}
                        aria-label={`Raise the ${digitLabel} in pixel ${pixelIndex + 1} ${channel.name}`}
                      >
                        +
                      </button>
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
