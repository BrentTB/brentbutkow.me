import { CURRENCY_DROPS } from '../data'
import { rng } from './random'
import type { Enemy } from './types'

export function computeCurrencyFromKills(killedEnemies: Enemy[]): number {
  let total = 0
  for (const enemy of killedEnemies) {
    const range = CURRENCY_DROPS[enemy.kind]
    if (range) {
      total += rng.intRange(range.min, range.max)
    }
  }
  return total
}
