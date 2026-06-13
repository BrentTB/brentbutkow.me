import type { Camera } from './camera'

// Screen-space warp flash + radial streaks. `progress` runs 0→1 across the jump;
// intensity peaks mid-warp. Drawn after the world transform is restored, so it
// covers the whole canvas in CSS pixels.
export function renderWarpTransition(
  ctx: CanvasRenderingContext2D,
  camera: Camera,
  progress: number
): void {
  const intensity = Math.sin(Math.max(0, Math.min(1, progress)) * Math.PI)
  if (intensity <= 0) return

  const { width, height } = camera
  const cx = width / 2
  const cy = height / 2

  ctx.save()
  ctx.globalAlpha = intensity * 0.6
  ctx.fillStyle = '#dfe6ff'
  ctx.fillRect(0, 0, width, height)

  ctx.globalAlpha = intensity
  ctx.strokeStyle = 'rgba(190, 210, 255, 0.8)'
  ctx.lineWidth = 2
  const streaks = 28
  const inner = 40
  const outer = Math.hypot(width, height)
  for (let i = 0; i < streaks; i++) {
    const a = (Math.PI * 2 * i) / streaks
    const len = inner + intensity * outer
    ctx.beginPath()
    ctx.moveTo(cx + Math.cos(a) * inner, cy + Math.sin(a) * inner)
    ctx.lineTo(cx + Math.cos(a) * len, cy + Math.sin(a) * len)
    ctx.stroke()
  }
  ctx.restore()
}
