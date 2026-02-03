import { useState, useCallback, useRef } from 'react'
import styles from './GaulagSortVisualizer.module.scss'

interface GaulagBlock {
  value: number
  id: string
  removed?: boolean
  exitDirection?: 'down' | 'up'
}

interface AnimationFrame {
  moveBlockId: string
  fromGaulagIndex: number
  toGaulagIndex: number
  isMerging?: boolean
}

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

const getBlockAnimationClass = (block: GaulagBlock): string => {
  const goingUp = block.exitDirection === 'up'
  const exiting = block.removed
  const animationClass = goingUp
    ? exiting
      ? styles.exitUp
      : styles.enterUp
    : exiting
      ? styles.exitDown
      : styles.enterDown
  return animationClass
}

const removeRemovedFromGaulags = (gaulags: GaulagBlock[][]) => {
  for (let j = gaulags.length - 2; j >= 0; j--) {
    for (let k = gaulags[j].length - 1; k >= 0; k--) {
      if (gaulags[j][k].removed) {
        gaulags[j].splice(k, 1)
      }
    }
  }
}

const removeEmptyFinalGaulag = (gaulags: GaulagBlock[][]) => {
  const finalIndex = gaulags.length - 1
  const allRemoved = gaulags[finalIndex]?.every((b) => b.removed)
  if (allRemoved) {
    gaulags.splice(finalIndex, 1)
  }
}

const moveBlockBetweenGaulags = (gaulags: GaulagBlock[][], frame: AnimationFrame): void => {
  const fromGaulag = gaulags[frame.fromGaulagIndex]
  const toGaulag = gaulags[frame.toGaulagIndex]
  const movedBlockIndex = fromGaulag.findIndex((b) => b.id === frame.moveBlockId)
  const newBlock = structuredClone(fromGaulag[movedBlockIndex])

  fromGaulag[movedBlockIndex].id = newBlock.id + '-removed'
  fromGaulag[movedBlockIndex].removed = true
  fromGaulag[movedBlockIndex].exitDirection = frame.isMerging ? 'up' : 'down'

  newBlock.exitDirection = !frame.isMerging ? 'up' : 'down'
  toGaulag.push(newBlock)

  if (frame.isMerging) toGaulag.sort((a, b) => a.value - b.value)

  gaulags[frame.fromGaulagIndex] = fromGaulag
  gaulags[frame.toGaulagIndex] = toGaulag
}

const isSorted = (arr: GaulagBlock[]): boolean => {
  for (let i = 1; i < arr.length; i++) {
    if (arr[i].value < arr[i - 1].value) {
      return false
    }
  }
  return true
}

function GaulagSortVisualizer() {
  const [input, setInput] = useState('')
  const [gaulags, setGaulags] = useState<GaulagBlock[][]>([])
  const [isAnimating, setIsAnimating] = useState(false)
  const gaulagsRef = useRef<GaulagBlock[][]>([])

  const generateRandomNumbersForInput = useCallback(() => {
    const nums = generateRandomNumbers(6, 13, 200)
    setInput(nums.join(', '))
  }, [])

  const handleStart = async () => {
    const nums = parseInput(input)
    if (nums.length === 0) return

    const newBlocks: GaulagBlock[] = nums.map((value, i) => ({
      value,
      id: `${Date.now()}-${i}`,
    }))

    const initialGaulags = [[...newBlocks]]
    setGaulags(initialGaulags)
    gaulagsRef.current = initialGaulags
    setIsAnimating(true)

    const frames = performGaulagSort(structuredClone(initialGaulags))

    for (let i = 0; i < frames.length; i++) {
      await new Promise((resolve) => setTimeout(resolve, 900))
      const updatedGaulags = structuredClone(gaulagsRef.current)

      if (frames[i].isMerging) {
        removeRemovedFromGaulags(updatedGaulags)
        removeEmptyFinalGaulag(updatedGaulags)
      }

      if (frames[i].toGaulagIndex === updatedGaulags.length) {
        updatedGaulags.push([])
      }
      moveBlockBetweenGaulags(updatedGaulags, frames[i])

      setGaulags(updatedGaulags)
      gaulagsRef.current = updatedGaulags
    }

    removeEmptyFinalGaulag(gaulagsRef.current)
    setIsAnimating(false)
  }

  const splitIntoGaulags = (gaulagList: GaulagBlock[][]) => {
    const frames: AnimationFrame[] = []
    let gaulagNum = 0

    while (!isSorted(gaulagList[gaulagList.length - 1])) {
      const currentGaulag = gaulagList[gaulagList.length - 1]
      gaulagNum++

      const sorted: GaulagBlock[] = []
      const unsorted: GaulagBlock[] = []

      // Find sorted and unsorted pairs
      let currentValue = currentGaulag[0].value
      sorted.push(currentGaulag[0])

      for (let i = 1; i < currentGaulag.length; i++) {
        if (currentGaulag[i].value < currentValue) {
          unsorted.push({ ...currentGaulag[i] })
        } else {
          sorted.push(currentGaulag[i])
          currentValue = currentGaulag[i].value
        }
      }

      for (let i = 0; i < unsorted.length; i++) {
        frames.push({
          moveBlockId: unsorted[i].id,
          fromGaulagIndex: gaulagNum - 1,
          toGaulagIndex: gaulagNum,
        })
      }

      gaulagList[gaulagList.length - 1] = sorted
      gaulagList.push(unsorted)
    }
    return { frames: frames, gaulagList: gaulagList }
  }

  const mergeGaulags = (gaulagList: GaulagBlock[][]) => {
    const frames: AnimationFrame[] = []
    while (gaulagList.length > 1) {
      const lastGaulag = gaulagList.pop()!
      const secondLast = gaulagList.pop()!

      const merged = mergeGaulagsSorted(secondLast, lastGaulag)
      gaulagList.push(merged)

      for (let i = 0; i < lastGaulag.length; i++) {
        frames.push({
          moveBlockId: lastGaulag[i].id,
          fromGaulagIndex: gaulagList.length,
          toGaulagIndex: gaulagList.length - 1,
          isMerging: true,
        })
      }
    }

    return frames
  }

  const performGaulagSort = (gaulagList: GaulagBlock[][]): AnimationFrame[] => {
    // Separate into gaulags
    const { frames, gaulagList: updatedGaulagList } = splitIntoGaulags(gaulagList)

    // Merge gaulags from bottom up
    const mergeFrames = mergeGaulags(updatedGaulagList)
    frames.push(...mergeFrames)

    return frames
  }

  const mergeGaulagsSorted = (gaulag1: GaulagBlock[], gaulag2: GaulagBlock[]): GaulagBlock[] => {
    const result: GaulagBlock[] = []
    let i = 0,
      j = 0

    while (i < gaulag1.length || j < gaulag2.length) {
      if (i >= gaulag1.length) {
        result.push({ ...gaulag2[j] })
        j++
      } else if (j >= gaulag2.length) {
        result.push({ ...gaulag1[i] })
        i++
      } else if (gaulag1[i].value <= gaulag2[j].value) {
        result.push({ ...gaulag1[i] })
        i++
      } else {
        result.push({ ...gaulag2[j] })
        j++
      }
    }

    return result
  }

  const handleReset = () => {
    setGaulags([])
    gaulagsRef.current = []
    setInput('')
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

        <div className={styles.buttonGroup}>
          <button onClick={handleStart} disabled={isAnimating}>
            Start
          </button>
          <button onClick={generateRandomNumbersForInput} disabled={isAnimating}>
            Random
          </button>
          <button onClick={handleReset}>Reset</button>
        </div>
      </div>

      <div className={styles.visualization}>
        {gaulags.length === 0 ? (
          <div className={styles.placeholder}>Enter numbers and click "Start" to begin</div>
        ) : (
          <div className={styles.display}>
            <div className={styles.animationContainer}>
              {gaulags.map((gaulag, gaulagIdx) => (
                <div key={gaulagIdx} className={styles.gaulagRow}>
                  <div className={styles.gaulagLabel}>
                    {gaulagIdx === 0 ? 'Main List' : `Gaulag ${gaulagIdx}`}
                  </div>
                  <div className={styles.blocksContainer}>
                    {gaulag.map((block) => {
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

export default GaulagSortVisualizer
