import { useState, useCallback, useRef } from 'react'
import styles from './GulagSortVisualizer.module.scss'

interface GulagBlock {
  value: number
  id: string
  removed?: boolean
  movingUp?: boolean
}

interface AnimationFrame {
  moveBlockId: string
  fromGulagIndex: number
  toGulagIndex: number
  isMerging?: boolean
}

const ANIMATION_FRAME_DURATION_S = 0.7

const parseInput = (input: string): number[] => {
  return input
    .split(',')
    .map((s) => parseInt(s.trim(), 10))
    .filter((n) => !isNaN(n))
}

const generateRandomNumbers = (minCount: number, maxCount: number, maxValue: number): number[] => {
  const count = Math.floor(Math.random() * (maxCount - minCount + 1)) + minCount
  return Array.from({ length: count }, () => Math.floor(Math.random() * maxValue))
}

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

const removeRemovedFromGulags = (gulags: GulagBlock[][]) => {
  for (let j = gulags.length - 2; j >= 0; j--) {
    for (let k = gulags[j].length - 1; k >= 0; k--) {
      if (gulags[j][k].removed) {
        gulags[j].splice(k, 1)
      }
    }
  }
}

const removeEmptyFinalGulag = (gulags: GulagBlock[][]) => {
  const finalIndex = gulags.length - 1
  const allRemoved = gulags[finalIndex]?.every((b) => b.removed)
  if (allRemoved) {
    gulags.splice(finalIndex, 1)
  }
}

const moveBlockBetweenGulags = (gulags: GulagBlock[][], frame: AnimationFrame): void => {
  const fromGulag = gulags[frame.fromGulagIndex]
  const toGulag = gulags[frame.toGulagIndex]

  if (!fromGulag || !toGulag) {
    throw new Error(
      `Invalid gulag indices in animation frame: from=${frame.fromGulagIndex}, to=${frame.toGulagIndex}`
    )
  }

  const movedBlockIndex = fromGulag.findIndex((b) => b.id === frame.moveBlockId)
  if (movedBlockIndex === -1) {
    throw new Error(
      `Block with id "${frame.moveBlockId}" not found in gulag index ${frame.fromGulagIndex}`
    )
  }
  const newBlock = structuredClone(fromGulag[movedBlockIndex])

  fromGulag[movedBlockIndex].id = newBlock.id + '-removed'
  fromGulag[movedBlockIndex].removed = true
  fromGulag[movedBlockIndex].movingUp = frame.isMerging

  newBlock.movingUp = !frame.isMerging
  toGulag.push(newBlock)

  if (frame.isMerging) toGulag.sort((a, b) => a.value - b.value)

  gulags[frame.fromGulagIndex] = fromGulag
  gulags[frame.toGulagIndex] = toGulag
}

const isSorted = (arr: GulagBlock[]): boolean => {
  for (let i = 1; i < arr.length; i++) {
    if (arr[i].value < arr[i - 1].value) {
      return false
    }
  }
  return true
}

const ANIMATION_SPEED = {
  SLOW: 1.5,
  MEDIUM: 1,
  FAST: 0.5,
} as const

function GulagSortVisualizer() {
  const [input, setInput] = useState('')
  const [gulags, setGulags] = useState<GulagBlock[][]>([])
  const [animationSpeedMultiplier, setAnimationSpeedMultiplier] = useState<number>(
    ANIMATION_SPEED.MEDIUM
  )
  const [isAnimating, setIsAnimating] = useState(false)
  const gulagsRef = useRef<GulagBlock[][]>([])

  const setSpeedSlow = () => {
    setAnimationSpeedMultiplier(ANIMATION_SPEED.SLOW)
  }

  const setSpeedMedium = () => {
    setAnimationSpeedMultiplier(ANIMATION_SPEED.MEDIUM)
  }

  const setSpeedFast = () => {
    setAnimationSpeedMultiplier(ANIMATION_SPEED.FAST)
  }

  const generateRandomNumbersForInput = useCallback(() => {
    const nums = generateRandomNumbers(6, 13, 200)
    setInput(nums.join(', '))
  }, [])

  const handleStart = async () => {
    if (isAnimating) return
    const nums = parseInput(input)
    if (nums.length === 0) return

    const newBlocks: GulagBlock[] = nums.map((value, i) => ({
      value,
      id: `${Date.now()}-${i}`,
    }))

    const initialGulags = [[...newBlocks]]
    setGulags(initialGulags)
    gulagsRef.current = initialGulags
    setIsAnimating(true)

    const frames = performGulagSort(structuredClone(initialGulags))

    for (let i = 0; i < frames.length; i++) {
      await new Promise((resolve) =>
        setTimeout(resolve, ANIMATION_FRAME_DURATION_S * animationSpeedMultiplier * 1000)
      )
      const updatedGulags = structuredClone(gulagsRef.current)

      if (frames[i].isMerging) {
        removeRemovedFromGulags(updatedGulags)
        removeEmptyFinalGulag(updatedGulags)
      }

      if (frames[i].toGulagIndex === updatedGulags.length) {
        updatedGulags.push([])
      }
      moveBlockBetweenGulags(updatedGulags, frames[i])

      setGulags(updatedGulags)
      gulagsRef.current = updatedGulags
    }

    removeEmptyFinalGulag(gulagsRef.current)
    setIsAnimating(false)
  }

  const splitIntoGulags = (gulagList: GulagBlock[][]) => {
    const frames: AnimationFrame[] = []
    let gulagNum = 0

    while (!isSorted(gulagList[gulagList.length - 1])) {
      const currentGulag = gulagList[gulagList.length - 1]
      gulagNum++

      const sorted: GulagBlock[] = []
      const unsorted: GulagBlock[] = []

      // Find sorted and unsorted pairs
      if (currentGulag.length === 0) {
        break
      }
      let currentValue = currentGulag[0].value
      sorted.push(currentGulag[0])

      for (let i = 1; i < currentGulag.length; i++) {
        if (currentGulag[i].value < currentValue) {
          unsorted.push({ ...currentGulag[i] })
        } else {
          sorted.push(currentGulag[i])
          currentValue = currentGulag[i].value
        }
      }

      for (let i = 0; i < unsorted.length; i++) {
        frames.push({
          moveBlockId: unsorted[i].id,
          fromGulagIndex: gulagNum - 1,
          toGulagIndex: gulagNum,
        })
      }

      gulagList[gulagList.length - 1] = sorted
      gulagList.push(unsorted)
    }
    return { frames: frames, gulagList: gulagList }
  }

  const mergeGulags = (gulagList: GulagBlock[][]) => {
    const frames: AnimationFrame[] = []
    while (gulagList.length > 1) {
      const lastGulag = gulagList.pop()!
      const secondLast = gulagList.pop()!

      const merged = mergeGulagsSorted(secondLast, lastGulag)
      gulagList.push(merged)

      for (let i = 0; i < lastGulag.length; i++) {
        frames.push({
          moveBlockId: lastGulag[i].id,
          fromGulagIndex: gulagList.length,
          toGulagIndex: gulagList.length - 1,
          isMerging: true,
        })
      }
    }

    return frames
  }

  const performGulagSort = (gulagList: GulagBlock[][]): AnimationFrame[] => {
    // Separate into gulags
    const { frames, gulagList: updatedGulagList } = splitIntoGulags(gulagList)

    // Merge gulags from bottom up
    const mergeFrames = mergeGulags(updatedGulagList)
    frames.push(...mergeFrames)

    return frames
  }

  const mergeGulagsSorted = (gulag1: GulagBlock[], gulag2: GulagBlock[]): GulagBlock[] => {
    const result: GulagBlock[] = []
    let i = 0,
      j = 0

    while (i < gulag1.length || j < gulag2.length) {
      if (i >= gulag1.length) {
        result.push({ ...gulag2[j] })
        j++
      } else if (j >= gulag2.length) {
        result.push({ ...gulag1[i] })
        i++
      } else if (gulag1[i].value <= gulag2[j].value) {
        result.push({ ...gulag1[i] })
        i++
      } else {
        result.push({ ...gulag2[j] })
        j++
      }
    }

    return result
  }

  const handleReset = () => {
    setGulags([])
    gulagsRef.current = []
    setIsAnimating(false)
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
            placeholder="e.g.: 50, 3, 18, 1, 9, 6, 3"
            disabled={isAnimating}
          />
        </div>

        <div className={styles.buttonRow}>
          <div className={styles.buttonGroup}>
            <button
              onClick={handleStart}
              disabled={isAnimating}
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
              onClick={handleReset}
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

export default GulagSortVisualizer
