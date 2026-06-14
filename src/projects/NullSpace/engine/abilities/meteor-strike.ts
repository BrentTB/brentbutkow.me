import { canEnemyTakeDamage } from '../bosses/index'
import { applyDamageToEnemy } from '../entities/enemy-damage'
import { distance } from '../math/collision'
import { spawnExplosionParticles, uid } from '../entities/entity-creator'
import { EffectKind } from '../types'
import type { Enemy, MeteorStrikeEffect, Vec2 } from '../types'
import type { Camera } from '../../renderer/camera'
import { worldToScreen } from '../../renderer/camera'
import type { SpriteCache } from '../../renderer/sprite-cache'
import { getSpriteSize } from '../../renderer/sprite-cache'
import { SpriteKey } from '../../renderer/sprites'
import { passThroughTick } from '../systems/effect-definition'
import type {
  EffectDefinition,
  EffectTickContext,
  EffectTickResult,
} from '../systems/effect-definition'

// Shared strike effect (telegraph → falling sprite → AoE impact) behind
// Meteorite, Meteor, and their shower ultimates. The effect's kind picks the
// sprite; tuning (damage, radius, delay) arrives via the factories.

export function createMeteoriteEffect(
  targetPos: Vec2,
  damage: number,
  aoeRadius: number,
  delay: number
): MeteorStrikeEffect {
  return {
    id: uid(),
    kind: EffectKind.meteoriteStrike,
    pos: { ...targetPos },
    elapsed: 0,
    duration: delay,
    delay,
    damage,
    aoeRadius,
  }
}

export function createMeteorEffect(
  targetPos: Vec2,
  damage: number,
  aoeRadius: number,
  delay: number
): MeteorStrikeEffect {
  return {
    id: uid(),
    kind: EffectKind.meteorStrike,
    pos: { ...targetPos },
    elapsed: 0,
    duration: delay,
    delay,
    damage,
    aoeRadius,
  }
}

function tickMeteorStrike(effect: MeteorStrikeEffect, ctx: EffectTickContext): EffectTickResult {
  if (effect.elapsed < effect.delay) {
    return passThroughTick(effect, ctx)
  }

  const { enemies, scoreGained, killedEnemies } = applyMeteorDamage(ctx.enemies, effect)
  return {
    effect: null,
    enemies,
    projectiles: ctx.projectiles,
    particles: spawnExplosionParticles(effect.pos, 16, '#ff6633'),
    scoreGained,
    killedEnemies,
  }
}

function applyMeteorDamage(
  enemies: Enemy[],
  strike: MeteorStrikeEffect
): { enemies: Enemy[]; scoreGained: number; killedEnemies: Enemy[] } {
  let scoreGained = 0
  const surviving: Enemy[] = []
  const killedEnemies: Enemy[] = []

  for (const enemy of enemies) {
    const dist = distance(enemy.pos, strike.pos)
    // Invincible enemies (shielded boss) are unaffected by the strike.
    if (dist < strike.aoeRadius && canEnemyTakeDamage(enemy, enemies)) {
      const damaged = applyDamageToEnemy(enemy, strike.damage)
      if (damaged.hp <= 0) {
        scoreGained += enemy.scoreValue
        killedEnemies.push(enemy)
      } else {
        surviving.push(damaged)
      }
    } else {
      surviving.push(enemy)
    }
  }

  return { enemies: surviving, scoreGained, killedEnemies }
}

// Seconds before impact that a meteor's warning + falling sprite appear. With a
// staggered volley (Comet/Meteor Shower) each strike has a different delay, so
// capping the visible lead makes the telegraphs pop in the order the meteors
// land instead of all at once. Single strikes (delay ≤ lead) are unaffected.
const METEOR_TELEGRAPH_LEAD = 0.6

// Telegraph visibility + a 0→1 ramp over the lead window (or the full delay when
// the delay is shorter than the lead).
function meteorTelegraph(strike: MeteorStrikeEffect): { visible: boolean; progress: number } {
  if (strike.elapsed >= strike.delay) return { visible: false, progress: 1 }
  const window = Math.min(strike.delay, METEOR_TELEGRAPH_LEAD)
  const start = strike.delay - window
  if (strike.elapsed < start) return { visible: false, progress: 0 }
  return { visible: true, progress: (strike.elapsed - start) / window }
}

function renderMeteorWarning(
  ctx: CanvasRenderingContext2D,
  strike: MeteorStrikeEffect,
  camera: Camera
): void {
  const telegraph = meteorTelegraph(strike)
  if (!telegraph.visible) return
  const screen = worldToScreen(strike.pos, camera)
  const progress = telegraph.progress

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
  const telegraph = meteorTelegraph(strike)
  if (!telegraph.visible) return
  const screen = worldToScreen(strike.pos, camera)
  const progress = telegraph.progress

  const spriteKey =
    strike.kind === EffectKind.meteoriteStrike ? SpriteKey.meteorite : SpriteKey.meteor
  const size = getSpriteSize(spriteKey)
  const meteorY = screen.y - 400 * (1 - progress)

  ctx.save()
  // Flame wake trailing the descent — fading embers above the falling rock.
  for (let i = 1; i <= 5; i++) {
    const trailY = meteorY - i * 9
    const a = (0.5 + progress * 0.5) * (1 - i / 6) * 0.6
    const r = Math.max(1, (size.w / 2) * (1 - i / 8))
    ctx.fillStyle = i % 2 === 0 ? `rgba(255, 150, 70, ${a})` : `rgba(255, 95, 45, ${a})`
    ctx.beginPath()
    ctx.arc(screen.x + Math.sin(strike.elapsed * 20 + i) * 2, trailY, r, 0, Math.PI * 2)
    ctx.fill()
  }
  ctx.globalAlpha = 0.5 + progress * 0.5
  ctx.drawImage(sprites[spriteKey], screen.x - size.w / 2, meteorY - size.h / 2)
  ctx.restore()
}

// Registered for BOTH meteoriteStrike and meteorStrike in EFFECT_DEFINITIONS.
export const meteorStrikeEffect: EffectDefinition = {
  tick: (effect, ctx) => tickMeteorStrike(effect as MeteorStrikeEffect, ctx),
  renderBack: (ctx, effect, camera) =>
    renderMeteorWarning(ctx, effect as MeteorStrikeEffect, camera),
  renderFront: (ctx, effect, camera, sprites) =>
    renderMeteorProjectile(ctx, effect as MeteorStrikeEffect, camera, sprites),
}
