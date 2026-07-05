import { describe, it, expect } from 'vitest'
import {
  GulagBlock,
  isSorted,
  moveBlockBetweenGulags,
  parseInput,
  performGulagSort,
  removeEmptyFinalGulag,
  removeRemovedFromGulags,
  reserveMergeSlots,
} from './gulag-sort'

const makeBlocks = (values: number[]): GulagBlock[] =>
  values.map((value, i) => ({ value, id: `${i}` }))

// Replay the recorded frames the same way the visualiser does, then read the
// surviving (real, non-removed) values out of the single remaining gulag.
const sortViaFrames = (numbers: number[]): number[] => {
  const gulags: GulagBlock[][] = [makeBlocks(numbers)]
  const frames = performGulagSort(structuredClone(gulags))

  for (const frame of frames) {
    if (frame.isMerging) {
      removeRemovedFromGulags(gulags)
      removeEmptyFinalGulag(gulags)
    }
    if (frame.toGulagIndex === gulags.length) {
      gulags.push([])
    }
    if (frame.startsMerge) {
      reserveMergeSlots(gulags)
    }
    moveBlockBetweenGulags(gulags, frame)
  }
  removeEmptyFinalGulag(gulags)

  return gulags[0].filter((b) => !b.removed && !b.placeholder).map((b) => b.value)
}

describe('parseInput', () => {
  it('parses comma-separated integers and drops non-numeric entries', () => {
    expect(parseInput('50, 3, x, 9, ')).toEqual([50, 3, 9])
  })

  it('returns an empty array when nothing parses', () => {
    expect(parseInput('nope, , abc')).toEqual([])
  })
})

describe('isSorted', () => {
  it('is true for ascending values (duplicates allowed)', () => {
    expect(isSorted(makeBlocks([1, 3, 3, 9]))).toBe(true)
  })

  it('is false when any value drops', () => {
    expect(isSorted(makeBlocks([1, 9, 3]))).toBe(false)
  })
})

describe('performGulagSort', () => {
  it('records no frames for already-sorted input', () => {
    expect(performGulagSort([makeBlocks([1, 2, 3])])).toEqual([])
  })

  it('produces frames whose replay sorts the numbers', () => {
    expect(sortViaFrames([50, 3, 18, 1, 9, 6, 3])).toEqual([1, 3, 3, 6, 9, 18, 50])
  })

  it('handles a reverse-sorted list', () => {
    expect(sortViaFrames([5, 4, 3, 2, 1])).toEqual([1, 2, 3, 4, 5])
  })

  it('reserves slots across the whole stack the moment merging begins', () => {
    const gulags: GulagBlock[][] = [makeBlocks([5, 4, 3, 2, 1])]
    const frames = performGulagSort(structuredClone(gulags))
    const live = structuredClone(gulags)

    let stackAtMergeStart: number[] | null = null
    for (const frame of frames) {
      if (frame.isMerging) {
        removeRemovedFromGulags(live)
        removeEmptyFinalGulag(live)
      }
      if (frame.toGulagIndex === live.length) {
        live.push([])
      }
      if (frame.startsMerge) {
        reserveMergeSlots(live)
        // Every gulag except the bottom source shows at least one reserved slot.
        stackAtMergeStart = live.map((g) => g.filter((b) => b.placeholder).length)
      }
      moveBlockBetweenGulags(live, frame)
    }

    expect(stackAtMergeStart).not.toBeNull()
    const counts = stackAtMergeStart!
    expect(counts.slice(0, -1).every((n) => n > 0)).toBe(true)
    expect(counts[counts.length - 1]).toBe(0)
  })
})

describe('reserveMergeSlots', () => {
  it('gives each gulag a slot for every block below it, at its sorted position', () => {
    // Post-split stack: each gulag already sorted, main list on top.
    const gulags: GulagBlock[][] = [makeBlocks([3]), makeBlocks([2]), makeBlocks([1])]
    reserveMergeSlots(gulags)

    // Main list previews the full sorted result: its own 3 plus slots for 2 and 1.
    expect(gulags[0].map((b) => b.value)).toEqual([1, 2, 3])
    expect(gulags[0].filter((b) => b.placeholder).map((b) => b.value)).toEqual([1, 2])
    // Middle gulag reserves a slot for the block below it.
    expect(gulags[1].map((b) => b.value)).toEqual([1, 2])
    expect(gulags[1].filter((b) => b.placeholder).map((b) => b.value)).toEqual([1])
    // Bottom gulag is the source — no reservations.
    expect(gulags[2].every((b) => !b.placeholder)).toBe(true)
  })

  it('keeps a higher gulag block ahead of a lower one on a value tie', () => {
    const top = makeBlocks([3])
    top[0].id = 'top-3'
    const bottom = makeBlocks([3])
    bottom[0].id = 'bottom-3'
    const gulags: GulagBlock[][] = [top, bottom]

    reserveMergeSlots(gulags)

    expect(gulags[0][0].id).toBe('top-3')
    expect(gulags[0][1].placeholderFor).toBe('bottom-3')
  })
})
