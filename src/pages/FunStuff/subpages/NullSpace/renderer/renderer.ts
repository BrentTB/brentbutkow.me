import {
  AbilityKind,
  CollectibleKind,
  EffectKind,
  EnemyKind,
  GamePhase,
  ProjectileOwner,
  ShipKind,
} from '../engine/types'
import type {
  ActiveEffect,
  Ally,
  BlackHoleEffect,
  Collectible,
  GameState,
  MeteorStrikeEffect,
  NuclearWasteEffect,
  Particle,
  Projectile,
  RocketEffect,
  ShieldEffect,
  SunEffect,
} from '../engine/types'
import { POWER_ORB, SPACE_METAL } from '../data'
import { getNuclearWasteCurrentRadius } from '../engine/systems/effects'
import { getBossDefinition } from '../engine/bosses/index'
import type { Camera } from './camera'
import { isWithinView, worldToScreen } from './camera'
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
  [EnemyKind.dreadnought]: SpriteKey.dreadnoughtBoss,
  [EnemyKind.shieldGenerator]: SpriteKey.shieldGenerator,
}

export const SHIP_SPRITE_KEY: Record<ShipKind, SpriteKey> = {
  [ShipKind.fighter]: SpriteKey.ship,
  [ShipKind.interceptor]: SpriteKey.shipInterceptor,
  [ShipKind.dreadnought]: SpriteKey.shipDreadnought,
  [ShipKind.carrier]: SpriteKey.shipCarrier,
}

export function renderFrame(
  ctx: CanvasRenderingContext2D,
  state: GameState,
  camera: Camera,
  sprites: SpriteCache,
  stars: Star[]
): void {
  ctx.imageSmoothingEnabled = false
  // Baseline transform is DPR-scaled so all subsequent CSS-pixel coords map to
  // the high-DPI canvas without each renderer having to know about DPR.
  ctx.setTransform(camera.dpr, 0, 0, camera.dpr, 0, 0)
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
  renderSolarFlare(ctx, state, camera)
  renderCollectibles(ctx, state.collectibles, camera)
  renderParticles(ctx, state.particles, camera)
  renderEnemies(ctx, state, camera, sprites)
  renderAllies(ctx, state.allies, camera, sprites)
  renderProjectiles(ctx, state, camera, sprites)
  // No ship is in the world before the player has chosen one.
  const shipInWorld = state.phase !== GamePhase.menu && state.phase !== GamePhase.shipSelection
  if (shipInWorld) renderShip(ctx, state, camera, sprites)
  renderActiveEffectsFront(ctx, state.activeEffects, camera, sprites)
  renderTelekinesis(ctx, state, camera)
  if (shipInWorld) renderShipHealthBar(ctx, state, camera)

  ctx.restore()
}

// Cyan shield bubble drawn at the current translate origin. Shared by the ship
// and shielded bosses so both read as the same defensive layer.
function drawShieldRing(ctx: CanvasRenderingContext2D, radius: number, alpha: number): void {
  ctx.globalAlpha = alpha
  ctx.strokeStyle = '#6ae8f5'
  ctx.lineWidth = 2
  ctx.beginPath()
  ctx.arc(0, 0, radius, 0, Math.PI * 2)
  ctx.stroke()
  ctx.globalAlpha = 1
}

function renderShip(
  ctx: CanvasRenderingContext2D,
  state: GameState,
  camera: Camera,
  sprites: SpriteCache
): void {
  const screen = worldToScreen(state.ship.pos, camera)
  const spriteKey = SHIP_SPRITE_KEY[state.shipKind]
  const size = getSpriteSize(spriteKey)

  ctx.save()
  ctx.translate(screen.x, screen.y)

  const angle = Math.atan2(state.ship.vel.y, state.ship.vel.x) + Math.PI / 2
  ctx.rotate(angle)

  // Shield ring — fades with shield level, invisible at 0
  if (state.ship.shield > 0) {
    drawShieldRing(ctx, state.ship.radius + 12, (state.ship.shield / state.ship.maxShield) * 0.65)
  }

  ctx.drawImage(sprites[spriteKey], -size.w / 2, -size.h / 2)
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

    if (!isWithinView(screen, camera, 60)) continue

    const spriteKey = ENEMY_SPRITE[enemy.kind]
    const size = getSpriteSize(spriteKey)

    ctx.save()
    ctx.translate(screen.x, screen.y)
    const angle = Math.atan2(enemy.vel.y, enemy.vel.x) + Math.PI / 2
    ctx.rotate(angle)
    ctx.drawImage(sprites[spriteKey], -size.w / 2, -size.h / 2)
    // Boss shield bubble — visible while its generators keep it damage-gated.
    if (enemy.boss) {
      const def = getBossDefinition(enemy.kind)
      const shielded = def?.canTakeDamage ? !def.canTakeDamage(enemy, state.enemies) : false
      if (shielded) drawShieldRing(ctx, enemy.radius + 12, 0.6)
    }
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
    if (!isWithinView(screen, camera, 20)) {
      // Laser/ricochet draw a segment from prevPos to pos, so keep them while
      // the tail end is still on-screen — otherwise the beam pops out a frame
      // early. Point-sprite projectiles cull on pos alone.
      const isLine = proj.pierce !== undefined || proj.bounce !== undefined
      if (
        !isLine ||
        !proj.prevPos ||
        !isWithinView(worldToScreen(proj.prevPos, camera), camera, 20)
      )
        continue
    }

    if (proj.owner === ProjectileOwner.enemy) {
      const size = getSpriteSize(SpriteKey.enemyProjectile)
      ctx.drawImage(
        sprites[SpriteKey.enemyProjectile],
        screen.x - size.w / 2,
        screen.y - size.h / 2
      )
      continue
    }

    // Laser — bright beam line from prevPos to pos (cyan), with a small
    // additive glow. No sprite (a 3-pixel dot would lose the pass-through feel).
    if (proj.pierce) {
      renderLaserBeam(ctx, proj, camera)
      continue
    }

    // Missile / Nuke — sprite drawn rotated to velocity (nose up at angle 0).
    if (proj.homing || proj.detonate) {
      const key = proj.homing ? SpriteKey.missile : SpriteKey.nuke
      const size = getSpriteSize(key)
      const angle = Math.atan2(proj.vel.y, proj.vel.x) + Math.PI / 2
      ctx.save()
      ctx.translate(screen.x, screen.y)
      ctx.rotate(angle)
      ctx.drawImage(sprites[key], -size.w / 2, -size.h / 2)
      ctx.restore()
      continue
    }

    // Ricochet — magenta orb with a faint trail segment so bounce direction
    // reads at a glance.
    if (proj.bounce) {
      if (proj.prevPos) {
        const trailFrom = worldToScreen(proj.prevPos, camera)
        ctx.save()
        ctx.strokeStyle = 'rgba(255, 102, 204, 0.55)'
        ctx.lineWidth = 2
        ctx.lineCap = 'round'
        ctx.beginPath()
        ctx.moveTo(trailFrom.x, trailFrom.y)
        ctx.lineTo(screen.x, screen.y)
        ctx.stroke()
        ctx.restore()
      }
      const size = getSpriteSize(SpriteKey.ricochet)
      ctx.drawImage(sprites[SpriteKey.ricochet], screen.x - size.w / 2, screen.y - size.h / 2)
      continue
    }

    // Default bullet — unchanged.
    const size = getSpriteSize(SpriteKey.projectile)
    ctx.drawImage(sprites[SpriteKey.projectile], screen.x - size.w / 2, screen.y - size.h / 2)
  }
}

function renderLaserBeam(ctx: CanvasRenderingContext2D, proj: Projectile, camera: Camera): void {
  const from = worldToScreen(proj.prevPos ?? proj.pos, camera)
  const to = worldToScreen(proj.pos, camera)

  ctx.save()
  // Outer glow.
  ctx.strokeStyle = 'rgba(120, 220, 255, 0.35)'
  ctx.lineWidth = 6
  ctx.lineCap = 'round'
  ctx.beginPath()
  ctx.moveTo(from.x, from.y)
  ctx.lineTo(to.x, to.y)
  ctx.stroke()
  // Bright core.
  ctx.strokeStyle = '#e8faff'
  ctx.lineWidth = 2
  ctx.beginPath()
  ctx.moveTo(from.x, from.y)
  ctx.lineTo(to.x, to.y)
  ctx.stroke()
  ctx.restore()
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
    if (!isWithinView(screen, camera, 10)) continue

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
    if (!isWithinView(screen, camera, 20)) continue

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
  const shipSize = getSpriteSize(SHIP_SPRITE_KEY[state.shipKind])
  const barWidth = 40
  const barHeight = 4
  const hpRatio = Math.max(0, state.ship.hp / state.ship.maxHp)
  const shieldRatio = Math.max(0, state.ship.shield / state.ship.maxShield)

  const x = screen.x - barWidth / 2
  const y = screen.y + shipSize.h / 2 + 6

  // Shield bar (above HP bar)
  ctx.fillStyle = '#112233'
  ctx.fillRect(x, y, barWidth, barHeight)
  ctx.fillStyle = '#6ae8f5'
  ctx.fillRect(x, y, barWidth * shieldRatio, barHeight)

  // HP bar (below shield bar)
  const hpY = y + barHeight + 2
  ctx.fillStyle = '#221111'
  ctx.fillRect(x, hpY, barWidth, barHeight)
  const hpColor = hpRatio > 0.5 ? '#44bb44' : hpRatio > 0.25 ? '#ccaa22' : '#cc3333'
  ctx.fillStyle = hpColor
  ctx.fillRect(x, hpY, barWidth * hpRatio, barHeight)
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
      case EffectKind.nuclearWaste:
        renderNuclearWaste(ctx, effect, camera)
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

function renderNuclearWaste(
  ctx: CanvasRenderingContext2D,
  waste: NuclearWasteEffect,
  camera: Camera
): void {
  const screen = worldToScreen(waste.pos, camera)
  // Radius shares the damage helper so visual and damage circle match exactly.
  const r = getNuclearWasteCurrentRadius(waste)
  if (r <= 0.5) return

  ctx.save()
  ctx.translate(screen.x, screen.y)

  // Sickly green DOT field — flatter than the sun corona; reads as "ground"
  // contamination rather than a star.
  const fill = ctx.createRadialGradient(0, 0, 0, 0, 0, r)
  fill.addColorStop(0, 'rgba(136, 255, 68, 0.30)')
  fill.addColorStop(0.7, 'rgba(96, 200, 50, 0.20)')
  fill.addColorStop(1, 'rgba(60, 130, 30, 0)')
  ctx.fillStyle = fill
  ctx.beginPath()
  ctx.arc(0, 0, r, 0, Math.PI * 2)
  ctx.fill()

  // Static dashed rim to signal a damage zone. No pulse — the size schedule
  // (grow then shrink) carries the motion.
  ctx.strokeStyle = 'rgba(180, 255, 100, 0.55)'
  ctx.lineWidth = 1.5
  ctx.setLineDash([4, 6])
  ctx.beginPath()
  ctx.arc(0, 0, r, 0, Math.PI * 2)
  ctx.stroke()
  ctx.setLineDash([])

  ctx.restore()
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

function renderAllies(
  ctx: CanvasRenderingContext2D,
  allies: Ally[],
  camera: Camera,
  sprites: SpriteCache
): void {
  for (const ally of allies) {
    const screen = worldToScreen(ally.pos, camera)
    if (!isWithinView(screen, camera, 20)) continue
    const size = getSpriteSize(SpriteKey.ally)
    // Rotate so the triangle tip faces the direction of movement (or up if idle)
    const angle =
      ally.vel.x !== 0 || ally.vel.y !== 0 ? Math.atan2(ally.vel.y, ally.vel.x) + Math.PI / 2 : 0
    ctx.save()
    ctx.translate(screen.x, screen.y)
    ctx.rotate(angle)
    ctx.drawImage(sprites.ally, -size.w / 2, -size.h / 2)
    ctx.restore()

    // HP bar — below the sprite, mirrors the ship's bar style but smaller
    const hpPct = Math.max(0, ally.hp / ally.maxHp)
    if (hpPct < 1) {
      const barWidth = 18
      const barHeight = 3
      const barX = screen.x - barWidth / 2
      const barY = screen.y + size.h / 2 + 8
      ctx.fillStyle = 'rgba(0, 0, 0, 0.6)'
      ctx.fillRect(barX, barY, barWidth, barHeight)
      ctx.fillStyle = hpPct > 0.5 ? '#44dd44' : hpPct > 0.25 ? '#dddd44' : '#dd4444'
      ctx.fillRect(barX, barY, barWidth * hpPct, barHeight)
    }
  }
}

function renderSolarFlare(ctx: CanvasRenderingContext2D, state: GameState, camera: Camera): void {
  const hold = state.holdStates[AbilityKind.solarFlare]
  if (!hold?.active || !hold.target) return
  // Soft heat haze under the particle spawn area. Particles do the bulk of the
  // visual; this just hints at the affected zone.
  const center = worldToScreen(hold.target, camera)
  const sfAbility = state.abilities.find((a) => a.kind === AbilityKind.solarFlare)
  if (!sfAbility) return
  const radius = sfAbility.aoeRadius * camera.zoom

  ctx.save()
  const gradient = ctx.createRadialGradient(center.x, center.y, 0, center.x, center.y, radius)
  gradient.addColorStop(0, 'rgba(255, 220, 120, 0.18)')
  gradient.addColorStop(0.6, 'rgba(255, 150, 60, 0.08)')
  gradient.addColorStop(1, 'rgba(255, 100, 30, 0)')
  ctx.fillStyle = gradient
  ctx.beginPath()
  ctx.arc(center.x, center.y, radius, 0, Math.PI * 2)
  ctx.fill()
  ctx.restore()
}

function renderTelekinesis(ctx: CanvasRenderingContext2D, state: GameState, camera: Camera): void {
  const hold = state.holdStates[AbilityKind.telekinesis]
  if (!hold?.active || !hold.target) return
  const center = worldToScreen(hold.target, camera)
  const tkAbility = state.abilities.find((a) => a.kind === AbilityKind.telekinesis)
  if (!tkAbility) return
  const screenRadius = tkAbility.aoeRadius * camera.zoom

  ctx.save()

  // Ripple circle
  ctx.strokeStyle = 'rgba(80, 220, 255, 0.5)'
  ctx.lineWidth = 2
  ctx.setLineDash([6, 4])
  ctx.beginPath()
  ctx.arc(center.x, center.y, screenRadius, 0, Math.PI * 2)
  ctx.stroke()
  ctx.setLineDash([])

  // Force lines to affected enemies
  for (const enemy of state.enemies) {
    const eScreen = worldToScreen(enemy.pos, camera)
    const dx = eScreen.x - center.x
    const dy = eScreen.y - center.y
    const dist = Math.sqrt(dx * dx + dy * dy)
    if (dist >= screenRadius) continue
    const alpha = (1 - dist / screenRadius) * 0.6
    ctx.strokeStyle = `rgba(80, 220, 255, ${alpha.toFixed(2)})`
    ctx.lineWidth = 1
    ctx.beginPath()
    ctx.moveTo(center.x, center.y)
    ctx.lineTo(eScreen.x, eScreen.y)
    ctx.stroke()
  }

  ctx.restore()
}
