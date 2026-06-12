import { CollectibleKind, EnemyKind, GamePhase, ProjectileOwner, ShipKind } from '../engine/types'
import type {
  ActiveEffect,
  Ally,
  Collectible,
  GameState,
  Particle,
  Projectile,
} from '../engine/types'
import { POWER_ORB, SINGULARITY_SHARD, SPACE_METAL } from '../data'
import { EFFECT_DEFINITIONS } from '../engine/systems/effects'
import { ABILITY_LIST } from '../engine/abilities'
import { getBossDefinition } from '../engine/bosses'
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
  [EnemyKind.voidWorm]: SpriteKey.voidWormBoss,
  [EnemyKind.wormSegment]: SpriteKey.wormSegment,
  [EnemyKind.phaseShifter]: SpriteKey.phaseShifterBoss,
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
  renderActiveEffects(ctx, state.activeEffects, camera, sprites, 'renderBack')
  renderBossOverlays(ctx, state, camera)
  renderHoldOverlays(ctx, state, camera, 'renderBack')
  renderCollectibles(ctx, state.collectibles, camera)
  renderParticles(ctx, state.particles, camera)
  renderEnemies(ctx, state, camera, sprites)
  renderAllies(ctx, state.allies, camera, sprites)
  renderProjectiles(ctx, state, camera, sprites)
  // No ship is in the world before the player has chosen one.
  const shipInWorld = state.phase !== GamePhase.menu && state.phase !== GamePhase.shipSelection
  if (shipInWorld) renderShip(ctx, state, camera, sprites)
  renderActiveEffects(ctx, state.activeEffects, camera, sprites, 'renderFront')
  renderHoldOverlays(ctx, state, camera, 'renderFront')
  if (shipInWorld) renderShipHealthBar(ctx, state, camera)

  ctx.restore()
}

// Generic dispatch: every active effect draws via the renderBack/renderFront
// hooks its EffectDefinition declares (registered in systems/effects.ts), so
// adding an effect never touches this file.
function renderActiveEffects(
  ctx: CanvasRenderingContext2D,
  effects: ActiveEffect[],
  camera: Camera,
  sprites: SpriteCache,
  layer: 'renderBack' | 'renderFront'
): void {
  for (const effect of effects) {
    EFFECT_DEFINITIONS[effect.kind][layer]?.(ctx, effect, camera, sprites)
  }
}

// Generic dispatch for hold-ability overlays (telekinesis ripple, solar-flare
// haze) — each hold ability declares its own renderBack/renderFront.
function renderHoldOverlays(
  ctx: CanvasRenderingContext2D,
  state: GameState,
  camera: Camera,
  layer: 'renderBack' | 'renderFront'
): void {
  for (const def of ABILITY_LIST) {
    const render = def.hold?.[layer]
    if (!render) continue
    const hold = state.holdStates[def.kind]
    if (!hold?.active || !hold.target) continue
    const ability = state.abilities.find((a) => a.kind === def.kind)
    if (!ability) continue
    render(ctx, ability, hold.target, state, camera)
  }
}

// Generic dispatch for boss world-layer drawing (e.g. the Phase Shifter's
// teleport telegraph) — each boss declares its own renderBack.
function renderBossOverlays(ctx: CanvasRenderingContext2D, state: GameState, camera: Camera): void {
  for (const enemy of state.enemies) {
    if (!enemy.boss) continue
    getBossDefinition(enemy.kind)?.renderBack?.(ctx, enemy, camera)
  }
}

// Cyan shared by every defensive layer — ship shield ring, ship shield bar, and
// the boss shield bubble — so they read as the same system.
const SHIELD_COLOR = '#6ae8f5'

// Cyan shield bubble drawn at the current translate origin. Shared by the ship
// and shielded bosses so both read as the same defensive layer.
function drawShieldRing(ctx: CanvasRenderingContext2D, radius: number, alpha: number): void {
  ctx.globalAlpha = alpha
  ctx.strokeStyle = SHIELD_COLOR
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

  // Overheated: wash the ship red. Tint on a scratch canvas so source-atop
  // clips to the sprite's own pixels — doing it on the main ctx would tint the
  // whole bounding box (the space background counts as destination).
  if (state.ship.slingOverheated) {
    const heatRatio = Math.max(0, Math.min(1, state.ship.slingHeat - 0.5))
    const tintColor = `rgba(255, 70, 40, ${heatRatio})`
    drawSpriteTint(ctx, sprites[spriteKey], size.w, size.h, tintColor)
  }
  ctx.restore()
}

// Reused scratch buffer for sprite-masked tints (e.g. the overheat wash).
let tintScratch: HTMLCanvasElement | null = null

function drawSpriteTint(
  ctx: CanvasRenderingContext2D,
  sprite: CanvasImageSource,
  w: number,
  h: number,
  color: string
): void {
  if (!tintScratch) tintScratch = document.createElement('canvas')
  tintScratch.width = w
  tintScratch.height = h
  const sctx = tintScratch.getContext('2d')
  if (!sctx) return
  sctx.imageSmoothingEnabled = false
  sctx.drawImage(sprite, 0, 0)
  // source-atop here only sees the sprite (the scratch starts empty), so the
  // fill lands solely on the sprite's opaque pixels.
  sctx.globalCompositeOperation = 'source-atop'
  sctx.fillStyle = color
  sctx.fillRect(0, 0, w, h)
  ctx.drawImage(tintScratch, -w / 2, -h / 2)
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
    const def = enemy.boss ? getBossDefinition(enemy.kind) : undefined
    // Boss-declared sprite alpha — e.g. the Phase Shifter's mid-shift ghost.
    const spriteAlpha = def?.spriteAlpha?.(enemy) ?? 1

    ctx.save()
    ctx.translate(screen.x, screen.y)
    // Stationary enemies (vel = 0) draw upright — atan2(0, 0) is 0 in JS, so
    // the +π/2 facing offset would otherwise tilt them 90° for no reason.
    const stationary = enemy.vel.x === 0 && enemy.vel.y === 0
    const angle = stationary ? 0 : Math.atan2(enemy.vel.y, enemy.vel.x) + Math.PI / 2
    ctx.rotate(angle)
    if (spriteAlpha < 1) ctx.globalAlpha = spriteAlpha
    ctx.drawImage(sprites[spriteKey], -size.w / 2, -size.h / 2)
    ctx.restore()

    // Boss shield bubble — visible while the boss is damage-gated. Drawn
    // outside the sprite's rotation so the ring never spins with the boss.
    // Bosses opt out via hideShieldBubble (always for the worm — its body is
    // its tell; mid-shift for the Phase Shifter).
    if (def) {
      const shielded =
        !def.hideShieldBubble?.(enemy) && def.canTakeDamage?.(enemy, state.enemies) === false
      if (shielded) {
        ctx.save()
        ctx.translate(screen.x, screen.y)
        drawShieldRing(ctx, enemy.radius + 12, 0.6)
        ctx.restore()
      }
    }

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
      const isLine = proj.pierce !== undefined || proj.bounce !== undefined || proj.beam === true
      if (
        !isLine ||
        !proj.prevPos ||
        !isWithinView(worldToScreen(proj.prevPos, camera), camera, 20)
      )
        continue
    }

    if (proj.owner === ProjectileOwner.enemy) {
      // Enemy laser (boss / generators) — red beam, same shape as the player's.
      if (proj.beam) {
        renderLaserBeam(ctx, proj, camera, 'rgba(255, 80, 80, 0.35)', '#ffd0d0')
        continue
      }
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

function renderLaserBeam(
  ctx: CanvasRenderingContext2D,
  proj: Projectile,
  camera: Camera,
  glow = 'rgba(120, 220, 255, 0.35)',
  core = '#e8faff'
): void {
  const from = worldToScreen(proj.prevPos ?? proj.pos, camera)
  const to = worldToScreen(proj.pos, camera)

  ctx.save()
  // Outer glow.
  ctx.strokeStyle = glow
  ctx.lineWidth = 6
  ctx.lineCap = 'round'
  ctx.beginPath()
  ctx.moveTo(from.x, from.y)
  ctx.lineTo(to.x, to.y)
  ctx.stroke()
  // Bright core.
  ctx.strokeStyle = core
  ctx.lineWidth = 2
  ctx.beginPath()
  ctx.moveTo(from.x, from.y)
  ctx.lineTo(to.x, to.y)
  ctx.stroke()
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
    } else if (c.kind === CollectibleKind.singularityShard) {
      // Violet diamond with a soft glow — reads apart from the gold metal hexagon.
      const pulse = 0.7 + Math.sin(c.elapsed * 5) * 0.3
      const r = SINGULARITY_SHARD.radius
      ctx.save()
      ctx.globalAlpha = pulse
      const glow = ctx.createRadialGradient(screen.x, screen.y, 0, screen.x, screen.y, r * 2)
      glow.addColorStop(0, 'rgba(190, 130, 255, 0.85)')
      glow.addColorStop(0.5, 'rgba(140, 80, 230, 0.35)')
      glow.addColorStop(1, 'rgba(110, 60, 210, 0)')
      ctx.fillStyle = glow
      ctx.beginPath()
      ctx.arc(screen.x, screen.y, r * 2, 0, Math.PI * 2)
      ctx.fill()

      ctx.fillStyle = SINGULARITY_SHARD.fill
      ctx.strokeStyle = SINGULARITY_SHARD.stroke
      ctx.lineWidth = 1.5
      ctx.beginPath()
      ctx.moveTo(screen.x, screen.y - r)
      ctx.lineTo(screen.x + r * 0.7, screen.y)
      ctx.lineTo(screen.x, screen.y + r)
      ctx.lineTo(screen.x - r * 0.7, screen.y)
      ctx.closePath()
      ctx.fill()
      ctx.stroke()
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
  ctx.fillStyle = SHIELD_COLOR
  ctx.fillRect(x, y, barWidth * shieldRatio, barHeight)

  // HP bar (below shield bar)
  const hpY = y + barHeight + 2
  ctx.fillStyle = '#221111'
  ctx.fillRect(x, hpY, barWidth, barHeight)
  const hpColor = hpRatio > 0.5 ? '#44bb44' : hpRatio > 0.25 ? '#ccaa22' : '#cc3333'
  ctx.fillStyle = hpColor
  ctx.fillRect(x, hpY, barWidth * hpRatio, barHeight)
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
    // The Helper Factory (spawnInterval set) renders larger with a violet ring
    // so it reads as the ultimate that builds helpers.
    const isFactory = ally.spawnInterval !== undefined
    const scale = isFactory ? 2 : 1
    // Rotate so the triangle tip faces the direction of movement (or up if idle)
    const angle =
      ally.vel.x !== 0 || ally.vel.y !== 0 ? Math.atan2(ally.vel.y, ally.vel.x) + Math.PI / 2 : 0
    ctx.save()
    ctx.translate(screen.x, screen.y)
    if (isFactory) {
      const pulse = 0.7 + Math.sin(ally.elapsed * 4) * 0.15
      ctx.strokeStyle = `rgba(200, 160, 255, ${pulse})`
      ctx.lineWidth = 2
      ctx.beginPath()
      ctx.arc(0, 0, (size.w / 2) * scale + 4, 0, Math.PI * 2)
      ctx.stroke()
    }
    ctx.rotate(angle)
    ctx.drawImage(
      sprites.ally,
      (-size.w / 2) * scale,
      (-size.h / 2) * scale,
      size.w * scale,
      size.h * scale
    )
    ctx.restore()

    // HP bar — below the sprite, mirrors the ship's bar style but smaller
    const hpPct = Math.max(0, ally.hp / ally.maxHp)
    if (hpPct < 1) {
      const barWidth = 18
      const barHeight = 3
      const barX = screen.x - barWidth / 2
      const barY = screen.y + (size.h / 2) * scale + 8
      ctx.fillStyle = 'rgba(0, 0, 0, 0.6)'
      ctx.fillRect(barX, barY, barWidth, barHeight)
      ctx.fillStyle = hpPct > 0.5 ? '#44dd44' : hpPct > 0.25 ? '#dddd44' : '#dd4444'
      ctx.fillRect(barX, barY, barWidth * hpPct, barHeight)
    }
  }
}
