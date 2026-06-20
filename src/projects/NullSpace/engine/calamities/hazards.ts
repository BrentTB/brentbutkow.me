import { HAZARD } from '../../data'
import { applyRadialDamage } from './calamity-damage'
import { spawnExplosionParticles, uid } from '../entities/entity-creator'
import { toroidalDistance } from '../math/toroid'
import { rng } from '../math/random'
import { HazardKind } from '../types'
import type { Ally, Enemy, Hazard, Particle, Ship, Vec2 } from '../types'

// A single mine at `pos` — the shared shape used by the field, refills, dev tools,
// and the tutorial.
export function createMine(pos: Vec2): Hazard {
  return {
    id: uid(),
    kind: HazardKind.mine,
    pos,
    radius: HAZARD.mineRadius,
    damage: HAZARD.mineDamage,
  }
}

// Tops the mine field back up to HAZARD.mineCount, scattering replacements clear of
// `safeCenter` (so a refill never drops one on the ship). Existing mines are kept —
// only the shortfall is added. Mines are single-use, so a sector thins out as they
// detonate; topping up each wave keeps a field always present.
export function replenishHazardField(
  existing: Hazard[],
  worldSize: Vec2,
  safeCenter: Vec2
): Hazard[] {
  if (existing.length >= HAZARD.mineCount) return existing
  const mines = [...existing]
  let attempts = 0
  while (mines.length < HAZARD.mineCount && attempts < HAZARD.mineCount * 12) {
    attempts++
    const pos = { x: rng.range(0, worldSize.x), y: rng.range(0, worldSize.y) }
    if (toroidalDistance(pos, safeCenter) < HAZARD.forwardMargin) continue
    mines.push(createMine(pos))
  }
  return mines
}

// A fresh mine field scattered across the torus, kept clear of the ship's spawn.
// Thread between them as you fly — Escape Mode dashes through.
export function generateHazardField(worldSize: Vec2, safeCenter: Vec2): Hazard[] {
  return replenishHazardField([], worldSize, safeCenter)
}

export type HazardUpdateResult = {
  hazards: Hazard[]
  ship: Ship
  enemies: Enemy[]
  allies: Ally[]
  killedEnemies: Enemy[]
  particles: Particle[]
}

// A mine detonates the moment any entity — ship, enemy, or ally — touches its
// trigger radius, then is consumed (single-use). Detonation deals blast damage to
// everyone within HAZARD.mineBlastRadius via the shared calamity primitive, so a
// black-holed enemy shoved into a mine takes the hit too. Killed enemies flow back
// to the caller for the normal death pipeline; the ship's Escape-Mode immunity and
// shields are handled inside applyRadialDamage.
export function updateHazards(
  hazards: Hazard[],
  ship: Ship,
  enemies: Enemy[],
  allies: Ally[]
): HazardUpdateResult {
  if (hazards.length === 0) {
    return { hazards, ship, enemies, allies, killedEnemies: [], particles: [] }
  }
  let curShip = ship
  let curEnemies = enemies
  let curAllies = allies
  const surviving: Hazard[] = []
  const killedEnemies: Enemy[] = []
  const particles: Particle[] = []

  for (const mine of hazards) {
    if (!isTriggered(mine, curShip, curEnemies, curAllies)) {
      surviving.push(mine)
      continue
    }
    const blast = applyRadialDamage(
      mine.pos,
      0,
      HAZARD.mineBlastRadius,
      () => mine.damage,
      curShip,
      curEnemies,
      curAllies,
      HAZARD.color
    )
    curShip = blast.ship
    curEnemies = blast.enemies
    curAllies = blast.allies
    killedEnemies.push(...blast.killedEnemies)
    particles.push(...blast.particles, ...spawnExplosionParticles(mine.pos, 14, HAZARD.color))
    // Mine consumed — left out of `surviving`.
  }

  return {
    hazards: surviving,
    ship: curShip,
    enemies: curEnemies,
    allies: curAllies,
    killedEnemies,
    particles,
  }
}

function isTriggered(mine: Hazard, ship: Ship, enemies: Enemy[], allies: Ally[]): boolean {
  const touches = (pos: Vec2, radius: number): boolean =>
    toroidalDistance(mine.pos, pos) < mine.radius + radius
  if (touches(ship.pos, ship.radius)) return true
  if (enemies.some((e) => touches(e.pos, e.radius))) return true
  return allies.some((a) => touches(a.pos, a.radius))
}
