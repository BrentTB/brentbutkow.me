import { useState, useCallback } from 'react'
import styles from './GulagSortVisualizer.module.scss'

interface GaulagBlock {
  value: number
  id: string
  gulagIndex?: number
  positionInGulag?: number
}

interface AnimationFrame {
  blocks: GaulagBlock[]
  gulags: GaulagBlock[][]
  blockPositions: Map<string, { gulagIdx: number; posInGulag: number }>
}

function GulagSortVisualizer() {
  const [input, setInput] = useState('')
  const [blocks, setBlocks] = useState<GaulagBlock[]>([])
  const [gulags, setGulags] = useState<GaulagBlock[][]>([])
  const [isAnimating, setIsAnimating] = useState(false)
  const [blockPositions, setBlockPositions] = useState<
    Map<string, { gulagIdx: number; posInGulag: number }>
  >(new Map())

  const generateRandomNumbers = useCallback(() => {
    const count = Math.floor(Math.random() * 8) + 3
    const nums = Array.from({ length: count }, () => Math.floor(Math.random() * 100))
    setInput(nums.join(', '))
  }, [])

  const handleInputChange = (value: string) => {
    setInput(value)
  }

  const parseInput = (): number[] => {
    return input
      .split(',')
      .map((s) => parseInt(s.trim(), 10))
      .filter((n) => !isNaN(n))
  }

  const handleStart = async () => {
    const nums = parseInput()
    if (nums.length === 0) return

    const newBlocks: GaulagBlock[] = nums.map((value, i) => ({
      value,
      id: `${Date.now()}-${i}`,
      gulagIndex: 0,
      positionInGulag: i,
    }))

    setBlocks(newBlocks)
    setGulags([[...newBlocks]])
    setIsAnimating(true)

    // Give UI time to render the initial blocks, then start animation
    await new Promise((resolve) => setTimeout(resolve, 100))

    const frames = performGulagSort(newBlocks.map((b) => ({ ...b })))

    for (let i = 0; i < frames.length; i++) {
      await new Promise((resolve) => setTimeout(resolve, 1200))
      setBlocks(frames[i].blocks)
      setGulags(frames[i].gulags)
      // TODO: do this setting one block at a time, from left to right
      setBlockPositions(frames[i].blockPositions)
    }

    setIsAnimating(false)
  }

  const handleRandomize = () => {
    generateRandomNumbers()
  }

  const isSorted = (arr: GaulagBlock[]): boolean => {
    for (let i = 1; i < arr.length; i++) {
      if (arr[i].value < arr[i - 1].value) {
        return false
      }
    }
    return true
  }

  const performGulagSort = (initialBlocks: GaulagBlock[]): AnimationFrame[] => {
    const frames: AnimationFrame[] = []
    let gulagList: GaulagBlock[][] = [
      initialBlocks.map((b) => ({ ...b, gulagIndex: 0, positionInGulag: 0 })),
    ]

    // Initial setup
    gulagList[0].forEach((b, i) => {
      b.positionInGulag = i
    })
    const initialPos = new Map(
      gulagList[0].map((b) => [b.id, { gulagIdx: 0, posInGulag: b.positionInGulag! }])
    )
    frames.push({
      blocks: initialBlocks,
      gulags: gulagList.map((g) => [...g]),
      blockPositions: initialPos,
    })

    let gulagNum = 0

    // Separate into gulags
    while (!isSorted(gulagList[gulagList.length - 1])) {
      const currentGulag = gulagList[gulagList.length - 1]
      gulagNum++

      const sorted: GaulagBlock[] = []
      const unsorted: GaulagBlock[] = []

      // Find sorted and unsorted pairs
      let currentValue = currentGulag[0].value
      for (let i = 1; i < currentGulag.length; i++) {
        if (currentGulag[i].value <= currentValue) {
          unsorted.push(currentGulag[i])
        } else {
          sorted.push(currentGulag[i])
          currentValue = currentGulag[i].value
        }
      }
      sorted.push(currentGulag[currentGulag.length - 1])

      const newGulagBlocks = unsorted.map((b, idx) => ({
        ...b,
        gulagIndex: gulagNum,
        positionInGulag: idx,
      }))

      sorted.forEach((b, idx) => {
        b.gulagIndex = gulagNum - 1
        b.positionInGulag = idx
      })

      gulagList.push(newGulagBlocks)

      const posMap = new Map<string, { gulagIdx: number; posInGulag: number }>()
      gulagList.forEach((g, gIdx) => {
        g.forEach((b, pIdx) => {
          posMap.set(b.id, { gulagIdx: gIdx, posInGulag: pIdx })
        })
      })

      frames.push({
        blocks: initialBlocks,
        gulags: gulagList.map((g) => [...g]),
        blockPositions: posMap,
      })
    }

    // Merge gulags from bottom up
    while (gulagList.length > 1) {
      const lastGulag = gulagList.pop()!
      const secondLast = gulagList[gulagList.length - 1]

      const merged = mergeGulagsSorted(secondLast, lastGulag, gulagNum - 1)
      gulagList[gulagList.length - 1] = merged

      const posMap = new Map<string, { gulagIdx: number; posInGulag: number }>()
      gulagList.forEach((g, gIdx) => {
        g.forEach((b, pIdx) => {
          posMap.set(b.id, { gulagIdx: gIdx, posInGulag: pIdx })
        })
      })

      frames.push({
        blocks: initialBlocks,
        gulags: gulagList.map((g) => [...g]),
        blockPositions: posMap,
      })

      gulagNum--
    }

    return frames
  }

  const mergeGulagsSorted = (
    gulag1: GaulagBlock[],
    gulag2: GaulagBlock[],
    targetGulag: number
  ): GaulagBlock[] => {
    const result: GaulagBlock[] = []
    let i = 0,
      j = 0

    while (i < gulag1.length && j < gulag2.length) {
      if (gulag1[i].value <= gulag2[j].value) {
        result.push({ ...gulag1[i], gulagIndex: targetGulag, positionInGulag: result.length })
        i++
      } else {
        result.push({ ...gulag2[j], gulagIndex: targetGulag, positionInGulag: result.length })
        j++
      }
    }

    while (i < gulag1.length) {
      result.push({ ...gulag1[i], gulagIndex: targetGulag, positionInGulag: result.length })
      i++
    }

    while (j < gulag2.length) {
      result.push({ ...gulag2[j], gulagIndex: targetGulag, positionInGulag: result.length })
      j++
    }

    return result
  }

  const handleReset = () => {
    setBlocks([])
    setGulags([])
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
            onChange={(e) => handleInputChange(e.target.value)}
            placeholder="e.g.: 50, 3, 18, 1, 9, 6, 3"
            disabled={isAnimating}
          />
        </div>

        <div className={styles.buttonGroup}>
          <button onClick={handleStart} disabled={isAnimating}>
            Start
          </button>
          <button onClick={handleRandomize} disabled={isAnimating}>
            Random
          </button>
          <button onClick={handleReset} disabled={isAnimating}>
            Reset
          </button>
        </div>
      </div>

      <div className={styles.visualization}>
        {blocks.length === 0 ? (
          <div className={styles.placeholder}>Enter numbers and click "Start" to begin</div>
        ) : (
          <div className={styles.display}>
            <div className={styles.animationContainer}>
              {gulags.map((gulag, gulagIdx) => (
                <div key={gulagIdx} className={styles.gulagRow}>
                  <div className={styles.gulagLabel}>
                    {gulagIdx === 0 ? 'Original' : `Gulag ${gulagIdx}`}
                  </div>
                  <div className={styles.blocksContainer}>
                    {gulag.map((block) => {
                      const pos = blockPositions.get(block.id)
                      const isInThisGulag = pos?.gulagIdx === gulagIdx
                      return (
                        <div
                          key={block.id}
                          className={styles.animatedBlock}
                          style={{
                            opacity: isInThisGulag ? 1 : 0,
                            transform: isInThisGulag
                              ? 'translateY(0) scale(1)'
                              : 'translateY(-100px) scale(0.8)',
                            visibility: isInThisGulag ? 'visible' : 'hidden',
                          }}
                        >
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
