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
// in. Bosses scale on the same curve so a late-game boss (and the body parts
// boss-ai spawns for it) endures and bites harder; the boss also gets its spawn
// wave stamped onto its runtime, which bossTier reads to grow its signature
// mechanic. Applied at spawn, before any modifier roll.
export function scaleEnemy(enemy: Enemy, wave: number): Enemy {
  const mult = waveStatScale(wave)
  const scaled: Enemy = {
    ...enemy,
    hp: enemy.hp * mult.hp,
    maxHp: enemy.maxHp * mult.hp,
    damage: enemy.damage * mult.damage,
  }
  if (enemy.boss) scaled.boss = { ...enemy.boss, spawnWave: wave }
  return scaled
}
