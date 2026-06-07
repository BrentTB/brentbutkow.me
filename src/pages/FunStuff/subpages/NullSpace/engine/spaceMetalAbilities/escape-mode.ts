import { EscapeModePhase } from '../types'
import type { SpaceMetalAbility } from './space-metal-ability-definition'
import { SpaceMetalAbilityKind } from './space-metal-ability-definition'
import { IconName } from '../../icon-names'

export const ESCAPE_MODE = {
  cost: 2,
  chargeDuration: 0.8,
  dashDuration: 1.5,
  chargeSpeedMultiplier: 0.5,
  dashSpeedMultiplier: 5,
  trailInterval: 0.01,
  trailColor: '#ff4400',
  trailLifetime: 1,
  trailSize: 8,
} as const

export const escapeDash: SpaceMetalAbility = {
  kind: SpaceMetalAbilityKind.escapeDash,
  meta: { icon: IconName.escape, label: 'Escape' },
  cost: ESCAPE_MODE.cost,
  hotkey: 'G',
  canActivate: (s) => s.spaceMetal >= ESCAPE_MODE.cost && s.ship.escapeMode === null,
  canUse: (ui) => ui.spaceMetal >= ESCAPE_MODE.cost && !ui.escapeModeActive,
  activate: (s) => {
    const v = s.ship.vel
    const len = Math.hypot(v.x, v.y)
    const heading = len > 0.01 ? { x: v.x / len, y: v.y / len } : s.ship.lastHeading
    return {
      ...s,
      spaceMetal: s.spaceMetal - ESCAPE_MODE.cost,
      ship: {
        ...s.ship,
        escapeMode: {
          phase: EscapeModePhase.charge,
          timer: ESCAPE_MODE.chargeDuration,
          heading,
        },
      },
    }
  },
}
