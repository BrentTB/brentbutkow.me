import { Grid } from '../pixel-world.types'

/**
 * Chunk side, in cells, as a power of two so the maths is a shift. Sixteen is small enough that one
 * grain of falling sand wakes a few hundred cells rather than a whole row of four hundred, and large
 * enough that the flags stay cheap: a 400x225 world is 25x15 chunks.
 */
const CHUNK_SHIFT = 4
export const CHUNK_SIZE = 1 << CHUNK_SHIFT

export function chunksAcross(width: number): number {
  return Math.ceil(width / CHUNK_SIZE)
}

export function chunksDown(height: number): number {
  return Math.ceil(height / CHUNK_SIZE)
}

/**
 * Wakes the chunk holding a cell, and its eight neighbours, for this tick and the next. Marking the ring
 * as well is what makes sleeping safe: a cell only ever reacts to something within one cell of it, so a
 * change can never reach a chunk that was left asleep.
 *
 * Both buffers, because passes later in the same tick read the live flags — a cell transformed by the
 * chemistry pass has to be visible to the movement pass that follows it — while the next buffer is what
 * decides who is still awake a tick from now.
 */
export function wakeChunk(grid: Grid, index: number): void {
  wake(grid, index, grid.awakeChunks, grid.awakeChunksNext)
}

/**
 * Wakes the air's chunk for a cell **only if that cell sits in a different chunk than the last call did.**
 *
 * The passes that use this walk a row left to right, so sixteen consecutive cells share a chunk and waking on
 * each of them writes the same nine flags sixteen times over. A lava pool leaves most of the world's air
 * moving, so that was thousands of redundant calls a tick. Same lesson as `markHotRowBand`: a band woken once
 * is a band woken.
 *
 * Only safe because of that left-to-right walk. Pass the running memo back in and keep the return value.
 */
export function wakeAirChunkOnce(grid: Grid, index: number, lastChunk: number): number {
  const cellX = index % grid.width
  const chunk =
    (((index - cellX) / grid.width) >> CHUNK_SHIFT) * grid.chunkColumns + (cellX >> CHUNK_SHIFT)
  if (chunk === lastChunk) return chunk

  wakeAirChunk(grid, index)
  return chunk
}

/**
 * The same, for the air's own flags. Air keeps a separate set on purpose: a draught evolves over most of the
 * world at once, and waking the material passes everywhere it reaches cost more than the flow itself. Air
 * only wakes material where it is strong enough to carry something, which it does by handing out momentum.
 */
export function wakeAirChunk(grid: Grid, index: number): void {
  wake(grid, index, grid.airChunks, grid.airChunksNext)
}

function wake(grid: Grid, index: number, now: Uint8Array, next: Uint8Array): void {
  const cellX = index % grid.width
  const chunkX = cellX >> CHUNK_SHIFT
  const chunkY = ((index - cellX) / grid.width) >> CHUNK_SHIFT
  const { chunkColumns, chunkRows } = grid

  const left = chunkX > 0 ? chunkX - 1 : 0
  const right = chunkX < chunkColumns - 1 ? chunkX + 1 : chunkColumns - 1
  const top = chunkY > 0 ? chunkY - 1 : 0
  const bottom = chunkY < chunkRows - 1 ? chunkY + 1 : chunkRows - 1

  for (let row = top; row <= bottom; row++) {
    const offset = row * chunkColumns
    for (let column = left; column <= right; column++) {
      now[offset + column] = 1
      next[offset + column] = 1
    }
  }
}

/** Whether the pass should visit this cell at all. */
export function isCellAwake(grid: Grid, x: number, y: number): boolean {
  return grid.awakeChunks[(y >> CHUNK_SHIFT) * grid.chunkColumns + (x >> CHUNK_SHIFT)] === 1
}

/** Whether any chunk in this band holds moving air. */
export function isAirRowBandAwake(grid: Grid, y: number): boolean {
  const offset = (y >> CHUNK_SHIFT) * grid.chunkColumns
  for (let column = 0; column < grid.chunkColumns; column++) {
    if (grid.airChunks[offset + column] === 1) return true
  }
  return false
}

/**
 * Whether any chunk in the band of rows this row belongs to is awake. An empty world answers no for
 * every row, which is the difference between a pass that walks 90,000 cells doing nothing and one that
 * walks 225 flags.
 */
export function isRowBandAwake(grid: Grid, y: number): boolean {
  const offset = (y >> CHUNK_SHIFT) * grid.chunkColumns
  for (let column = 0; column < grid.chunkColumns; column++) {
    if (grid.awakeChunks[offset + column] === 1) return true
  }
  return false
}

/** Everything awake: a freshly loaded or cleared world has no history to sleep on. */
export function wakeAllChunks(grid: Grid): void {
  grid.awakeChunks.fill(1)
  grid.awakeChunksNext.fill(1)
  grid.airChunks.fill(1)
  grid.airChunksNext.fill(1)
}

/**
 * Hands the tick over: what was woken during it becomes what is awake for the next one, and the buffer
 * being retired is cleared to collect the next tick's wakes.
 */
export function advanceChunks(grid: Grid): void {
  const retiring = grid.awakeChunks
  grid.awakeChunks = grid.awakeChunksNext
  grid.awakeChunksNext = retiring
  retiring.fill(0)

  const retiringAir = grid.airChunks
  grid.airChunks = grid.airChunksNext
  grid.airChunksNext = retiringAir
  retiringAir.fill(0)
}
