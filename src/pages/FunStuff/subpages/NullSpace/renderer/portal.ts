import { PORTAL, WAVES_PER_LEVEL } from '../data'
import { GamePhase } from '../engine/types'
import type { GameState } from '../engine/types'
import { worldToScreen } from './camera'
import type { Camera } from './camera'

// The portal at the far end of the corridor. Dim while the sector is in progress,
// brightening as its waves clear, full-bright during the warp jump.
export function renderPortal(
  ctx: CanvasRenderingContext2D,
  state: GameState,
  camera: Camera
): void {
  const p = worldToScreen(state.portalPos, camera)
  const waveInSector = state.wave > 0 ? (state.wave - 1) % WAVES_PER_LEVEL : 0
  const killed =
    state.totalWaveEnemies > 0
      ? Math.max(
          0,
          Math.min(1, (state.spawnedInWave - state.enemies.length) / state.totalWaveEnemies)
        )
      : 0
  let t = Math.min(1, (waveInSector + killed) / WAVES_PER_LEVEL)
  if (state.phase === GamePhase.warping) t = 1
  const r = PORTAL.radius

  ctx.save()
  const grad = ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, r)
  grad.addColorStop(0, PORTAL.activeColor)
  grad.addColorStop(0.4, `rgba(150, 110, 240, ${0.2 + 0.5 * t})`)
  grad.addColorStop(1, 'rgba(120, 90, 200, 0)')
  ctx.globalAlpha = 0.4 + 0.6 * t
  ctx.fillStyle = grad
  ctx.beginPath()
  ctx.arc(p.x, p.y, r, 0, Math.PI * 2)
  ctx.fill()

  ctx.globalAlpha = 0.5 + 0.5 * t
  ctx.strokeStyle = PORTAL.activeColor
  ctx.lineWidth = 3
  ctx.beginPath()
  ctx.arc(p.x, p.y, r * 0.55, 0, Math.PI * 2)
  ctx.stroke()
  ctx.restore()
}
