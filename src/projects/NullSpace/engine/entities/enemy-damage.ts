import { ANIMATION, SHIELD_COOLDOWN } from '../../data'
import type { Enemy } from '../types'

// Applies damage to an enemy, mirroring applyDamageToShip: a shield-modifier
// enemy absorbs into its shield first (resetting the shield's regen cooldown),
// then overflows the rest to HP. Enemies without a shield just take HP damage.
// Pure — the caller still reads `.hp <= 0` to detect a kill. Boss invincibility
// is gated separately by canEnemyTakeDamage; this only runs once damage lands.
export function applyDamageToEnemy(enemy: Enemy, damage: number): Enemy {
  if (damage <= 0) return enemy
  const s = enemy.enemyShield
  if (!s) return { ...enemy, hp: enemy.hp - damage, hitFlash: ANIMATION.hitFlash }

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
    hitFlash: hpDamage > 0 ? ANIMATION.hitFlash : enemy.hitFlash,
  }
}
