import { ChangeEvent, KeyboardEvent, useState } from 'react'
import { Base } from '../../image-encoder.types'
import { nearestWithRemainder } from '../../engine/codec'
import { baseOptions } from '../../data'
import { Segmented } from '../Segmented/Segmented'
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
// the tallest bar (the nudge adds at most 2) for its value label.
const DEMO_MAX = 24
const ORIGINAL_MIN = 2
const ORIGINAL_MAX = 18

const baseSegments = baseOptions.map((option) => ({ value: option.value, label: option.label }))

function randomValues(): number[] {
  const span = ORIGINAL_MAX - ORIGINAL_MIN + 1
  return Array.from(
    { length: CHANNEL_COUNT },
    () => ORIGINAL_MIN + Math.floor(Math.random() * span)
  )
}

export function EncodingDemo() {
  const [base, setBase] = useState<Base>(Base.binary)
  const [values, setValues] = useState<number[]>(() => [13, 6, 17, 9, 18, 4])
  // The typed code is the source of truth. It can be shorter than six while
  // typing; any channel the code doesn't reach stores a 0.
  const [code, setCode] = useState('100110')

  const digits = Array.from({ length: CHANNEL_COUNT }, (_, i) => Number(code[i] ?? 0))

  const changeBase = (next: Base) => {
    setBase(next)
    // A digit must stay below its base, so fold any that overshoot the new one.
    setCode((prev) =>
      [...prev]
        .map((char) => Number(char) % next)
        .join('')
    )
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
          />
        </div>

        <div className={styles.field}>
          <label className={styles.controlLabel} htmlFor="demo-message">
            Message ({CHANNEL_COUNT} {digitLabel}s
            {base === Base.binary ? '' : `, 0 to ${base - 1}`})
          </label>
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
            aria-describedby="demo-message-hint"
          />
        </div>

        <button
          type="button"
          className={styles.randomizeButton}
          onClick={() => setValues(randomValues())}
        >
          New pixels
        </button>
      </div>

      <p id="demo-message-hint" className={styles.hint}>
        Type the {digitLabel}s to hide, or nudge a channel with its arrows. Each bar moves to the
        nearest color whose remainder matches its {digitLabel}.
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
                const encoded = nearestWithRemainder(original, base, digit)

                return (
                  <div key={channel.key} className={`${styles.channel} ${styles[channel.key]}`}>
                    <div className={styles.track}>
                      <span
                        className={styles.original}
                        style={{ bottom: `${(original / DEMO_MAX) * 100}%` }}
                      >
                        <span className={styles.originalTag}>was {original}</span>
                      </span>
                      <div
                        className={styles.fill}
                        style={{ height: `${(encoded / DEMO_MAX) * 100}%` }}
                      >
                        <span className={styles.fillValue}>{encoded}</span>
                      </div>
                    </div>

                    <span className={styles.channelName}>{channel.name}</span>
                    <span className={styles.math}>
                      {encoded} mod {base} = <strong>{encoded % base}</strong>
                    </span>

                    <div className={styles.stepper}>
                      <button
                        type="button"
                        onClick={() => nudgeDigit(i, -1)}
                        aria-label={`Lower the ${digitLabel} in pixel ${pixelIndex + 1} ${channel.name}`}
                      >
                        −
                      </button>
                      <span className={styles.digit}>{digit}</span>
                      <button
                        type="button"
                        onClick={() => nudgeDigit(i, +1)}
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
