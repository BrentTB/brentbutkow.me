import { useState, useCallback, useRef } from 'react'
import styles from './GaulagSortVisualizer.module.scss'

interface GaulagBlock {
  value: number
  id: string
  gaulagIndex: number
  removed?: boolean
  exitDirection?: 'down' | 'up'
}

interface AnimationFrame {
  moveBlockId: string
  fromGaulagIndex: number
  toGaulagIndex: number
  isMerging?: boolean
}

// split a csv string into an array of numbers
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
      gaulagIndex: 0,
    }))

    const initialGaulags = [[...newBlocks]]
    setGaulags(initialGaulags)
    gaulagsRef.current = initialGaulags
    setIsAnimating(true)

    const frames = performGaulagSort(newBlocks.map((b) => ({ ...b })))

    for (let i = 0; i < frames.length; i++) {
      await new Promise((resolve) => setTimeout(resolve, 900))
      const updatedGaulags = structuredClone(gaulagsRef.current)

      if (frames[i].isMerging) {
        // remove old removed blocks from all but the final gaulag
        for (let j = updatedGaulags.length - 2; j >= 0; j--) {
          for (let k = updatedGaulags[j].length - 1; k >= 0; k--) {
            if (updatedGaulags[j][k].removed) {
              updatedGaulags[j].splice(k, 1)
            }
          }
        }
        // remove a gaulag if all blocks inside are removed
        const finalIndex = updatedGaulags.length - 1
        const allRemoved = updatedGaulags[finalIndex].every((b) => b.removed)
        if (allRemoved) {
          updatedGaulags.splice(finalIndex, 1)
        }
      }

      if (frames[i].toGaulagIndex === updatedGaulags.length) {
        updatedGaulags.push([])
      }

      // add a copy of the moving block with updated gaulag index
      const fromGaulag = updatedGaulags[frames[i].fromGaulagIndex]
      const toGaulag = updatedGaulags[frames[i].toGaulagIndex]
      const movedBlockindex = fromGaulag.findIndex((b) => b.id === frames[i].moveBlockId)
      console.log('Moving block:', movedBlockindex)
      const newBlock = structuredClone(fromGaulag[movedBlockindex])
      fromGaulag[movedBlockindex].id = newBlock.id + '-removed'
      fromGaulag[movedBlockindex].removed = true
      fromGaulag[movedBlockindex].exitDirection = frames[i].isMerging ? 'up' : 'down'

      newBlock.gaulagIndex = frames[i].toGaulagIndex
      newBlock.exitDirection = !frames[i].isMerging ? 'up' : 'down'
      toGaulag.push(newBlock)
      if (frames[i].isMerging) toGaulag.sort((a, b) => a.value - b.value)

      updatedGaulags[frames[i].fromGaulagIndex] = fromGaulag
      updatedGaulags[frames[i].toGaulagIndex] = toGaulag
      setGaulags(updatedGaulags)
      gaulagsRef.current = updatedGaulags
    }
    // remove old blocks
    const finalBlocks = structuredClone(gaulagsRef.current.flat())
    for (let j = finalBlocks.length - 1; j >= 0; j--) {
      if (finalBlocks[j].removed) {
        finalBlocks.splice(j, 1)
      }
    }
    const numGaulags = finalBlocks.reduce((max, b) => Math.max(max, b.gaulagIndex || 0), 0) + 1
    const newGaulags: GaulagBlock[][] = []
    for (let g = 0; g < numGaulags; g++) {
      newGaulags[g] = finalBlocks.filter((b) => b.gaulagIndex === g)
    }
    setGaulags(newGaulags)
    gaulagsRef.current = newGaulags

    setIsAnimating(false)
  }

  const isSorted = (arr: GaulagBlock[]): boolean => {
    for (let i = 1; i < arr.length; i++) {
      if (arr[i].value < arr[i - 1].value) {
        return false
      }
    }
    return true
  }

  const performGaulagSort = (initialBlocks: GaulagBlock[]): AnimationFrame[] => {
    const frames: AnimationFrame[] = []
    const gaulagList: GaulagBlock[][] = [initialBlocks.map((b) => ({ ...b, gaulagIndex: 0 }))]

    let gaulagNum = 0

    // Separate into gaulags
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
          unsorted.push(structuredClone(currentGaulag[i]))
          unsorted[unsorted.length - 1].gaulagIndex = gaulagNum
        } else {
          sorted.push(currentGaulag[i])
          currentValue = currentGaulag[i].value
        }
      }

      for (let i = 0; i < unsorted.length; i++) {
        frames.push({
          moveBlockId: unsorted[i].id,
          fromGaulagIndex: gaulagNum - 1,
          toGaulagIndex: unsorted[i].gaulagIndex,
        })
      }

      const newGaulagBlocks = unsorted.map((b) => ({
        ...b,
        gaulagIndex: gaulagNum,
      }))

      gaulagList[gaulagList.length - 1] = sorted
      gaulagList.push(newGaulagBlocks)
    }

    // Merge gaulags from bottom up
    while (gaulagList.length > 1) {
      const lastGaulag = gaulagList.pop()!
      const secondLast = gaulagList.pop()!

      const merged = mergeGaulagsSorted(secondLast, lastGaulag, gaulagNum - 1)
      gaulagList.push(merged)

      for (let i = 0; i < lastGaulag.length; i++) {
        frames.push({
          moveBlockId: lastGaulag[i].id,
          fromGaulagIndex: gaulagNum,
          toGaulagIndex: gaulagNum - 1,
          isMerging: true,
        })
      }

      gaulagNum--
    }

    return frames
  }

  const mergeGaulagsSorted = (
    gaulag1: GaulagBlock[],
    gaulag2: GaulagBlock[],
    targetGaulag: number
  ): GaulagBlock[] => {
    const result: GaulagBlock[] = []
    let i = 0,
      j = 0

    while (i < gaulag1.length && j < gaulag2.length) {
      if (gaulag1[i].value <= gaulag2[j].value) {
        result.push({ ...gaulag1[i], gaulagIndex: targetGaulag })
        i++
      } else {
        result.push({ ...gaulag2[j], gaulagIndex: targetGaulag })
        j++
      }
    }

    while (i < gaulag1.length) {
      result.push({ ...gaulag1[i], gaulagIndex: targetGaulag })
      i++
    }

    while (j < gaulag2.length) {
      result.push({ ...gaulag2[j], gaulagIndex: targetGaulag })
      j++
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
                    {gaulagIdx === 0 ? 'Original' : `Gaulag ${gaulagIdx}`}
                  </div>
                  <div className={styles.blocksContainer}>
                    {gaulag.map((block) => {
                      const goingUp = block.exitDirection === 'up'
                      const exiting = block.removed
                      const animationClass = goingUp
                        ? exiting
                          ? styles.exitUp
                          : styles.enterUp
                        : exiting
                          ? styles.exitDown
                          : styles.enterDown
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
