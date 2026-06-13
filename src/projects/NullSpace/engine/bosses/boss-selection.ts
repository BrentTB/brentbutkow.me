import { rng } from '../math/random'
import type { BossSelection, EnemyKind } from '../types'
import { BOSS_KINDS } from './index'

// Boss-wave draw with a per-run unique window: every registered boss appears
// once (random order) before any repeats; after the pool empties, draws are
// uniform over all bosses. nextBoss is always pre-rolled so the dev console
// can show — and override — the upcoming boss.

export function createBossSelection(): BossSelection {
  const pool = [...BOSS_KINDS]
  const nextBoss = pool.splice(rng.intRange(0, pool.length - 1), 1)[0]
  return { nextBoss, pool }
}

// Consumes nextBoss (a boss wave just used it) and rolls the following one.
// The consumed kind is pruned from the pool first so a dev override naming a
// still-pooled boss can't repeat inside the unique window.
export function advanceBossSelection(selection: BossSelection): BossSelection {
  const pool = selection.pool.filter((kind) => kind !== selection.nextBoss)
  if (pool.length > 0) {
    const nextBoss = pool.splice(rng.intRange(0, pool.length - 1), 1)[0]
    return { nextBoss, pool }
  }
  return { nextBoss: drawUniform(), pool }
}

function drawUniform(): EnemyKind {
  return BOSS_KINDS[rng.intRange(0, BOSS_KINDS.length - 1)]
}
