import { useState } from 'react'
import styles from './GulagSortVisualizer.module.scss'
import { GulagBlock, generateRandomNumbers, parseInput } from './gulag-sort'
import { useGulagSort } from './useGulagSort'

// Used as the input placeholder and as the fallback values when Start is pressed
// with no valid input. Change here to update both.
const PLACEHOLDER_NUMBERS = '50, 3, 18, 1, 9, 6, 3'

const ANIMATION_SPEED = {
  SLOW: 1.5,
  MEDIUM: 1,
  FAST: 0.5,
} as const

const getBlockAnimationClass = (block: GulagBlock): string => {
  const animationClass = block.movingUp
    ? block.removed
      ? styles.exitUp
      : styles.enterUp
    : block.removed
      ? styles.exitDown
      : styles.enterDown
  return animationClass
}

export function GulagSortVisualizer() {
  const [input, setInput] = useState('')
  const [animationSpeedMultiplier, setAnimationSpeedMultiplier] = useState<number>(
    ANIMATION_SPEED.MEDIUM
  )
  const { gulags, isAnimating, start, reset } = useGulagSort()

  const setSpeedSlow = () => {
    setAnimationSpeedMultiplier(ANIMATION_SPEED.SLOW)
  }

  const setSpeedMedium = () => {
    setAnimationSpeedMultiplier(ANIMATION_SPEED.MEDIUM)
  }

  const setSpeedFast = () => {
    setAnimationSpeedMultiplier(ANIMATION_SPEED.FAST)
  }

  const generateRandomNumbersForInput = () => {
    setInput(generateRandomNumbers(6, 13, 200).join(', '))
  }

  const handleStart = () => {
    const parsed = parseInput(input)
    // Fall back to the placeholder values when nothing valid was entered.
    const nums = parsed.length > 0 ? parsed : parseInput(PLACEHOLDER_NUMBERS)
    start(nums, animationSpeedMultiplier)
  }

  return (
    <div className={styles.visualizer}>
      <div className={styles.controls}>
        <div className={styles.inputGroup}>
          <label htmlFor="numbers-input">Enter numbers (comma-separated):</label>
          <input
            id="numbers-input"
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder={`e.g.: ${PLACEHOLDER_NUMBERS}`}
            disabled={isAnimating}
          />
        </div>

        <div className={styles.buttonRow}>
          <div className={styles.buttonGroup}>
            <button
              onClick={handleStart}
              disabled={isAnimating}
              className={styles.startButton}
              aria-label="Start sorting the entered numbers"
            >
              Start
            </button>
            <button
              onClick={generateRandomNumbersForInput}
              disabled={isAnimating}
              aria-label="Generate random numbers for the input"
            >
              Random
            </button>
            <button
              onClick={reset}
              disabled={gulags.length === 0}
              aria-label="Reset the visualization and clear the numbers"
            >
              Reset
            </button>
          </div>
          <div className={`${styles.buttonGroup} ${styles.buttonGroupRight}`}>
            <button
              onClick={setSpeedSlow}
              disabled={isAnimating}
              className={animationSpeedMultiplier === ANIMATION_SPEED.SLOW ? styles.active : ''}
            >
              Slow
            </button>
            <button
              onClick={setSpeedMedium}
              disabled={isAnimating}
              className={animationSpeedMultiplier === ANIMATION_SPEED.MEDIUM ? styles.active : ''}
            >
              Medium
            </button>
            <button
              onClick={setSpeedFast}
              disabled={isAnimating}
              className={animationSpeedMultiplier === ANIMATION_SPEED.FAST ? styles.active : ''}
            >
              Fast
            </button>
          </div>
        </div>
      </div>

      <div className={styles.visualization}>
        {gulags.length === 0 ? (
          <div className={styles.placeholder}>Enter numbers and click "Start" to begin</div>
        ) : (
          <div className={styles.display}>
            <div className={styles.animationContainer}>
              {gulags.map((gulag, gulagIdx) => (
                <div key={gulagIdx} className={styles.gulagRow}>
                  <div className={styles.gulagLabel}>
                    {gulagIdx === 0 ? 'Main List' : `Gulag ${gulagIdx}`}
                  </div>
                  <div className={styles.blocksContainer}>
                    {gulag.map((block) => {
                      if (block.placeholder) {
                        return (
                          <div
                            key={block.id}
                            className={`${styles.animatedBlock} ${styles.placeholderSlot}`}
                            aria-hidden="true"
                          />
                        )
                      }
                      const animationClass = getBlockAnimationClass(block)
                      return (
                        <div key={block.id} className={`${styles.animatedBlock} ${animationClass}`}>
                          {block.value}
                        </div>
                      )
                    })}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
