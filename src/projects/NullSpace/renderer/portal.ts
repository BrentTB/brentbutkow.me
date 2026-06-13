import { PORTAL } from '../data'
import { GamePhase } from '../engine/types'
import type { GameState } from '../engine/types'
import { sectorProgress } from '../engine/world/waves'
import { worldToScreen } from './camera'
import type { Camera } from './camera'
import { fillRadialGlow } from './draw'

// The portal at the far end of the corridor. Dim while the sector is in progress,
// brightening as its waves clear, full-bright during the warp jump.
export function renderPortal(
  ctx: CanvasRenderingContext2D,
  state: GameState,
  camera: Camera
): void {
  const p = worldToScreen(state.portalPos, camera)
  let t = sectorProgress({
    wave: state.wave,
    spawnedInWave: state.spawnedInWave,
    enemiesAlive: state.enemies.length,
    totalWaveEnemies: state.totalWaveEnemies,
  })
  if (state.phase === GamePhase.warping) t = 1
  const r = PORTAL.radius

  ctx.save()
  ctx.globalAlpha = 0.4 + 0.6 * t
  fillRadialGlow(ctx, p.x, p.y, r, [
    [0, PORTAL.activeColor],
    [0.4, `rgba(150, 110, 240, ${0.2 + 0.5 * t})`],
    [1, 'rgba(120, 90, 200, 0)'],
  ])

  ctx.globalAlpha = 0.5 + 0.5 * t
  ctx.strokeStyle = PORTAL.activeColor
  ctx.lineWidth = 3
  ctx.beginPath()
  ctx.arc(p.x, p.y, r * 0.55, 0, Math.PI * 2)
  ctx.stroke()
  ctx.restore()
}
