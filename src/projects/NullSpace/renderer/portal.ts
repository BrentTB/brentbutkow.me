import { PORTAL } from '../data'
import type { GameState } from '../engine/types'
import { worldToScreen } from './camera'
import type { Camera } from './camera'
import { fillRadialGlow } from './draw'

// The warp portal — only drawn during the end-of-sector warp cutscene (the
// renderer gates it on the warping phase). Full-bright glow with a core ring; the
// ship flies into it and the screen flash peaks as it arrives.
export function renderPortal(
  ctx: CanvasRenderingContext2D,
  state: GameState,
  camera: Camera
): void {
  const p = worldToScreen(state.portalPos, camera)
  const r = PORTAL.radius

  ctx.save()
  fillRadialGlow(ctx, p.x, p.y, r, [
    [0, PORTAL.activeColor],
    [0.4, 'rgba(150, 110, 240, 0.7)'],
    [1, 'rgba(120, 90, 200, 0)'],
  ])

  ctx.strokeStyle = PORTAL.activeColor
  ctx.lineWidth = 3
  ctx.beginPath()
  ctx.arc(p.x, p.y, r * 0.55, 0, Math.PI * 2)
  ctx.stroke()
  ctx.restore()
}
