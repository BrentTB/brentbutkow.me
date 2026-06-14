import { ANIMATION, SHIELD_COOLDOWN } from '../../data'
import type { Enemy } from '../types'

// White damage-flash, throttled: only re-trigger once the cooldown has elapsed,
// so an enemy under continuous damage (DOT, Event Horizon) pulses white now and
// then instead of staying pinned solid white. While throttled, leave the current
// (decaying) flash alone. Cooldown counts down in updateEnemyMovement.
function damageFlash(enemy: Enemy): Pick<Enemy, 'hitFlash' | 'hitFlashCooldown'> {
  return enemy.hitFlashCooldown > 0
    ? { hitFlash: enemy.hitFlash, hitFlashCooldown: enemy.hitFlashCooldown }
    : { hitFlash: ANIMATION.hitFlash, hitFlashCooldown: ANIMATION.hitFlashThrottle }
}

// Applies damage to an enemy, mirroring applyDamageToShip: a shield-modifier
// enemy absorbs into its shield first (resetting the shield's regen cooldown),
// then overflows the rest to HP. Enemies without a shield just take HP damage.
// Pure — the caller still reads `.hp <= 0` to detect a kill. Boss invincibility
// is gated separately by canEnemyTakeDamage; this only runs once damage lands.
export function applyDamageToEnemy(enemy: Enemy, damage: number): Enemy {
  if (damage <= 0) return enemy
  const s = enemy.enemyShield
  if (!s) return { ...enemy, hp: enemy.hp - damage, ...damageFlash(enemy) }

  const shieldAbsorb = Math.min(s.shield, damage)
  const hpDamage = damage - shieldAbsorb
  return {
    ...enemy,
    enemyShield:
      shieldAbsorb > 0
        ? { ...s, shield: s.shield - shieldAbsorb, cooldownRemaining: SHIELD_COOLDOWN }
        : s,
    hp: enemy.hp - hpDamage,
    // Flash only on HP damage — a shield absorb reads via its ring instead.
    ...(hpDamage > 0 ? damageFlash(enemy) : null),
  }
}
