import { describe, it, expect, beforeEach } from 'vitest'
import { createEnemy, createShip } from '../entities/entity-creator'
import { applyDamageToEnemy } from '../entities/enemy-damage'
import { resolveEnemyShipCollisions } from '../systems/combat'
import { updateBossAI } from './boss-ai'
import { scaleEnemy } from '../world/enemy-scaling'
import {
  VOID_WORM,
  VOID_WORM_BOSS,
  WormStage,
  miniWormsFromSegmentDeaths,
  orphanedSegmentIds,
} from './void-worm'
import { getBossRuntime } from './boss-definition'
import { EnemyKind, ShipKind } from '../types'
import type { Enemy } from '../types'
import { ENEMY_STATS, WORLD_SIZE, WORM_CONTACT_IFRAME } from '../../data'
import { rng } from '../math/random'

beforeEach(() => {
  rng.reseed(42)
})

const CENTER = { x: 1500, y: 1500 }
const CTX = { shipPos: { x: 2200, y: 1500 }, worldSize: WORLD_SIZE }

// Head + its full segment chain, already spawned and linked in order.
function spawnedWorm(ctx = CTX): { head: Enemy; segments: Enemy[] } {
  const head = createEnemy(EnemyKind.voidWorm, CENTER)
  const result = updateBossAI([head], 0.016, ctx)
  const updatedHead = result.enemies.find((e) => e.kind === EnemyKind.voidWorm)!
  return { head: updatedHead, segments: result.newEnemies }
}

function dist(a: { x: number; y: number }, b: { x: number; y: number }): number {
  return Math.hypot(a.x - b.x, a.y - b.y)
}

// Narrowed worm runtime — these tests only build void-worm bosses.
const wormState = (e: Enemy) => getBossRuntime(e, EnemyKind.voidWorm)!

describe('Void Worm — spawn', () => {
  it('initialises worm runtime in the cruise stage', () => {
    const head = createEnemy(EnemyKind.voidWorm, CENTER)
    expect(head.boss).toBeDefined()
    expect(wormState(head).stage).toBe(WormStage.cruise)
  })

  it('first tick spawns the full segment chain, linked in order', () => {
    const { head, segments } = spawnedWorm()
    expect(segments).toHaveLength(VOID_WORM.segmentCount)
    expect(segments.every((s) => s.kind === EnemyKind.wormSegment)).toBe(true)
    expect(head.boss!.linkedIds).toEqual(segments.map((s) => s.id))
  })
})

describe('Void Worm — depth scaling', () => {
  // Segments spawned by a worm that arrived on the given wave.
  function segmentsAtWave(spawnWave: number): Enemy[] {
    const base = createEnemy(EnemyKind.voidWorm, CENTER)
    const head = { ...base, boss: { ...wormState(base), spawnWave } }
    return updateBossAI([head], 0.016, CTX).newEnemies
  }

  it('spawns a longer body the later it appears', () => {
    expect(segmentsAtWave(0)).toHaveLength(VOID_WORM.segmentCount) // tier 1
    expect(segmentsAtWave(27)).toHaveLength(
      VOID_WORM.segmentCount + 2 * VOID_WORM.segmentsPerTier // tier 3
    )
  })

  it('caps the segment count', () => {
    expect(segmentsAtWave(9999)).toHaveLength(VOID_WORM.maxSegments)
  })

  it('hpBarValue scales the segment denominator with the wave-scaled encounter', () => {
    const head = scaleEnemy(createEnemy(EnemyKind.voidWorm, CENTER), 18)
    const { enemies, newEnemies } = updateBossAI([head], 0.016, CTX)
    const liveHead = enemies.find((e) => e.kind === EnemyKind.voidWorm)!
    const bar = VOID_WORM_BOSS.hpBarValue!(liveHead, [liveHead, ...newEnemies])
    const segMax = newEnemies.reduce((sum, e) => sum + e.maxHp, 0)
    expect(bar.maxHp).toBeCloseTo(liveHead.maxHp + segMax, 3)
    expect(bar.hp).toBeCloseTo(bar.maxHp, 3) // full health at spawn
  })
})

describe('Void Worm — chain positioning', () => {
  // Ship parked on the head: the head holds still, so the chain pins (computed
  // from the pre-move head position, one tick behind like the Dreadnought
  // ring) are exact and spacing can be asserted tightly.
  const HOLD_CTX = { shipPos: CENTER, worldSize: WORLD_SIZE }

  it('holds every alive segment at segmentSpacing behind its leader', () => {
    const { head, segments } = spawnedWorm(HOLD_CTX)
    const result = updateBossAI([head, ...segments], 0.016, HOLD_CTX)

    const moved = result.enemies.find((e) => e.kind === EnemyKind.voidWorm)!
    let leader = moved.pos
    for (const id of moved.boss!.linkedIds) {
      const seg = result.enemies.find((e) => e.id === id)!
      expect(dist(leader, seg.pos)).toBeCloseTo(VOID_WORM.segmentSpacing, 5)
      leader = seg.pos
    }
  })

  // The capsule sprite is rotated by vel, so each segment must face its leader
  // for the body to read as one connected tube.
  it('orients each segment toward its leader via vel', () => {
    const { head, segments } = spawnedWorm(HOLD_CTX)
    const result = updateBossAI([head, ...segments], 0.016, HOLD_CTX)

    const moved = result.enemies.find((e) => e.kind === EnemyKind.voidWorm)!
    let leader = moved.pos
    for (const id of moved.boss!.linkedIds) {
      const seg = result.enemies.find((e) => e.id === id)!
      const d = dist(leader, seg.pos)
      expect(seg.vel.x).toBeCloseTo((leader.x - seg.pos.x) / d, 5)
      expect(seg.vel.y).toBeCloseTo((leader.y - seg.pos.y) / d, 5)
      leader = seg.pos
    }
  })

  // The worm "shortens and rejoins": a dead middle segment leaves no gap — the
  // follower chains to the previous alive piece on the next tick.
  it('closes the gap when a middle segment dies', () => {
    const { head, segments } = spawnedWorm(HOLD_CTX)
    // Settle the chain into a line behind the head.
    let enemies = updateBossAI([head, ...segments], 0.016, HOLD_CTX).enemies

    // Kill the third segment (combat removes dead enemies from the array).
    const deadId = head.boss!.linkedIds[2]
    enemies = enemies.filter((e) => e.id !== deadId)
    const result = updateBossAI(enemies, 0.016, HOLD_CTX)

    const moved = result.enemies.find((e) => e.kind === EnemyKind.voidWorm)!
    const aliveIds = moved.boss!.linkedIds.filter((id) => result.enemies.some((e) => e.id === id))
    expect(aliveIds).toHaveLength(VOID_WORM.segmentCount - 1)
    let leader = moved.pos
    for (const id of aliveIds) {
      const seg = result.enemies.find((e) => e.id === id)!
      expect(dist(leader, seg.pos)).toBeCloseTo(VOID_WORM.segmentSpacing, 5)
      leader = seg.pos
    }
  })
})

describe('Void Worm — head damage', () => {
  it('shields the head (reduced damage) while any segment is alive', () => {
    const { head, segments } = spawnedWorm()
    const moved = updateBossAI([head, ...segments], 0.016, CTX).enemies.find(
      (e) => e.kind === EnemyKind.voidWorm
    )!
    expect(moved.shieldDamageMult).toBe(VOID_WORM.shieldedDamageMult)
    expect(moved.shieldDamageMult).toBeLessThan(1)
  })

  it('exposes the head (full damage) once every segment is dead', () => {
    const { head, segments } = spawnedWorm()
    const dead = segments.map((s) => ({ ...s, hp: 0 }))
    const moved = updateBossAI([head, ...dead], 0.016, CTX).enemies.find(
      (e) => e.kind === EnemyKind.voidWorm
    )!
    expect(moved.shieldDamageMult).toBe(1)
  })

  it('takes reduced damage from a hit while shielded, full once exposed', () => {
    // No enemy-shield on the head, so the multiplier shows directly in HP lost.
    const head = { ...spawnedWorm().head, enemyShield: undefined }
    const shielded = applyDamageToEnemy(
      { ...head, shieldDamageMult: VOID_WORM.shieldedDamageMult },
      100
    )
    const exposed = applyDamageToEnemy({ ...head, shieldDamageMult: 1 }, 100)
    expect(head.hp - shielded.hp).toBeCloseTo(100 * VOID_WORM.shieldedDamageMult)
    expect(head.hp - exposed.hp).toBeCloseTo(100)
  })
})

describe('Void Worm — attack cycle', () => {
  it('cruise moves the head toward the ship', () => {
    const { head, segments } = spawnedWorm()
    const before = dist(head.pos, CTX.shipPos)
    const result = updateBossAI([head, ...segments], 0.1, CTX)
    const moved = result.enemies.find((e) => e.kind === EnemyKind.voidWorm)!
    expect(dist(moved.pos, CTX.shipPos)).toBeLessThan(before)
  })

  it('cruise hands off to windup, which stalls the head while keeping it aimed', () => {
    let { head } = spawnedWorm()
    head = { ...head, boss: { ...wormState(head), stageTimer: 0.001 } }
    const result = updateBossAI([head], 0.016, CTX)
    const moved = result.enemies.find((e) => e.kind === EnemyKind.voidWorm)!
    expect(wormState(moved).stage).toBe(WormStage.windup)

    const stalled = updateBossAI([moved], 0.016, CTX).enemies[0]
    // Tiny vel along the aim — the head sprite uses vel to face the ship
    // during the tell, but the position must not meaningfully advance.
    expect(Math.hypot(stalled.vel.x, stalled.vel.y)).toBeLessThan(0.01)
    expect(stalled.vel.x).toBeGreaterThan(0)
  })

  it('charge lunges at full speed, curving to track the ship', () => {
    let { head } = spawnedWorm()
    head = {
      ...head,
      boss: {
        ...wormState(head),
        stage: WormStage.windup,
        stageTimer: 0.001,
        heading: { x: 1, y: 0 },
      },
    }
    // Windup expires: heading re-aims at the ship (due +x) and the charge begins.
    let result = updateBossAI([head], 0.016, CTX)
    let moved = result.enemies.find((e) => e.kind === EnemyKind.voidWorm)!
    expect(wormState(moved).stage).toBe(WormStage.charge)
    const startHeading = wormState(moved).heading

    // Ship dodges hard to the side mid-charge — the lunge now CURVES to follow it
    // (capped) instead of committing to the locked line a sidestep would beat.
    const dodgedCtx = { ...CTX, shipPos: { x: CTX.shipPos.x, y: CTX.shipPos.y + 600 } }
    result = updateBossAI([moved], 0.05, dodgedCtx)
    moved = result.enemies.find((e) => e.kind === EnemyKind.voidWorm)!
    const curved = wormState(moved).heading
    expect(curved).not.toEqual(startHeading) // it tracked the dodge
    expect(curved.y).toBeGreaterThan(0) // bent toward where the ship went
    expect(curved.x).toBeGreaterThan(curved.y) // but capped — it didn't snap onto it
    expect(Math.hypot(curved.x, curved.y)).toBeCloseTo(1) // still a unit heading
    expect(Math.hypot(moved.vel.x, moved.vel.y)).toBeCloseTo(VOID_WORM.chargeSpeed)
  })

  it('charge returns to cruise when its timer expires', () => {
    let { head } = spawnedWorm()
    head = {
      ...head,
      boss: {
        ...wormState(head),
        stage: WormStage.charge,
        stageTimer: 0.001,
        heading: { x: 1, y: 0 },
      },
    }
    const result = updateBossAI([head], 0.016, CTX)
    const moved = result.enemies.find((e) => e.kind === EnemyKind.voidWorm)!
    expect(wormState(moved).stage).toBe(WormStage.cruise)
  })
})

describe('Void Worm — aggregate HP bar', () => {
  it('sums head + alive segment HP, with a stable maxHp as segments die', () => {
    const { head, segments } = spawnedWorm()
    const all = [head, ...segments]
    const full = VOID_WORM_BOSS.hpBarValue!(head, all)
    expect(full.hp).toBe(head.hp + VOID_WORM.segmentCount * ENEMY_STATS.wormSegment.hp)
    expect(full.maxHp).toBe(head.maxHp + VOID_WORM.segmentCount * ENEMY_STATS.wormSegment.hp)

    // Two segments destroyed: hp drops, maxHp holds.
    const culled = [head, ...segments.slice(2)]
    const partial = VOID_WORM_BOSS.hpBarValue!(head, culled)
    expect(partial.hp).toBe(full.hp - 2 * ENEMY_STATS.wormSegment.hp)
    expect(partial.maxHp).toBe(full.maxHp)
  })
})

describe('Void Worm — cruise stays in world bounds', () => {
  // Regression: cruise used homeTowardTarget without clamping. With
  // MovementBehavior.none the worm owns its position, so a ship kited to the
  // world edge dragged the head off the playfield. Charge already clamped.
  it('clamps cruise position when the ship sits outside the world', () => {
    const head = createEnemy(EnemyKind.voidWorm, { x: 40, y: 1500 })
    const offMapCtx = { shipPos: { x: -800, y: 1500 }, worldSize: WORLD_SIZE }
    let current: Enemy = head
    for (let i = 0; i < 30; i++) {
      const result = updateBossAI([current], 0.5, offMapCtx)
      current = result.enemies.find((e) => e.kind === EnemyKind.voidWorm)!
    }
    expect(current.pos.x).toBeGreaterThanOrEqual(0)
    expect(current.pos.x).toBeLessThanOrEqual(WORLD_SIZE.x)
    expect(current.pos.y).toBeGreaterThanOrEqual(0)
    expect(current.pos.y).toBeLessThanOrEqual(WORLD_SIZE.y)
  })
})

describe('VOID_WORM_BOSS onDeath', () => {
  it('drops 2–4 space metal collectibles', () => {
    const head = createEnemy(EnemyKind.voidWorm, CENTER)
    const drops = VOID_WORM_BOSS.onDeath!(head)
    expect(drops.length).toBeGreaterThanOrEqual(2)
    expect(drops.length).toBeLessThanOrEqual(4)
  })
})

describe('Void Worm — mini worms from segment deaths', () => {
  // Run the helper after killing `kill` segments (indices in the spawned chain),
  // with `alreadyDead` earlier segments already gone from the field.
  function killAndSpawn(opts: { kill: number[]; alreadyDead?: number[] }) {
    const { head, segments } = spawnedWorm()
    const dead = new Set(opts.alreadyDead ?? [])
    const killSet = new Set(opts.kill)
    const killedThisFrame = opts.kill.map((i) => ({ ...segments[i], hp: 0 }))
    const enemies: Enemy[] = [head, ...segments.filter((_, i) => !dead.has(i) && !killSet.has(i))]
    return miniWormsFromSegmentDeaths(killedThisFrame, enemies)
  }

  it('spawns one mini worm per death while over half the body remains', () => {
    expect(killAndSpawn({ kill: [0] })).toHaveLength(1) // death #1 of 8
  })

  it('spawns two per death once half or fewer segments remain', () => {
    // 4 of 8 already dead → killing the 5th is past the halfway mark.
    expect(killAndSpawn({ kill: [4], alreadyDead: [0, 1, 2, 3] })).toHaveLength(2)
  })

  it('classifies each death in a multi-kill blast by its own index', () => {
    // Kill the first 5 at once: deaths 1–4 give one each, death 5 gives two = 6.
    expect(killAndSpawn({ kill: [0, 1, 2, 3, 4] })).toHaveLength(6)
  })

  it('spawns mini worms at the dead segment position', () => {
    const { head, segments } = spawnedWorm()
    const killed = [{ ...segments[0], hp: 0 }]
    const spawns = miniWormsFromSegmentDeaths(killed, [head, ...segments.slice(1)])
    expect(spawns[0].pos.x).toBeCloseTo(segments[0].pos.x, 0)
    expect(spawns[0].pos.y).toBeCloseTo(segments[0].pos.y, 0)
  })

  it('carries the worm spawn wave onto each mini worm', () => {
    const base = createEnemy(EnemyKind.voidWorm, CENTER)
    const head = { ...base, boss: { ...wormState(base), spawnWave: 18 } }
    const { newEnemies: segments } = updateBossAI([head], 0.016, CTX)
    const spawns = miniWormsFromSegmentDeaths(
      [{ ...segments[0], hp: 0 }],
      [head, ...segments.slice(1)]
    )
    expect(spawns.every((s) => s.spawnWave === 18)).toBe(true)
  })

  it('ignores non-segment kills', () => {
    const drone = createEnemy(EnemyKind.drone, CENTER)
    expect(miniWormsFromSegmentDeaths([{ ...drone, hp: 0 }], [drone])).toHaveLength(0)
  })

  it('the spawned kind is a finite, lunging enemy that never expires', () => {
    const mini = createEnemy(EnemyKind.miniVoidWorm, CENTER)
    expect(mini.movementBehavior).toBe('dash')
    expect(mini.damage).toBeGreaterThan(0)
    expect(mini.expiresIn).toBeUndefined()
  })
})

describe('Void Worm — body contact i-frame', () => {
  function shipAt(pos: { x: number; y: number }) {
    return { ...createShip(ShipKind.fighter, WORLD_SIZE), pos, shield: 0 }
  }

  it('caps a lunge through the head and several segments to a single hit', () => {
    const head = createEnemy(EnemyKind.voidWorm, CENTER)
    const segs = [0, 1, 2].map(() => createEnemy(EnemyKind.wormSegment, CENTER))
    const ship = shipAt(CENTER)
    const result = resolveEnemyShipCollisions([head, ...segs], ship)
    // Only the first worm part lands; the rest are absorbed by the i-frame.
    expect(ship.hp - result.ship.hp).toBe(ENEMY_STATS.voidWorm.damage)
    expect(result.ship.wormContactCooldown).toBe(WORM_CONTACT_IFRAME)
  })

  it('deals no contact damage while the i-frame is still active', () => {
    const seg = createEnemy(EnemyKind.wormSegment, CENTER)
    const ship = { ...shipAt(CENTER), wormContactCooldown: 0.5 }
    const result = resolveEnemyShipCollisions([seg], ship)
    expect(result.ship.hp).toBe(ship.hp)
  })
})

describe('Void Worm — head death culls the body', () => {
  it('marks every linked segment for culling when the head dies', () => {
    const { head, segments } = spawnedWorm()
    const ids = orphanedSegmentIds([{ ...head, hp: 0 }])
    expect(ids.size).toBe(segments.length)
    expect(segments.every((s) => ids.has(s.id))).toBe(true)
  })

  it('culls nothing when only a body segment died', () => {
    const { segments } = spawnedWorm()
    expect(orphanedSegmentIds([{ ...segments[0], hp: 0 }]).size).toBe(0)
  })
})
