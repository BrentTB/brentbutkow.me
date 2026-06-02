import { CollectibleKind, EffectKind, EnemyKind, ProjectileOwner } from '../engine/types'
import type {
  ActiveEffect,
  BlackHoleEffect,
  Collectible,
  GameState,
  MeteorStrikeEffect,
  Particle,
  RocketEffect,
  ShieldEffect,
  SunEffect,
} from '../engine/types'
import { POWER_ORB, SPACE_METAL } from '../data'
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
  [EnemyKind.swarm]: SpriteKey.swarm,
  [EnemyKind.bomber]: SpriteKey.bomber,
}

export function renderFrame(
  ctx: CanvasRenderingContext2D,
  state: GameState,
  camera: Camera,
  sprites: SpriteCache,
  stars: Star[]
): void {
  ctx.imageSmoothingEnabled = false
  // Background fill happens in canvas pixels — must cover the actual canvas.
  ctx.setTransform(1, 0, 0, 1, 0, 0)
  ctx.clearRect(0, 0, camera.width, camera.height)
  ctx.fillStyle = '#06080e'
  ctx.fillRect(0, 0, camera.width, camera.height)

  // Apply the camera's zoom for the rest of the frame. Render functions use
  // worldToScreen which returns positions in WORLD units relative to camera —
  // the canvas multiplies them by `zoom`, so sprite sizes scale automatically.
  ctx.save()
  ctx.scale(camera.zoom, camera.zoom)

  renderStarfield(ctx, stars, camera)
  renderActiveEffectsBack(ctx, state.activeEffects, camera)
  renderCollectibles(ctx, state.collectibles, camera)
  renderParticles(ctx, state.particles, camera)
  renderEnemies(ctx, state, camera, sprites)
  renderProjectiles(ctx, state, camera, sprites)
  renderShip(ctx, state, camera, sprites)
  renderActiveEffectsFront(ctx, state.activeEffects, camera, sprites)
  renderShipHealthBar(ctx, state, camera)

  ctx.restore()
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

function renderMeteorWarning(
  ctx: CanvasRenderingContext2D,
  strike: MeteorStrikeEffect,
  camera: Camera
): void {
  if (strike.elapsed >= strike.delay) return
  const screen = worldToScreen(strike.pos, camera)
  const progress = strike.elapsed / strike.delay

  ctx.save()
  ctx.globalAlpha = 0.3 + progress * 0.4

  ctx.strokeStyle = '#ff6633'
  ctx.lineWidth = 2
  ctx.beginPath()
  ctx.arc(screen.x, screen.y, strike.aoeRadius * (1 - progress * 0.3), 0, Math.PI * 2)
  ctx.stroke()

  const crossSize = 12
  ctx.beginPath()
  ctx.moveTo(screen.x - crossSize, screen.y)
  ctx.lineTo(screen.x + crossSize, screen.y)
  ctx.moveTo(screen.x, screen.y - crossSize)
  ctx.lineTo(screen.x, screen.y + crossSize)
  ctx.stroke()

  ctx.restore()
}

function renderMeteorProjectile(
  ctx: CanvasRenderingContext2D,
  strike: MeteorStrikeEffect,
  camera: Camera,
  sprites: SpriteCache
): void {
  if (strike.elapsed >= strike.delay) return
  const screen = worldToScreen(strike.pos, camera)
  const progress = strike.elapsed / strike.delay

  const spriteKey =
    strike.kind === EffectKind.meteoriteStrike ? SpriteKey.meteorite : SpriteKey.meteor
  const size = getSpriteSize(spriteKey)
  const meteorY = screen.y - 400 * (1 - progress)

  ctx.save()
  ctx.globalAlpha = 0.5 + progress * 0.5
  ctx.drawImage(sprites[spriteKey], screen.x - size.w / 2, meteorY - size.h / 2)
  ctx.restore()
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

function renderCollectibles(
  ctx: CanvasRenderingContext2D,
  collectibles: Collectible[],
  camera: Camera
): void {
  for (const c of collectibles) {
    const screen = worldToScreen(c.pos, camera)
    if (
      screen.x < -20 ||
      screen.x > camera.width + 20 ||
      screen.y < -20 ||
      screen.y > camera.height + 20
    )
      continue

    if (c.kind === CollectibleKind.powerOrb) {
      const alpha = Math.min(1, 0.6 + Math.sin(c.elapsed * 8) * 0.2)
      ctx.save()
      ctx.globalAlpha = alpha
      const gradient = ctx.createRadialGradient(
        screen.x,
        screen.y,
        0,
        screen.x,
        screen.y,
        POWER_ORB.radius * 2
      )
      gradient.addColorStop(0, 'rgba(100, 180, 255, 0.9)')
      gradient.addColorStop(0.5, 'rgba(60, 120, 220, 0.4)')
      gradient.addColorStop(1, 'rgba(40, 80, 180, 0)')
      ctx.fillStyle = gradient
      ctx.beginPath()
      ctx.arc(screen.x, screen.y, POWER_ORB.radius * 2, 0, Math.PI * 2)
      ctx.fill()

      ctx.fillStyle = '#aaddff'
      ctx.beginPath()
      ctx.arc(screen.x, screen.y, POWER_ORB.radius * 0.6, 0, Math.PI * 2)
      ctx.fill()
      ctx.restore()
    } else {
      const fadeAlpha = c.elapsed > c.lifetime - 2 ? Math.max(0, (c.lifetime - c.elapsed) / 2) : 1
      const pulse = 0.7 + Math.sin(c.elapsed * 4) * 0.3
      ctx.save()
      ctx.globalAlpha = fadeAlpha * pulse

      ctx.fillStyle = '#e9b872'
      ctx.strokeStyle = '#f3c98c'
      ctx.lineWidth = 1.5
      ctx.beginPath()
      for (let i = 0; i < 6; i++) {
        const angle = (Math.PI * 2 * i) / 6 - Math.PI / 6
        const hx = screen.x + Math.cos(angle) * SPACE_METAL.radius
        const hy = screen.y + Math.sin(angle) * SPACE_METAL.radius
        if (i === 0) ctx.moveTo(hx, hy)
        else ctx.lineTo(hx, hy)
      }
      ctx.closePath()
      ctx.fill()
      ctx.stroke()

      ctx.restore()
    }
  }
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

function renderBlackHole(
  ctx: CanvasRenderingContext2D,
  hole: BlackHoleEffect,
  camera: Camera
): void {
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

  ctx.fillStyle = getBlackHoleGradient(ctx, hole.radius)
  ctx.beginPath()
  ctx.arc(0, 0, hole.radius, 0, Math.PI * 2)
  ctx.fill()

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

function renderActiveEffectsBack(
  ctx: CanvasRenderingContext2D,
  effects: ActiveEffect[],
  camera: Camera
): void {
  for (const effect of effects) {
    switch (effect.kind) {
      case EffectKind.blackHole:
        renderBlackHole(ctx, effect, camera)
        break
      case EffectKind.sun:
        renderSun(ctx, effect, camera)
        break
      case EffectKind.shield:
        renderShield(ctx, effect, camera)
        break
      case EffectKind.meteoriteStrike:
      case EffectKind.meteorStrike:
        renderMeteorWarning(ctx, effect, camera)
        break
    }
  }
}

function renderActiveEffectsFront(
  ctx: CanvasRenderingContext2D,
  effects: ActiveEffect[],
  camera: Camera,
  sprites: SpriteCache
): void {
  for (const effect of effects) {
    switch (effect.kind) {
      case EffectKind.meteoriteStrike:
      case EffectKind.meteorStrike:
        renderMeteorProjectile(ctx, effect, camera, sprites)
        break
      case EffectKind.rocket:
        renderRocket(ctx, effect, camera, sprites)
        break
    }
  }
}

function renderRocket(
  ctx: CanvasRenderingContext2D,
  rocket: RocketEffect,
  camera: Camera,
  sprites: SpriteCache
): void {
  const screen = worldToScreen(rocket.pos, camera)
  const size = getSpriteSize(SpriteKey.rocket)
  // Rocket sprite is drawn with the nose pointing UP at rotation 0; rotate so
  // the nose tracks the velocity direction.
  const angle = Math.atan2(rocket.vel.y, rocket.vel.x) + Math.PI / 2

  ctx.save()
  ctx.translate(screen.x, screen.y)
  ctx.rotate(angle)
  ctx.drawImage(sprites.rocket, -size.w / 2, -size.h / 2)
  ctx.restore()
}

function renderShield(ctx: CanvasRenderingContext2D, shield: ShieldEffect, camera: Camera): void {
  const screen = worldToScreen(shield.pos, camera)
  const fadeIn = Math.min(0.4, shield.duration * 0.15)
  const fadeOut = Math.min(0.8, shield.duration * 0.3)
  const fadeOutStart = shield.duration - fadeOut
  let alpha: number
  if (shield.elapsed < fadeIn) alpha = shield.elapsed / fadeIn
  else if (shield.elapsed > fadeOutStart)
    alpha = Math.max(0, (shield.duration - shield.elapsed) / fadeOut)
  else alpha = 1

  const pulse = 0.85 + Math.sin(shield.elapsed * 5) * 0.15

  ctx.save()
  ctx.globalAlpha = alpha
  ctx.translate(screen.x, screen.y)

  // Translucent dome fill
  const gradient = ctx.createRadialGradient(0, 0, 0, 0, 0, shield.radius)
  gradient.addColorStop(0, 'rgba(120, 200, 255, 0.05)')
  gradient.addColorStop(0.6, 'rgba(120, 200, 255, 0.1)')
  gradient.addColorStop(1, 'rgba(60, 180, 255, 0.25)')
  ctx.fillStyle = gradient
  ctx.beginPath()
  ctx.arc(0, 0, shield.radius, 0, Math.PI * 2)
  ctx.fill()

  // Pulsing rim
  ctx.strokeStyle = `rgba(120, 220, 255, ${0.6 * pulse})`
  ctx.lineWidth = 2
  ctx.beginPath()
  ctx.arc(0, 0, shield.radius, 0, Math.PI * 2)
  ctx.stroke()

  ctx.restore()
}

function renderSun(ctx: CanvasRenderingContext2D, sun: SunEffect, camera: Camera): void {
  const screen = worldToScreen(sun.pos, camera)
  const fadeIn = Math.min(0.5, sun.duration * 0.15)
  const fadeOut = Math.min(1.0, sun.duration * 0.3)
  const fadeOutStart = sun.duration - fadeOut
  let alpha: number
  if (sun.elapsed < fadeIn) alpha = sun.elapsed / fadeIn
  else if (sun.elapsed > fadeOutStart) alpha = Math.max(0, (sun.duration - sun.elapsed) / fadeOut)
  else alpha = 1

  const pulse = 1 + Math.sin(sun.elapsed * 4) * 0.04
  const r = sun.radius * pulse

  ctx.save()
  ctx.globalAlpha = alpha
  ctx.translate(screen.x, screen.y)

  // Corona — outer glow
  const corona = ctx.createRadialGradient(0, 0, 0, 0, 0, r * 1.4)
  corona.addColorStop(0, 'rgba(255, 220, 120, 0.35)')
  corona.addColorStop(0.5, 'rgba(255, 140, 60, 0.18)')
  corona.addColorStop(1, 'rgba(255, 100, 40, 0)')
  ctx.fillStyle = corona
  ctx.beginPath()
  ctx.arc(0, 0, r * 1.4, 0, Math.PI * 2)
  ctx.fill()

  // Core — bright center
  const core = ctx.createRadialGradient(0, 0, 0, 0, 0, r)
  core.addColorStop(0, 'rgba(255, 250, 230, 1)')
  core.addColorStop(0.4, 'rgba(255, 220, 120, 0.9)')
  core.addColorStop(0.8, 'rgba(255, 140, 60, 0.5)')
  core.addColorStop(1, 'rgba(255, 100, 40, 0)')
  ctx.fillStyle = core
  ctx.beginPath()
  ctx.arc(0, 0, r, 0, Math.PI * 2)
  ctx.fill()

  ctx.restore()
}
