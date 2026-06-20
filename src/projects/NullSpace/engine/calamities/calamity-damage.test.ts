import { describe, it, expect } from 'vitest'
import { applyRadialDamage } from './calamity-damage'
import { createAlly, createEnemy, createShip } from '../entities/entity-creator'
import { EnemyKind, ShipKind } from '../types'
import type { Vec2 } from '../types'
import { WORLD_SIZE } from '../../data'

const CENTER = { x: WORLD_SIZE.x / 2, y: WORLD_SIZE.y / 2 }
const flat = (amount: number) => (): number => amount

const shipAt = (pos: Vec2) => ({ ...createShip(ShipKind.fighter, WORLD_SIZE), pos: { ...pos } })
const enemyAt = (pos: Vec2) => ({
  ...createEnemy(EnemyKind.drone, { ...pos }),
  hp: 200,
  maxHp: 200,
})

describe('applyRadialDamage', () => {
  it('damages ship, enemy, and ally inside the radius', () => {
    const ship = shipAt(CENTER)
    const enemy = enemyAt({ x: CENTER.x + 20, y: CENTER.y })
    const ally = { ...createAlly({ x: CENTER.x - 20, y: CENTER.y }), hp: 200, maxHp: 200 }
    const r = applyRadialDamage(CENTER, 0, 100, flat(20), ship, [enemy], [ally], '#fff')
    expect(r.ship.shield + r.ship.hp).toBe(ship.shield + ship.hp - 20)
    expect(r.enemies[0].hp).toBe(200 - 20)
    expect(r.allies[0].hp).toBe(200 - 20)
  })

  it('skips entities beyond the outer radius', () => {
    const ship = shipAt(CENTER)
    const enemy = enemyAt({ x: CENTER.x + 300, y: CENTER.y })
    const r = applyRadialDamage(CENTER, 0, 100, flat(20), ship, [enemy], [], '#fff')
    expect(r.enemies[0].hp).toBe(200) // untouched
  })

  it('spares entities inside the inner radius — an annulus, not a solid disc', () => {
    const ship = shipAt(CENTER) // dead centre, inside the hole
    const enemy = enemyAt({ x: CENTER.x + 80, y: CENTER.y }) // within the ring
    const r = applyRadialDamage(CENTER, 50, 120, flat(20), ship, [enemy], [], '#fff')
    expect(r.ship.shield + r.ship.hp).toBe(ship.shield + ship.hp) // spared
    expect(r.enemies[0].hp).toBe(200 - 20) // hit
  })

  it('returns enemies dropped to 0 hp as killed, removed from survivors', () => {
    const ship = shipAt({ x: 0, y: 0 }) // far from the blast
    const enemy = enemyAt(CENTER)
    const r = applyRadialDamage(CENTER, 0, 100, flat(999), ship, [enemy], [], '#fff')
    expect(r.enemies).toHaveLength(0)
    expect(r.killedEnemies).toHaveLength(1)
  })
})
