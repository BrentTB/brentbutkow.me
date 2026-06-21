import {
  CollectibleKind,
  DashStage,
  EnemyKind,
  EnemyModifier,
  GamePhase,
  ProjectileOwner,
  ShipKind,
} from '../engine/types'
import type {
  ActiveEffect,
  Ally,
  Collectible,
  DeathAnim,
  GameState,
  Particle,
  Projectile,
} from '../engine/types'
import {
  ANIMATION,
  DASHER,
  ENEMY_MODIFIERS,
  NEBULA,
  POWER_ORB,
  SINGULARITY_SHARD,
  SPACE_METAL,
  WARP,
  WAVE_ESCALATION,
} from '../data'
import { EFFECT_DEFINITIONS } from '../engine/systems/effects'
import {
  buildNebulaField,
  enemyVisibleToPlayerSide,
  hazeJitterAt,
  sightCircles,
} from '../engine/calamities/nebula-vision'
import type { NebulaField } from '../engine/calamities/nebula-vision'
import { drawNebulaCloud, fogNebulasOf } from '../engine/calamities/nebula'
import { ABILITY_LIST } from '../engine/abilities'
import { getBossDefinition } from '../engine/bosses'
import { enemyFacing } from '../engine/entities/enemy'
import { waveSpeedEscalation } from '../engine/world/wave-escalation'
import { isBossWave } from '../engine/world/waves'
import type { Camera } from './camera'
import { isWithinView, worldToScreen } from './camera'
import type { AnimationCache, SpriteCache } from './sprite-cache'
import { getSpriteSize, pickFrame } from './sprite-cache'
import { AnimationKey, SpriteKey } from './sprites'
import type { Star } from './starfield'
import { renderStarfield } from './starfield'
import { renderPortal } from './portal'
import { renderHazardField } from './hazard-field'
import { renderAsteroidField } from './asteroid-field'
import { renderWarpTransition } from './warp'

// Dev-only (env-gated, set in .env.local): draw the torus wrap seam so the
// otherwise-invisible world edge is visible while testing wrapping.
const SHOW_WORLD_BORDER = import.meta.env.VITE_NULL_SPACE_SHOW_WORLD_BORDER === 'true'

const ENEMY_SPRITE: Record<EnemyKind, SpriteKey> = {
  [EnemyKind.drone]: SpriteKey.drone,
  [EnemyKind.tank]: SpriteKey.tank,
  [EnemyKind.shooter]: SpriteKey.shooter,
  [EnemyKind.swarm]: SpriteKey.swarm,
  [EnemyKind.bomber]: SpriteKey.bomber,
  [EnemyKind.dasher]: SpriteKey.dasher,
  [EnemyKind.dreadnought]: SpriteKey.dreadnoughtBoss,
  [EnemyKind.shieldGenerator]: SpriteKey.shieldGenerator,
  [EnemyKind.voidWorm]: SpriteKey.voidWormBoss,
  [EnemyKind.wormSegment]: SpriteKey.wormSegment,
  [EnemyKind.miniVoidWorm]: SpriteKey.miniVoidWorm,
  [EnemyKind.phaseShifter]: SpriteKey.phaseShifterBoss,
}

export const SHIP_SPRITE_KEY: Record<ShipKind, SpriteKey> = {
  [ShipKind.fighter]: SpriteKey.ship,
  [ShipKind.interceptor]: SpriteKey.shipInterceptor,
  [ShipKind.dreadnought]: SpriteKey.shipDreadnought,
}

// Stable 0..2π phase from an entity id so idle pulses don't march in lockstep.
function idPhase(id: string): number {
  let h = 0
  for (let i = 0; i < id.length; i++) h = (h + id.charCodeAt(i)) % 360
  return (h / 360) * Math.PI * 2
}

// Render-time inputs that aren't part of the deterministic GameState: the
// pre-rasterized animation frames, a cosmetic clock (seconds, freezes on pause)
// driving ship-side animation, and the OS reduce-motion preference.
export type RenderOptions = {
  animations: AnimationCache
  clock: number
  reducedMotion: boolean
}

export function renderFrame(
  ctx: CanvasRenderingContext2D,
  state: GameState,
  camera: Camera,
  sprites: SpriteCache,
  stars: Star[],
  opts: RenderOptions
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

  // No ship in the world before one is chosen, or once it's exploded (dying →
  // gameOver) — otherwise the dead hull pops back, washed white by the stale
  // hit-flash, the instant the game-over screen appears.
  const shipInWorld =
    state.phase !== GamePhase.menu &&
    state.phase !== GamePhase.shipSelection &&
    state.phase !== GamePhase.dying &&
    state.phase !== GamePhase.gameOver

  // Nebula context for this frame — drives the fog occlusion + the in-haze overlays.
  const nebulaField = buildNebulaField(state.activeEffects, state.ship, state.allies)

  renderStarfield(ctx, stars, camera)
  if (SHOW_WORLD_BORDER) renderWorldBorder(ctx, camera)
  const warping = state.phase === GamePhase.warping
  // During the warp cutscene the hazard field is hidden so only the portal shows
  // as the ship flies in.
  if (shipInWorld && !warping) {
    renderHazardField(ctx, state, camera)
    renderAsteroidField(ctx, state, camera)
  }
  if (warping) renderPortal(ctx, state, camera)
  renderActiveEffects(ctx, state.activeEffects, camera, sprites, 'renderBack')
  // Fog clouds draw at the atmosphere layer (beneath the entities), with their sight
  // bubbles muted so the player's range reads as a clearer patch in the murk.
  if (shipInWorld) renderFogClouds(ctx, state, camera)
  renderBossOverlays(ctx, state, camera)
  renderHoldOverlays(ctx, state, camera, 'renderBack')
  renderCollectibles(ctx, state.collectibles, camera)
  renderParticles(ctx, state.particles, camera)
  renderEnemies(ctx, state, camera, sprites, opts.reducedMotion, nebulaField)
  renderDeathAnims(ctx, state.deathAnims, camera, sprites, opts.animations, opts.reducedMotion)
  renderAllies(ctx, state.allies, camera, sprites)
  renderProjectiles(ctx, state, camera, sprites)
  if (shipInWorld) renderShip(ctx, state, camera, sprites, opts.clock, opts.reducedMotion)
  // Expanding shockwave ring where the ship blew up.
  if (state.phase === GamePhase.dying) renderDeathShockwave(ctx, state, camera, opts.reducedMotion)
  renderActiveEffects(ctx, state.activeEffects, camera, sprites, 'renderFront')
  renderHoldOverlays(ctx, state, camera, 'renderFront')
  if (shipInWorld) renderShipHealthBar(ctx, state, camera)

  ctx.restore()

  // Haze ripple: warp the rendered world (screen-space) before the stable overlays
  // go on top, so the HUD vignettes don't ripple along with it.
  if (shipInWorld) renderHazeWarp(ctx, state, camera, nebulaField, opts)

  // Low-HP danger vignette — screen space, hugging the viewport edges.
  if (shipInWorld) renderLowHpVignette(ctx, state, camera, opts)

  // Haze colour wash over the (rippled) view.
  if (shipInWorld) renderHazeTint(ctx, state, camera, nebulaField, opts)

  // Warp flash lives in screen space. It plays ONLY after the ship reaches the
  // portal (the flash stage) — never during the fly-in — then the shop opens.
  if (warping && state.warpFlashTimer > 0) {
    renderWarpTransition(ctx, camera, 1 - state.warpFlashTimer / WARP.flashDuration)
  }
}

// Dev overlay (env-gated): the torus wrap seam — the lines where world x ≡ 0 and
// y ≡ 0. worldToScreen places each at its nearest image, so the line slides in as
// the ship nears that edge (there is exactly one seam per axis on a torus).
function renderWorldBorder(ctx: CanvasRenderingContext2D, camera: Camera): void {
  const vw = camera.width / camera.zoom
  const vh = camera.height / camera.zoom
  const seamX = worldToScreen({ x: 0, y: camera.y + vh / 2 }, camera).x
  const seamY = worldToScreen({ x: camera.x + vw / 2, y: 0 }, camera).y

  ctx.save()
  ctx.strokeStyle = 'rgba(255, 80, 255, 0.7)'
  ctx.lineWidth = 2
  ctx.setLineDash([14, 10])
  ctx.beginPath()
  ctx.moveTo(seamX, 0)
  ctx.lineTo(seamX, vh)
  ctx.moveTo(0, seamY)
  ctx.lineTo(vw, seamY)
  ctx.stroke()
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
  sprites: SpriteCache,
  clock: number,
  reducedMotion: boolean
): void {
  const ship = state.ship
  const screen = worldToScreen(ship.pos, camera)
  const spriteKey = SHIP_SPRITE_KEY[state.shipKind]
  const size = getSpriteSize(spriteKey)

  ctx.save()
  ctx.translate(screen.x, screen.y)
  // Sprite nose points up (local -y); the rotation aims it along velocity, or along
  // the last heading when stationary — so a stopped or just-warped ship keeps facing
  // where it was going instead of snapping upright. lastHeading is always a unit
  // vector, so this never hits the atan2(0, 0) degenerate case.
  const moving = ship.vel.x !== 0 || ship.vel.y !== 0
  const dir = moving ? ship.vel : ship.lastHeading
  const angle = Math.atan2(dir.y, dir.x) + Math.PI / 2
  ctx.rotate(angle)

  // Shield ring — fades with shield level, invisible at 0.
  if (ship.shield > 0) {
    drawShieldRing(ctx, ship.radius + 12, (ship.shield / ship.maxShield) * 0.65)
  }

  // Engine exhaust sits behind the hull, so draw it before the sprite.
  drawThruster(ctx, size, Math.hypot(ship.vel.x, ship.vel.y), clock, reducedMotion)

  ctx.drawImage(sprites[spriteKey], -size.w / 2, -size.h / 2)

  // Hit flash — white wash on HP damage (reuses the masked-tint helper).
  if (ship.hitFlash > 0) {
    const a = (ship.hitFlash / ANIMATION.hitFlash) * 0.85
    drawSpriteTint(ctx, sprites[spriteKey], size.w, size.h, `rgba(255, 255, 255, ${a})`)
  }

  // Overheated: wash the ship red. Tint on a scratch canvas so source-atop
  // clips to the sprite's own pixels — doing it on the main ctx would tint the
  // whole bounding box (the space background counts as destination).
  if (ship.slingOverheated) {
    const heatRatio = Math.max(0, Math.min(1, ship.slingHeat - 0.5))
    drawSpriteTint(ctx, sprites[spriteKey], size.w, size.h, `rgba(255, 70, 40, ${heatRatio})`)
  }
  ctx.restore()
}

// Twin engine plume behind the hull (local +y), flickering with the cosmetic
// clock and lengthening with speed. Reduced motion → a short steady flame.
function drawThruster(
  ctx: CanvasRenderingContext2D,
  size: { w: number; h: number },
  speed: number,
  clock: number,
  reducedMotion: boolean
): void {
  const intensity = Math.min(1, 0.35 + speed / 600)
  const flicker = reducedMotion ? 1 : 0.8 + Math.sin(clock * 32) * 0.2
  const len = size.h * 0.72 * intensity * flicker
  if (len < 1) return
  // Start the flame up inside the lower hull (the sprite is drawn over it, so it
  // emerges from under the ship) — never a gap between body and exhaust.
  const baseY = size.h * 0.3
  const nozzleX = size.w * 0.16
  const w = size.w * 0.12
  for (const dir of [-1, 1]) {
    const x = dir * nozzleX
    ctx.fillStyle = '#ff6633'
    ctx.beginPath()
    ctx.moveTo(x - w, baseY)
    ctx.lineTo(x + w, baseY)
    ctx.lineTo(x, baseY + len)
    ctx.closePath()
    ctx.fill()
    ctx.fillStyle = '#ffd24a'
    ctx.beginPath()
    ctx.moveTo(x - w * 0.5, baseY)
    ctx.lineTo(x + w * 0.5, baseY)
    ctx.lineTo(x, baseY + len * 0.6)
    ctx.closePath()
    ctx.fill()
  }
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
  sprites: SpriteCache,
  reducedMotion: boolean,
  field: NebulaField
): void {
  // Wave stall-escalation reddens every enemy as they speed up — a legibility
  // cue that parking is getting dangerous. Zero until past the grace period.
  const escMult = waveSpeedEscalation(state.spawn.elapsed, isBossWave(state.wave))
  // Floor the wash so it's visible the instant escalation kicks in (escMult jumps
  // past 1), not a barely-there tint that creeps in over many seconds.
  const escalationAlpha =
    escMult <= 1 ? 0 : 0.2 + ((escMult - 1) / (WAVE_ESCALATION.maxMult - 1)) * 0.4
  for (const enemy of state.enemies) {
    // Fog: a concealed enemy (in fog, outside every sight bubble) isn't drawn — it's
    // hidden in the murk. Its shots + impacts still flash. Bosses are never concealed.
    if (!enemy.boss && !enemyVisibleToPlayerSide(enemy.pos, field)) continue
    const screen = worldToScreen(enemy.pos, camera)

    if (!isWithinView(screen, camera, 60)) continue

    // Dasher windup telegraph — a charge-path line that brightens as the lunge
    // nears, so the player can read the dodge. Hidden under reduced motion.
    if (!reducedMotion && enemy.dasher?.stage === DashStage.windup) {
      const d = enemy.dasher
      const progress = 1 - Math.max(0, d.stageTimer) / DASHER.windupDuration
      const len = DASHER.chargeSpeed * DASHER.chargeDuration
      ctx.save()
      ctx.globalAlpha = 0.25 + progress * 0.5
      ctx.strokeStyle = '#ff5a3c'
      ctx.lineWidth = 2 + progress * 3
      ctx.beginPath()
      ctx.moveTo(screen.x, screen.y)
      ctx.lineTo(screen.x + d.heading.x * len, screen.y + d.heading.y * len)
      ctx.stroke()
      ctx.restore()
    }

    const spriteKey = ENEMY_SPRITE[enemy.kind]
    const size = getSpriteSize(spriteKey)
    const def = enemy.boss ? getBossDefinition(enemy.kind) : undefined
    // Boss-declared sprite alpha — e.g. the Phase Shifter's mid-shift ghost.
    const spriteAlpha = def?.spriteAlpha?.(enemy) ?? 1
    // Warp-in: grow + fade from nothing as spawnIn counts down to 0.
    const spawnT = reducedMotion ? 1 : Math.min(1, 1 - enemy.spawnIn / ANIMATION.spawnIn)
    // Idle breathing on nimble enemies, desynced per id; bosses + reduced motion stay still.
    const idle =
      !reducedMotion &&
      !enemy.boss &&
      (enemy.kind === EnemyKind.drone || enemy.kind === EnemyKind.swarm)
        ? 1 + Math.sin(enemy.age * 6 + idPhase(enemy.id)) * 0.06
        : 1

    ctx.save()
    ctx.translate(screen.x, screen.y)
    // Face velocity when moving, else the nearest target — so a parked shooter
    // points at what it fires at instead of a fixed heading.
    const facing = enemyFacing(enemy, state.ship, state.allies)
    ctx.rotate(Math.atan2(facing.y, facing.x) + Math.PI / 2)
    ctx.globalAlpha = spriteAlpha * spawnT
    // Giant modifier oversizes the sprite; spawn-in grow + idle pulse compose on top.
    const giant = enemy.modifier === EnemyModifier.giant ? ENEMY_MODIFIERS.giantRadiusMult : 1
    ctx.scale(giant * idle * (0.35 + 0.65 * spawnT), giant * idle * (0.35 + 0.65 * spawnT))
    ctx.drawImage(sprites[spriteKey], -size.w / 2, -size.h / 2)
    // Speed modifier washes the sprite red (same masked tint as the ship overheat).
    if (enemy.modifier === EnemyModifier.speed) {
      drawSpriteTint(ctx, sprites[spriteKey], size.w, size.h, ENEMY_MODIFIERS.speedTint)
    }
    // Stall-escalation wash — reddens with the rising wave speed multiplier.
    if (escalationAlpha > 0) {
      drawSpriteTint(
        ctx,
        sprites[spriteKey],
        size.w,
        size.h,
        `rgba(255, 70, 40, ${escalationAlpha})`
      )
    }
    // Hit flash — white wash on damage.
    if (enemy.hitFlash > 0) {
      const a = (enemy.hitFlash / ANIMATION.hitFlash) * 0.9
      drawSpriteTint(ctx, sprites[spriteKey], size.w, size.h, `rgba(255, 255, 255, ${a})`)
    }
    ctx.restore()

    // Muzzle blip the moment an enemy fires.
    if (enemy.fireFlash > 0) {
      drawEnemyFireFlash(ctx, screen, enemy.fireFlash / ANIMATION.enemyFireFlash)
    }

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

    // Shield-modifier ring — fades with the shield's charge (mirrors the ship ring).
    const es = enemy.enemyShield
    if (es && es.shield > 0) {
      ctx.save()
      ctx.translate(screen.x, screen.y)
      drawShieldRing(ctx, enemy.radius + 12, (es.shield / es.maxShield) * 0.65)
      ctx.restore()
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

// Brief bright bloom at an enemy that just fired.
function drawEnemyFireFlash(
  ctx: CanvasRenderingContext2D,
  screen: { x: number; y: number },
  t: number
): void {
  ctx.save()
  ctx.globalAlpha = Math.min(1, t) * 0.8
  ctx.fillStyle = '#ff7a4d'
  ctx.beginPath()
  ctx.arc(screen.x, screen.y, 3 + t * 3, 0, Math.PI * 2)
  ctx.fill()
  ctx.restore()
}

// Cosmetic enemy disintegration: the sprite spins + fades while a shatter
// animation flashes over it, then both vanish (see DeathAnim / ANIMATION_MAP).
function renderDeathAnims(
  ctx: CanvasRenderingContext2D,
  deathAnims: DeathAnim[],
  camera: Camera,
  sprites: SpriteCache,
  animations: AnimationCache,
  reducedMotion: boolean
): void {
  const frames = animations[AnimationKey.disintegration]
  for (const d of deathAnims) {
    const screen = worldToScreen(d.pos, camera)
    if (!isWithinView(screen, camera, 80)) continue
    const t = d.elapsed / d.duration
    const spriteKey = ENEMY_SPRITE[d.kind]
    const size = getSpriteSize(spriteKey)

    // Fading, slightly swelling, tumbling sprite.
    ctx.save()
    ctx.translate(screen.x, screen.y)
    ctx.rotate(d.angle + (reducedMotion ? 0 : t * 1.5))
    const grow = d.sizeScale * (1 + t * 0.4)
    ctx.globalAlpha = 1 - t
    ctx.scale(grow, grow)
    ctx.drawImage(sprites[spriteKey], -size.w / 2, -size.h / 2)
    ctx.restore()

    // Shatter overlay frame, scaled to the enemy and fading near the end. Clamp
    // just under duration so the last frame holds instead of pickFrame's modulo
    // wrapping back to frame 0 on the final tick.
    const shatterElapsed = Math.min(d.elapsed, d.duration * 0.999)
    const frame = frames[pickFrame(frames.length, d.duration / frames.length, shatterElapsed)]
    if (frame) {
      const scale = (size.w / frame.width) * 1.2 * d.sizeScale
      const w = frame.width * scale
      const h = frame.height * scale
      ctx.save()
      ctx.globalAlpha = Math.min(1, (1 - t) * 1.4)
      ctx.drawImage(frame, screen.x - w / 2, screen.y - h / 2, w, h)
      ctx.restore()
    }
  }
}

// Expanding ring where the player ship blew up (GamePhase.dying).
function renderDeathShockwave(
  ctx: CanvasRenderingContext2D,
  state: GameState,
  camera: Camera,
  reducedMotion: boolean
): void {
  if (reducedMotion) return
  const t = 1 - state.deathTimer / ANIMATION.deathSequence
  const ringT = t / 0.5
  if (ringT >= 1) return
  const screen = worldToScreen(state.ship.pos, camera)
  ctx.save()
  ctx.globalAlpha = (1 - ringT) * 0.7
  ctx.strokeStyle = '#ffd2a0'
  ctx.lineWidth = 3
  ctx.beginPath()
  ctx.arc(screen.x, screen.y, 10 + ringT * 120, 0, Math.PI * 2)
  ctx.stroke()
  ctx.restore()
}

// Reused scratch canvas for the haze ripple — snapshots the rendered frame so it can
// be re-drawn warped. Lazily created (never in headless/test paths, which don't render).
let hazeBuffer: HTMLCanvasElement | null = null

// Haze: a wavy, underwater "drunk" distortion while the ship sits in a haze zone.
// Snapshots the rendered world, then re-draws it as horizontal strips each shifted by
// a travelling sine (two frequencies + a vertical wobble → woozy, not a clean shear),
// scaled by haze depth. Screen-space pixels only — the camera's click→world mapping is
// untouched, so the ripple is purely the player's symmetric aim handicap. Reduced
// motion skips it (the colour wash carries the effect instead).
function renderHazeWarp(
  ctx: CanvasRenderingContext2D,
  state: GameState,
  camera: Camera,
  field: NebulaField,
  opts: RenderOptions
): void {
  if (opts.reducedMotion) return
  const intensity = hazeJitterAt(state.ship.pos, field.haze) / NEBULA.hazeJitterMax
  if (intensity <= 0) return
  const cw = ctx.canvas.width
  const ch = ctx.canvas.height
  if (cw === 0 || ch === 0) return
  if (!hazeBuffer) hazeBuffer = document.createElement('canvas')
  if (hazeBuffer.width !== cw || hazeBuffer.height !== ch) {
    hazeBuffer.width = cw
    hazeBuffer.height = ch
  }
  const bctx = hazeBuffer.getContext('2d')
  if (!bctx) return

  bctx.setTransform(1, 0, 0, 1, 0, 0)
  bctx.clearRect(0, 0, cw, ch)
  bctx.drawImage(ctx.canvas, 0, 0)

  ctx.save()
  ctx.setTransform(1, 0, 0, 1, 0, 0)
  ctx.fillStyle = '#06080e'
  ctx.fillRect(0, 0, cw, ch)
  const dpr = camera.dpr
  const amp = NEBULA.hazeWarpAmp * 16 * dpr * intensity
  const t = opts.clock * NEBULA.hazeWarpSpeed
  const stripH = Math.max(2, Math.round(3 * dpr))
  const overlap = Math.ceil(amp * 0.5) + 1
  const vOver = Math.ceil(amp * 0.45) + 1
  for (let y = 0; y < ch; y += stripH) {
    const dx = (Math.sin(y / (38 * dpr) + t) + Math.sin(y / (17 * dpr) + t * 1.7) * 0.5) * amp
    const dy = Math.sin(y / (80 * dpr) + t * 0.6) * amp * 0.45
    // Overdraw by `amp` horizontally and `vOver` vertically (>= the dy shift), so a
    // warped strip never exposes the backdrop at any viewport edge.
    const sy = Math.max(0, y - vOver)
    const sh = Math.min(ch - sy, y + stripH + overlap + vOver - sy)
    ctx.drawImage(hazeBuffer, 0, sy, cw, sh, dx - amp, sy + dy, cw + 2 * amp, sh)
  }
  ctx.restore()
}

// Haze: a sickly colour wash over the view, scaled by haze depth. Pairs with the
// warp; under reduced motion it runs a touch stronger to carry the disorientation.
function renderHazeTint(
  ctx: CanvasRenderingContext2D,
  state: GameState,
  camera: Camera,
  field: NebulaField,
  opts: RenderOptions
): void {
  const intensity = hazeJitterAt(state.ship.pos, field.haze) / NEBULA.hazeJitterMax
  if (intensity <= 0) return
  const w = camera.width
  const h = camera.height
  const pulse = opts.reducedMotion ? 1 : 0.8 + Math.sin(opts.clock * 3) * 0.2
  const a = 0.28 * intensity * pulse
  const grad = ctx.createRadialGradient(
    w / 2,
    h / 2,
    Math.min(w, h) * 0.2,
    w / 2,
    h / 2,
    Math.max(w, h) * 0.7
  )
  grad.addColorStop(0, `rgba(${NEBULA.hazeColor}, ${a * 0.5})`)
  grad.addColorStop(1, `rgba(${NEBULA.hazeColor}, ${a})`)
  ctx.save()
  ctx.fillStyle = grad
  ctx.fillRect(0, 0, w, h)
  ctx.restore()
}

// Reused scratch canvas for the fog clear-hole layer.
let fogBuffer: HTMLCanvasElement | null = null

// Fog: render the (dense, translucent, billowy) clouds into an offscreen buffer, then
// punch a clean clear hole for each sight bubble (ship + allies) — so inside the range
// is fully clear and outside is thick fog, with a crisp circular edge. destination-out
// runs on the fog-only buffer, so it erases just the fog and reveals the world, never
// black. Composited at the atmosphere layer (beneath entities), so revealed enemies
// draw over it.
function renderFogClouds(ctx: CanvasRenderingContext2D, state: GameState, camera: Camera): void {
  const fogs = fogNebulasOf(state.activeEffects)
  if (fogs.length === 0) return
  const cw = ctx.canvas.width
  const ch = ctx.canvas.height
  if (cw === 0 || ch === 0) return
  if (!fogBuffer) fogBuffer = document.createElement('canvas')
  if (fogBuffer.width !== cw || fogBuffer.height !== ch) {
    fogBuffer.width = cw
    fogBuffer.height = ch
  }
  const f = fogBuffer.getContext('2d')
  if (!f) return

  // Match the main canvas's world transform so the clouds land identically.
  const m = camera.dpr * camera.zoom
  f.setTransform(1, 0, 0, 1, 0, 0)
  f.clearRect(0, 0, cw, ch)
  f.setTransform(m, 0, 0, m, 0, 0)
  for (const fog of fogs) drawNebulaCloud(f, fog, camera, NEBULA.fogDensity)

  // Clean clear bubbles: fully clear within the core, a crisp edge out to the radius.
  f.globalCompositeOperation = 'destination-out'
  for (const c of sightCircles(state.ship, state.allies)) {
    const s = worldToScreen(c.center, camera)
    const hole = f.createRadialGradient(s.x, s.y, c.radius * 0.82, s.x, s.y, c.radius)
    hole.addColorStop(0, 'rgba(0, 0, 0, 1)')
    hole.addColorStop(1, 'rgba(0, 0, 0, 0)')
    f.fillStyle = hole
    f.beginPath()
    f.arc(s.x, s.y, c.radius, 0, Math.PI * 2)
    f.fill()
  }
  f.globalCompositeOperation = 'source-over'

  ctx.save()
  ctx.setTransform(1, 0, 0, 1, 0, 0)
  ctx.drawImage(fogBuffer, 0, 0)
  ctx.restore()
}

// Red danger vignette hugging the viewport edges when the ship nears death.
// Screen space — drawn after the world transform is restored.
function renderLowHpVignette(
  ctx: CanvasRenderingContext2D,
  state: GameState,
  camera: Camera,
  opts: RenderOptions
): void {
  const ratio = state.ship.hp / state.ship.maxHp
  if (ratio >= ANIMATION.lowHpThreshold || state.ship.hp <= 0) return
  const danger = 1 - Math.max(0, ratio) / ANIMATION.lowHpThreshold
  const pulse = opts.reducedMotion ? 0.7 : 0.7 + Math.sin(opts.clock * 5) * 0.3
  const w = camera.width
  const h = camera.height
  const grad = ctx.createRadialGradient(
    w / 2,
    h / 2,
    Math.min(w, h) * 0.35,
    w / 2,
    h / 2,
    Math.max(w, h) * 0.72
  )
  grad.addColorStop(0, 'rgba(180, 20, 20, 0)')
  grad.addColorStop(1, `rgba(180, 20, 20, ${danger * 0.45 * pulse})`)
  ctx.save()
  ctx.fillStyle = grad
  ctx.fillRect(0, 0, w, h)
  ctx.restore()
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
    // The Helper Factory (spawnInterval set) is a bigger build; the larger
    // sprite alone distinguishes it — no ring, it has no shielding.
    const scale = ally.spawnInterval !== undefined ? 2 : 1
    // Rotate so the triangle tip faces the direction of movement (or up if idle)
    const angle =
      ally.vel.x !== 0 || ally.vel.y !== 0 ? Math.atan2(ally.vel.y, ally.vel.x) + Math.PI / 2 : 0
    ctx.save()
    ctx.translate(screen.x, screen.y)
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
