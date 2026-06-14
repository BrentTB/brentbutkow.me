import { STAT_SCALING } from '../../data'
import type { Enemy } from '../types'

// Multipliers applied to an enemy's HP and contact damage for a given wave. HP
// climbs steeply (so enemies endure late-game burst), damage gently — both
// capped. Wave 1 is ×1.0.
export function waveStatScale(wave: number): { hp: number; damage: number } {
  const steps = Math.max(0, wave - 1)
  return {
    hp: Math.min(STAT_SCALING.hpMax, 1 + STAT_SCALING.hpPerWave * steps),
    damage: Math.min(STAT_SCALING.damageMax, 1 + STAT_SCALING.damagePerWave * steps),
  }
}

// Scales a freshly-created enemy's HP and contact damage for the wave it spawns
// in. Bosses are scripted encounters tuned by hand, so they pass through
// untouched. Applied at spawn, before any modifier roll.
export function scaleEnemy(enemy: Enemy, wave: number): Enemy {
  if (enemy.boss) return enemy
  const mult = waveStatScale(wave)
  return {
    ...enemy,
    hp: enemy.hp * mult.hp,
    maxHp: enemy.maxHp * mult.hp,
    damage: enemy.damage * mult.damage,
  }
}
