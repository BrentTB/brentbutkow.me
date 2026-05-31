import { describe, it, expect } from 'vitest'
import {
  GulagBlock,
  isSorted,
  moveBlockBetweenGulags,
  parseInput,
  performGulagSort,
  removeEmptyFinalGulag,
  removeRemovedFromGulags,
} from './gulag-sort'

const makeBlocks = (values: number[]): GulagBlock[] =>
  values.map((value, i) => ({ value, id: `${i}` }))

// Replay the recorded frames the same way the visualiser does, then read the
// surviving (non-removed) values out of the single remaining gulag.
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
    moveBlockBetweenGulags(gulags, frame)
  }
  removeEmptyFinalGulag(gulags)

  return gulags[0].filter((b) => !b.removed).map((b) => b.value)
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
})
