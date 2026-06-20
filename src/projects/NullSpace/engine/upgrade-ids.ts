import { METEORITE_UPGRADE_IDS } from './abilities/meteorite'
import { METEOR_UPGRADE_IDS } from './abilities/meteor'
import { BLACK_HOLE_UPGRADE_IDS } from './abilities/black-hole'
import { ROCKET_UPGRADE_IDS } from './abilities/rocket'
import { SHIELD_UPGRADE_IDS } from './abilities/shield'
import { SUN_UPGRADE_IDS } from './abilities/sun'
import { HELPER_UPGRADE_IDS } from './abilities/helper'
import { TELEKINESIS_UPGRADE_IDS } from './abilities/telekinesis'
import { SOLAR_FLARE_UPGRADE_IDS } from './abilities/solar-flare'
import { COMET_SHOWER_UPGRADE_IDS } from './abilities/comet-shower'
import { METEOR_SHOWER_UPGRADE_IDS } from './abilities/meteor-shower'
import { HELPER_FACTORY_UPGRADE_IDS } from './abilities/helper-factory'
import { SUPERNOVA_UPGRADE_IDS } from './abilities/supernova'
import { FORCE_FIELD_UPGRADE_IDS } from './abilities/force-field'
import { FIREWORKS_UPGRADE_IDS } from './abilities/fireworks'
import { EVENT_HORIZON_UPGRADE_IDS } from './abilities/event-horizon'
import { SOLAR_PLAGUE_UPGRADE_IDS } from './abilities/solar-plague'
import { SINGULARITY_UPGRADE_IDS } from './abilities/singularity'
import { RADIATION_UPGRADE_IDS } from './abilities/radiation'
import { MELTDOWN_UPGRADE_IDS } from './abilities/meltdown'
import { CHAIN_LIGHTNING_UPGRADE_IDS } from './abilities/chain-lightning'
import { ION_STORM_UPGRADE_IDS } from './abilities/ion-storm'
import { LASER_UPGRADE_IDS } from './weapons/laser'
import { MISSILE_UPGRADE_IDS } from './weapons/missile'
import { RICOCHET_UPGRADE_IDS } from './weapons/ricochet'
import { NUKE_UPGRADE_IDS } from './weapons/nuke'
import { SHIP_AND_POWER_UPGRADE_IDS } from './upgrades'

// Every feature file (ability, helper weapon, ship/power upgrades) declares its
// own upgrade ids next to its UpgradeDefinitions; this module merges them into
// the global UpgradeId const + union. Adding a feature means adding its ids
// block in its own file and one spread here — types.ts never changes.
// (types.ts imports the TYPE only, so there is no runtime import cycle.)
export const UpgradeId = {
  ...METEORITE_UPGRADE_IDS,
  ...METEOR_UPGRADE_IDS,
  ...BLACK_HOLE_UPGRADE_IDS,
  ...ROCKET_UPGRADE_IDS,
  ...SHIELD_UPGRADE_IDS,
  ...SUN_UPGRADE_IDS,
  ...HELPER_UPGRADE_IDS,
  ...TELEKINESIS_UPGRADE_IDS,
  ...SOLAR_FLARE_UPGRADE_IDS,
  ...COMET_SHOWER_UPGRADE_IDS,
  ...METEOR_SHOWER_UPGRADE_IDS,
  ...HELPER_FACTORY_UPGRADE_IDS,
  ...SUPERNOVA_UPGRADE_IDS,
  ...FORCE_FIELD_UPGRADE_IDS,
  ...FIREWORKS_UPGRADE_IDS,
  ...EVENT_HORIZON_UPGRADE_IDS,
  ...SOLAR_PLAGUE_UPGRADE_IDS,
  ...SINGULARITY_UPGRADE_IDS,
  ...RADIATION_UPGRADE_IDS,
  ...MELTDOWN_UPGRADE_IDS,
  ...CHAIN_LIGHTNING_UPGRADE_IDS,
  ...ION_STORM_UPGRADE_IDS,
  ...LASER_UPGRADE_IDS,
  ...MISSILE_UPGRADE_IDS,
  ...RICOCHET_UPGRADE_IDS,
  ...NUKE_UPGRADE_IDS,
  ...SHIP_AND_POWER_UPGRADE_IDS,
} as const
export type UpgradeId = (typeof UpgradeId)[keyof typeof UpgradeId]
