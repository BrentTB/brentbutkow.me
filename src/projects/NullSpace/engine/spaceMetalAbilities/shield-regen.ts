import type { SpaceMetalAbility } from './space-metal-ability-definition'
import { SpaceMetalAbilityKind } from './space-metal-ability-definition'
import { IconName } from '../../icon-names'

export const shieldRegen: SpaceMetalAbility = {
  kind: SpaceMetalAbilityKind.shieldRegen,
  meta: { icon: IconName.shieldRegen, label: 'Shield' },
  cost: 1,
  hotkey: 'F',
  canActivate: (s) => s.spaceMetal >= 1 && s.ship.shield < s.ship.maxShield,
  canUse: (ui) => ui.spaceMetal >= 1 && ui.shipShield < ui.shipMaxShield,
  activate: (s) => ({
    ...s,
    spaceMetal: s.spaceMetal - 1,
    ship: { ...s.ship, shield: s.ship.maxShield, shieldCooldownRemaining: 0 },
  }),
}
