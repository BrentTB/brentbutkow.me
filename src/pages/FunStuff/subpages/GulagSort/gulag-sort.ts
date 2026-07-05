// Pure "Gulag Sort" core — the algorithm and its block bookkeeping, with no React
// or DOM dependencies. `performGulagSort` records the moves as a list of animation
// frames; the hook/component replays those frames to drive the visualisation.

export interface GulagBlock {
  value: number
  id: string
  removed?: boolean
  movingUp?: boolean
  // A reserved empty slot in a merge destination, waiting for its block to arrive.
  placeholder?: boolean
  // The id of the incoming block this reserved slot belongs to.
  placeholderFor?: string
}

export interface AnimationFrame {
  moveBlockId: string
  fromGulagIndex: number
  toGulagIndex: number
  isMerging?: boolean
  // First frame of a merge pair — the destination reserves its slots before blocks arrive.
  startsMerge?: boolean
}

export const parseInput = (input: string): number[] => {
  return input
    .split(',')
    .map((s) => parseInt(s.trim(), 10))
    .filter((n) => !isNaN(n))
}

export const generateRandomNumbers = (
  minCount: number,
  maxCount: number,
  maxValue: number
): number[] => {
  const count = Math.floor(Math.random() * (maxCount - minCount + 1)) + minCount
  return Array.from({ length: count }, () => Math.floor(Math.random() * maxValue))
}

export const isSorted = (arr: GulagBlock[]): boolean => {
  for (let i = 1; i < arr.length; i++) {
    if (arr[i].value < arr[i - 1].value) {
      return false
    }
  }
  return true
}

export const removeRemovedFromGulags = (gulags: GulagBlock[][]) => {
  for (let j = gulags.length - 2; j >= 0; j--) {
    for (let k = gulags[j].length - 1; k >= 0; k--) {
      if (gulags[j][k].removed) {
        gulags[j].splice(k, 1)
      }
    }
  }
}

export const removeEmptyFinalGulag = (gulags: GulagBlock[][]) => {
  const finalIndex = gulags.length - 1
  const allRemoved = gulags[finalIndex]?.every((b) => b.removed)
  if (allRemoved) {
    gulags.splice(finalIndex, 1)
  }
}

// The moment merging starts, expand every gulag (and the main list) to its final
// merged width: each row keeps its own blocks and gains an empty reserved slot for
// every block currently below it, placed at its sorted position. Blocks then rise
// into waiting slots instead of shoving the row on arrival, and the whole stack
// shows where everything is headed. A value tie keeps the higher gulag's block
// ahead of a lower one, matching `mergeGulagsSorted`'s bottom-up cascade.
export const reserveMergeSlots = (gulags: GulagBlock[][]): void => {
  const original = gulags.map((gulag) => gulag.slice())

  for (let t = original.length - 2; t >= 0; t--) {
    const reserved: GulagBlock[] = [...original[t]]
    for (let below = t + 1; below < original.length; below++) {
      for (const block of original[below]) {
        reserved.push({
          value: block.value,
          id: `${block.id}-slot`,
          placeholder: true,
          placeholderFor: block.id,
        })
      }
    }
    // Stable sort keeps own blocks (listed first) ahead of reservations on ties,
    // and reservations in top-to-bottom gulag order.
    reserved.sort((a, b) => a.value - b.value)
    gulags[t] = reserved
  }
}

export const moveBlockBetweenGulags = (gulags: GulagBlock[][], frame: AnimationFrame): void => {
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

  if (frame.isMerging) {
    // Drop the block into the slot reserved for it — no re-sort, no shifted neighbours.
    const slotIndex = toGulag.findIndex((b) => b.placeholderFor === frame.moveBlockId)
    if (slotIndex === -1) {
      throw new Error(
        `No reserved slot for block "${frame.moveBlockId}" in gulag index ${frame.toGulagIndex}`
      )
    }
    newBlock.movingUp = false
    delete newBlock.placeholder
    delete newBlock.placeholderFor
    toGulag[slotIndex] = newBlock
  } else {
    newBlock.movingUp = true
    toGulag.push(newBlock)
  }

  gulags[frame.fromGulagIndex] = fromGulag
  gulags[frame.toGulagIndex] = toGulag
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
  let firstFrame = true
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
        startsMerge: firstFrame,
      })
      firstFrame = false
    }
  }

  return frames
}

export const performGulagSort = (gulagList: GulagBlock[][]): AnimationFrame[] => {
  // Separate into gulags
  const { frames, gulagList: updatedGulagList } = splitIntoGulags(gulagList)

  // Merge gulags from bottom up
  const mergeFrames = mergeGulags(updatedGulagList)
  frames.push(...mergeFrames)

  return frames
}
