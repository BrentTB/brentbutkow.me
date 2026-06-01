import { EnemyKind, ProjectileOwner } from '../engine/types'
import type { BlackHole, GameState, MeteorStrike, Particle } from '../engine/types'
import type { Camera } from './camera'
import { worldToScreen } from './camera'
import type { SpriteCache } from './sprite-cache'
import { getSpriteSize } from './sprite-cache'
import { SpriteKey } from './sprites'
import type { Star } from './starfield'
import { renderStarfield } from './starfield'

const ENEMY_SPRITE: Record<EnemyKind, SpriteKey> = {
  [EnemyKind.drone]: SpriteKey.drone,
  [EnemyKind.tank]: SpriteKey.tank,
  [EnemyKind.shooter]: SpriteKey.shooter,
}

export function renderFrame(
  ctx: CanvasRenderingContext2D,
  state: GameState,
  camera: Camera,
  sprites: SpriteCache,
  stars: Star[]
): void {
  ctx.imageSmoothingEnabled = false
  ctx.clearRect(0, 0, camera.width, camera.height)

  // Background
  ctx.fillStyle = '#06080e'
  ctx.fillRect(0, 0, camera.width, camera.height)

  renderStarfield(ctx, stars, camera)
  renderBlackHoles(ctx, state.blackHoles, camera)
  renderMeteorWarnings(ctx, state.meteorStrikes, camera)
  renderParticles(ctx, state.particles, camera)
  renderEnemies(ctx, state, camera, sprites)
  renderProjectiles(ctx, state, camera, sprites)
  renderShip(ctx, state, camera, sprites)
  renderMeteorProjectiles(ctx, state.meteorStrikes, camera, sprites)
  renderShipHealthBar(ctx, state, camera)
}

function renderShip(
  ctx: CanvasRenderingContext2D,
  state: GameState,
  camera: Camera,
  sprites: SpriteCache
): void {
  const screen = worldToScreen(state.ship.pos, camera)
  const size = getSpriteSize(SpriteKey.ship)

  ctx.save()
  ctx.translate(screen.x, screen.y)

  const angle = Math.atan2(state.ship.vel.y, state.ship.vel.x) + Math.PI / 2
  ctx.rotate(angle)

  ctx.drawImage(sprites.ship, -size.w / 2, -size.h / 2)
  ctx.restore()
}

function renderEnemies(
  ctx: CanvasRenderingContext2D,
  state: GameState,
  camera: Camera,
  sprites: SpriteCache
): void {
  for (const enemy of state.enemies) {
    const screen = worldToScreen(enemy.pos, camera)

    if (
      screen.x < -60 ||
      screen.x > camera.width + 60 ||
      screen.y < -60 ||
      screen.y > camera.height + 60
    )
      continue

    const spriteKey = ENEMY_SPRITE[enemy.kind]
    const size = getSpriteSize(spriteKey)

    ctx.save()
    ctx.translate(screen.x, screen.y)
    const angle = Math.atan2(enemy.vel.y, enemy.vel.x) + Math.PI / 2
    ctx.rotate(angle)
    ctx.drawImage(sprites[spriteKey], -size.w / 2, -size.h / 2)
    ctx.restore()

    // Health bar for damaged enemies
    if (enemy.hp < enemy.maxHp) {
      const barWidth = 30
      const barHeight = 3
      const hpRatio = enemy.hp / enemy.maxHp
      ctx.fillStyle = '#331111'
      ctx.fillRect(screen.x - barWidth / 2, screen.y - size.h / 2 - 8, barWidth, barHeight)
      ctx.fillStyle = '#cc3333'
      ctx.fillRect(
        screen.x - barWidth / 2,
        screen.y - size.h / 2 - 8,
        barWidth * hpRatio,
        barHeight
      )
    }
  }
}

function renderProjectiles(
  ctx: CanvasRenderingContext2D,
  state: GameState,
  camera: Camera,
  sprites: SpriteCache
): void {
  for (const proj of state.projectiles) {
    const screen = worldToScreen(proj.pos, camera)
    if (
      screen.x < -20 ||
      screen.x > camera.width + 20 ||
      screen.y < -20 ||
      screen.y > camera.height + 20
    )
      continue

    const spriteKey =
      proj.owner === ProjectileOwner.enemy ? SpriteKey.enemyProjectile : SpriteKey.projectile
    const size = getSpriteSize(spriteKey)
    ctx.drawImage(sprites[spriteKey], screen.x - size.w / 2, screen.y - size.h / 2)
  }
}

function renderMeteorWarnings(
  ctx: CanvasRenderingContext2D,
  strikes: MeteorStrike[],
  camera: Camera
): void {
  for (const strike of strikes) {
    if (strike.elapsed >= strike.delay) continue
    const screen = worldToScreen(strike.targetPos, camera)
    const progress = strike.elapsed / strike.delay

    ctx.save()
    ctx.globalAlpha = 0.3 + progress * 0.4

    // Warning circle
    ctx.strokeStyle = '#ff6633'
    ctx.lineWidth = 2
    ctx.beginPath()
    ctx.arc(screen.x, screen.y, strike.aoeRadius * (1 - progress * 0.3), 0, Math.PI * 2)
    ctx.stroke()

    // Crosshair
    const crossSize = 12
    ctx.beginPath()
    ctx.moveTo(screen.x - crossSize, screen.y)
    ctx.lineTo(screen.x + crossSize, screen.y)
    ctx.moveTo(screen.x, screen.y - crossSize)
    ctx.lineTo(screen.x, screen.y + crossSize)
    ctx.stroke()

    ctx.restore()
  }
}

function renderMeteorProjectiles(
  ctx: CanvasRenderingContext2D,
  strikes: MeteorStrike[],
  camera: Camera,
  sprites: SpriteCache
): void {
  for (const strike of strikes) {
    if (strike.elapsed >= strike.delay) continue
    const screen = worldToScreen(strike.targetPos, camera)
    const progress = strike.elapsed / strike.delay

    const spriteKey = strike.kind === 'meteorite' ? SpriteKey.meteorite : SpriteKey.meteor
    const size = getSpriteSize(spriteKey)
    const meteorY = screen.y - 400 * (1 - progress)

    ctx.save()
    ctx.globalAlpha = 0.5 + progress * 0.5
    ctx.drawImage(sprites[spriteKey], screen.x - size.w / 2, meteorY - size.h / 2)
    ctx.restore()
  }
}

function renderParticles(
  ctx: CanvasRenderingContext2D,
  particles: Particle[],
  camera: Camera
): void {
  for (const p of particles) {
    const screen = worldToScreen(p.pos, camera)
    if (
      screen.x < -10 ||
      screen.x > camera.width + 10 ||
      screen.y < -10 ||
      screen.y > camera.height + 10
    )
      continue

    const alpha = 1 - p.elapsed / p.lifetime
    ctx.globalAlpha = alpha
    ctx.fillStyle = p.color
    ctx.fillRect(
      Math.floor(screen.x - p.size / 2),
      Math.floor(screen.y - p.size / 2),
      Math.ceil(p.size),
      Math.ceil(p.size)
    )
  }
  ctx.globalAlpha = 1
}

function renderShipHealthBar(
  ctx: CanvasRenderingContext2D,
  state: GameState,
  camera: Camera
): void {
  const screen = worldToScreen(state.ship.pos, camera)
  const shipSize = getSpriteSize(SpriteKey.ship)
  const barWidth = 40
  const barHeight = 4
  const hpRatio = Math.max(0, state.ship.hp / state.ship.maxHp)

  const x = screen.x - barWidth / 2
  const y = screen.y + shipSize.h / 2 + 6

  ctx.fillStyle = '#221111'
  ctx.fillRect(x, y, barWidth, barHeight)

  const hpColor = hpRatio > 0.5 ? '#44bb44' : hpRatio > 0.25 ? '#ccaa22' : '#cc3333'
  ctx.fillStyle = hpColor
  ctx.fillRect(x, y, barWidth * hpRatio, barHeight)
}

// Black hole core gradients are static (colors + radius), so cache one per radius
// per context rather than rebuilding every frame. Painted under a translate so the
// origin-centered gradient follows the hole's screen position.
const blackHoleGradients = new WeakMap<CanvasRenderingContext2D, Map<number, CanvasGradient>>()

function getBlackHoleGradient(ctx: CanvasRenderingContext2D, radius: number): CanvasGradient {
  let byRadius = blackHoleGradients.get(ctx)
  if (!byRadius) {
    byRadius = new Map()
    blackHoleGradients.set(ctx, byRadius)
  }
  let gradient = byRadius.get(radius)
  if (!gradient) {
    gradient = ctx.createRadialGradient(0, 0, 0, 0, 0, radius)
    gradient.addColorStop(0, 'rgba(20, 0, 40, 0.9)')
    gradient.addColorStop(0.3, 'rgba(40, 10, 80, 0.6)')
    gradient.addColorStop(0.7, 'rgba(80, 30, 160, 0.2)')
    gradient.addColorStop(1, 'rgba(100, 50, 200, 0)')
    byRadius.set(radius, gradient)
  }
  return gradient
}

function renderBlackHoles(ctx: CanvasRenderingContext2D, holes: BlackHole[], camera: Camera): void {
  for (const hole of holes) {
    const screen = worldToScreen(hole.pos, camera)
    const fadeIn = Math.min(3, hole.duration * 0.3)
    const fadeOut = Math.min(8, hole.duration * 0.6)
    const fadeOutStart = hole.duration - fadeOut
    let alpha: number
    if (hole.elapsed < fadeIn) {
      alpha = hole.elapsed / fadeIn
    } else if (hole.elapsed > fadeOutStart) {
      alpha = Math.max(0, (hole.duration - hole.elapsed) / fadeOut)
    } else {
      alpha = 1
    }

    ctx.save()
    ctx.globalAlpha = alpha
    ctx.translate(screen.x, screen.y)

    // Dark core
    ctx.fillStyle = getBlackHoleGradient(ctx, hole.radius)
    ctx.beginPath()
    ctx.arc(0, 0, hole.radius, 0, Math.PI * 2)
    ctx.fill()

    // Swirl rings
    ctx.strokeStyle = 'rgba(130, 80, 200, 0.4)'
    ctx.lineWidth = 1.5
    for (let ring = 0; ring < 3; ring++) {
      const ringRadius = hole.radius * (0.3 + ring * 0.25)
      const rotAngle = hole.elapsed * (2 + ring) + ring * 2
      ctx.beginPath()
      ctx.arc(0, 0, ringRadius, rotAngle, rotAngle + Math.PI * 1.2)
      ctx.stroke()
    }

    ctx.restore()
  }
}
