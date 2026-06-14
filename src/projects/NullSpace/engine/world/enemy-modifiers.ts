import { ENEMY_MODIFIERS } from '../../data'
import { rng } from '../math/random'
import { EnemyKind, EnemyModifier } from '../types'
import type { Enemy } from '../types'

// Regular ships that can carry a modifier. Bosses, worm segments, shield
// generators, and swarmers are excluded (a shielded 8-hp swarmer is just noise).
const MODIFIABLE_KINDS: readonly EnemyKind[] = [
  EnemyKind.drone,
  EnemyKind.tank,
  EnemyKind.shooter,
  EnemyKind.bomber,
]

// Probability that an eligible enemy spawns with a modifier on the given wave.
// Zero before startWave, then climbs linearly to a cap.
export function modifierChance(wave: number): number {
  if (wave < ENEMY_MODIFIERS.startWave) return 0
  const grown =
    ENEMY_MODIFIERS.baseChance + ENEMY_MODIFIERS.chancePerWave * (wave - ENEMY_MODIFIERS.startWave)
  return Math.min(ENEMY_MODIFIERS.maxChance, grown)
}

const WEIGHTED: readonly { modifier: EnemyModifier; weight: number }[] = [
  { modifier: EnemyModifier.speed, weight: ENEMY_MODIFIERS.weights.speed },
  { modifier: EnemyModifier.shield, weight: ENEMY_MODIFIERS.weights.shield },
  { modifier: EnemyModifier.giant, weight: ENEMY_MODIFIERS.weights.giant },
]

function pickModifier(): EnemyModifier {
  const total = WEIGHTED.reduce((sum, w) => sum + w.weight, 0)
  let roll = rng.next() * total
  for (const { modifier, weight } of WEIGHTED) {
    roll -= weight
    if (roll < 0) return modifier
  }
  return WEIGHTED[WEIGHTED.length - 1].modifier
}

// Rolls a modifier for a spawning enemy, or undefined for none. Gated on wave
// and kind; the modifier is chosen by weight once the chance roll passes.
export function rollEnemyModifier(kind: EnemyKind, wave: number): EnemyModifier | undefined {
  if (!MODIFIABLE_KINDS.includes(kind)) return undefined
  if (rng.next() >= modifierChance(wave)) return undefined
  return pickModifier()
}

// Stamps a modifier onto an enemy. Sized off the enemy's CURRENT stats, so apply
// this AFTER wave scaling (shield/HP fractions then reflect the scaled values).
export function applyModifier(enemy: Enemy, modifier: EnemyModifier): Enemy {
  switch (modifier) {
    case EnemyModifier.speed:
      return { ...enemy, modifier, speed: enemy.speed * ENEMY_MODIFIERS.speedMult }
    case EnemyModifier.shield: {
      const shield = enemy.maxHp * ENEMY_MODIFIERS.shieldFraction
      return {
        ...enemy,
        modifier,
        enemyShield: {
          shield,
          maxShield: shield,
          regen: ENEMY_MODIFIERS.shieldRegen,
          cooldownRemaining: 0,
        },
      }
    }
    case EnemyModifier.giant: {
      const hp = enemy.hp * ENEMY_MODIFIERS.giantHpMult
      return {
        ...enemy,
        modifier,
        speed: enemy.speed * ENEMY_MODIFIERS.giantSpeedMult,
        radius: enemy.radius * ENEMY_MODIFIERS.giantRadiusMult,
        hp,
        maxHp: enemy.maxHp * ENEMY_MODIFIERS.giantHpMult,
      }
    }
    default: {
      // Exhaustiveness guard — a new EnemyModifier must add a case above.
      const unhandled: never = modifier
      throw new Error(`Unhandled enemy modifier: ${String(unhandled)}`)
    }
  }
}
