import { describe, it, expect } from 'vitest'
import { charmTargets, countCharmed, EMPTY_CHARM } from './charm'
import { createAlly, createCharmedAlly, createEnemy } from '../../entities/entity-creator'
import { EnemyKind } from '../../types'

describe('charmTargets', () => {
  it('no-ops with no slots — same shape the caller treats as "spend nothing"', () => {
    const targets = [createEnemy(EnemyKind.drone, { x: 0, y: 0 })]
    expect(charmTargets(targets, 0, 0)).toBe(EMPTY_CHARM)
  })

  it('no-ops with no targets', () => {
    expect(charmTargets([], 0, 5)).toBe(EMPTY_CHARM)
  })

  it('charms up to `slots` targets, off the front', () => {
    const targets = [10, 20, 30, 40].map((x) => createEnemy(EnemyKind.swarm, { x, y: 0 }))
    const result = charmTargets(targets, 0, 2)
    expect(result.allies).toHaveLength(2)
    expect(result.consumedEnemyIds).toEqual([targets[0].id, targets[1].id])
  })

  it('grants the bonus survival HP to each charmed ally', () => {
    const enemy = createEnemy(EnemyKind.tank, { x: 0, y: 0 })
    const result = charmTargets([enemy], 30, 1)
    expect(result.allies[0].hp).toBe(enemy.hp + 30)
  })
})

describe('countCharmed', () => {
  it('counts only charmed units (charmedFrom set), not plain helpers', () => {
    const enemy = createEnemy(EnemyKind.drone, { x: 0, y: 0 })
    const allies = [createAlly({ x: 0, y: 0 }), createCharmedAlly(enemy), createCharmedAlly(enemy)]
    expect(countCharmed(allies)).toBe(2)
  })

  it('is zero with no charmed units', () => {
    expect(countCharmed([createAlly({ x: 0, y: 0 })])).toBe(0)
  })
})
