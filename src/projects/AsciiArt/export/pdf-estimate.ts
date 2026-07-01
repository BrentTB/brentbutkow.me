import { MAX_COLS, MIN_COLS } from '../data'
import { gridCols } from '../engine/ascii-frame'

// Frame-count ceiling for an export (keeps the file and encode time bounded) and
// the frame-rate choices offered in the dialog. Shared so the dialog can grey out
// rates that would blow the ceiling at the chosen length.
export const PDF_MAX_FRAMES = 600
export const PDF_FPS_OPTIONS: readonly number[] = [6, 12, 18, 24]

// Rough encode-time model, only to set expectations in the dialog. Cost is per
// sampled frame plus a term for seeking across the source: two clips that both
// hit the frame cap still differ by length (a longer clip seeks farther). Tuned
// to over- rather than under-estimate — a pessimistic guess beats a surprise wait.
const PER_FRAME_MS = 120
const PER_SOURCE_SECOND_MS = 150
// Fixed bytes for the decoder, PDF structure, and glyph alphabet.
const OVERHEAD_BYTES = 1600

export type EstimateInput = {
  srcWidth: number
  srcHeight: number
  rows: number // already capped for the PDF
  fps: number
  duration: number // seconds of the clip to encode
  maxFrames: number
}

export type Estimate = {
  cols: number
  rows: number
  frames: number
  bytes: number
  encodeMs: number
  // True when fps x duration hit the frame ceiling, so the real rate is lower.
  capped: boolean
}

const clamp = (value: number, min: number, max: number) => Math.min(max, Math.max(min, value))

// Predicts the frame count, file size, and encode time for a PDF export without
// running it, so the dialog can show live figures as the user picks fps/length.
// Size mirrors the index-encoded layout: ~1 byte per cell plus fixed overhead.
export function estimateAsciiPdf({
  srcWidth,
  srcHeight,
  rows,
  fps,
  duration,
  maxFrames,
}: EstimateInput): Estimate {
  const cols = clamp(gridCols(rows, srcWidth, srcHeight), MIN_COLS, MAX_COLS)
  const ideal = Math.max(1, Math.round(fps * duration))
  const frames = Math.min(maxFrames, ideal)
  const bytes = frames * (cols * rows + 3) + OVERHEAD_BYTES
  const encodeMs = frames * PER_FRAME_MS + duration * PER_SOURCE_SECOND_MS
  return { cols, rows, frames, bytes, encodeMs, capped: ideal > maxFrames }
}
