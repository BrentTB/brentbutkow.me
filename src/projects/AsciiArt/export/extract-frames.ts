import { AsciiOptions } from '../data'
import { gridToText } from '../engine/ascii-frame'
import { buildGridFromSource } from '../engine/sample-grid'

// Just the media state extraction needs — lets tests pass a fake instead of a
// real <video>.
export type FrameSource = {
  duration: number
  videoWidth: number
  videoHeight: number
}

export type ExtractOptions = {
  fps: number
  maxFrames: number
  // Cap on grid rows for a sane PDF size; cols follow from the source aspect.
  maxRows: number
  // Seconds of the clip to sample from the start; defaults to the full length.
  duration?: number
  // Moves the media to `time` and resolves once the frame is ready to sample.
  // Injected so extraction stays independent of the DOM seek/`seeked` dance.
  seek: (time: number) => Promise<void>
  onProgress?: (fraction: number) => void
}

// `fps` is the effective sampled rate (frames / duration) so playback matches
// real time even when maxFrames widened the step on a long clip.
export type ExtractedFrames = { frames: string[]; cols: number; rows: number; fps: number }

// Steps through a video's timeline at a fixed frame rate, sampling each position
// into ASCII text. Frame count is capped by `maxFrames` (the step widens to fit),
// so a long clip stays a reasonable file.
export async function extractAsciiFrames(
  video: FrameSource & CanvasImageSource,
  sample: HTMLCanvasElement,
  sctx: CanvasRenderingContext2D,
  options: AsciiOptions,
  { fps, maxFrames, maxRows, duration: limit, seek, onProgress }: ExtractOptions
): Promise<ExtractedFrames> {
  if (!Number.isFinite(video.duration) || video.duration <= 0) {
    return { frames: [], cols: 0, rows: 0, fps: 0 }
  }
  // Sample from the start up to the requested length, never past the clip.
  const duration = Math.min(limit ?? video.duration, video.duration)
  if (duration <= 0) return { frames: [], cols: 0, rows: 0, fps: 0 }

  const opts = { ...options, rows: Math.min(options.rows, maxRows) }
  // Frame count from the target rate, capped; then space evenly across the clip.
  // Integer indexing avoids float drift adding a stray frame at the tail.
  const count = Math.min(maxFrames, Math.max(1, Math.round(duration * fps)))
  const step = duration / count
  const frames: string[] = []
  let cols = 0
  let rows = 0

  for (let i = 0; i < count; i++) {
    await seek(i * step)
    const grid = buildGridFromSource(
      sample,
      sctx,
      video,
      video.videoWidth,
      video.videoHeight,
      opts,
      false
    )
    if (grid) {
      frames.push(gridToText(grid))
      cols = grid.cols
      rows = grid.rows
    }
    onProgress?.(Math.min(0.99, (i + 1) / count))
  }

  return { frames, cols, rows, fps: count / duration }
}
