import { EnemyKind } from '../types'
import type { Enemy } from '../types'
import type { BossDefinition } from './boss-definition'
import { DREADNOUGHT_BOSS } from './dreadnought'
import { VOID_WORM_BOSS } from './void-worm'
import { PHASE_SHIFTER_BOSS } from './phase-shifter'

const BOSS_DEFINITIONS: BossDefinition[] = [DREADNOUGHT_BOSS, VOID_WORM_BOSS, PHASE_SHIFTER_BOSS]

// Registered boss kinds, in registry order. Drives boss-wave selection and the
// dev-console picker.
export const BOSS_KINDS: readonly EnemyKind[] = BOSS_DEFINITIONS.map((d) => d.kind)

const BOSS_MAP: Partial<Record<EnemyKind, BossDefinition>> = Object.fromEntries(
  BOSS_DEFINITIONS.map((d) => [d.kind, d])
)

export function isBoss(kind: EnemyKind): boolean {
  return kind in BOSS_MAP
}

export function getBossDefinition(kind: EnemyKind): BossDefinition | undefined {
  return BOSS_MAP[kind]
}

// Single source of truth for "can this enemy be damaged right now". Currently
// only a shielded boss is invincible (its generators alive); future breakable
// shields on regular enemies plug in here so every damage and targeting path
// stays consistent. `enemies` is the current list so the gate can inspect
// linked entities (e.g. the boss's shield generators).
export function canEnemyTakeDamage(enemy: Enemy, enemies: Enemy[]): boolean {
  if (!enemy.boss) return true
  const def = getBossDefinition(enemy.kind)
  return def?.canTakeDamage ? def.canTakeDamage(enemy, enemies) : true
}
