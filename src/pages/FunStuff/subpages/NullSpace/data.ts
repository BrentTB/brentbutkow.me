import { AbilityKind } from './engine/types'
import type { EnemyKind } from './engine/types'

export const GAME_NAME = 'Null Space'

export const WORLD_SIZE = { x: 3000, y: 3000 }

export const SHIELD_COOLDOWN = 3

// Slingshot (flick the ship). Base values are deliberately weak + wild; the
// ship upgrades (Power / Control / Cadence / Heat Sink) push toward strong,
// precise, fast, and sustainable.
export const SLINGSHOT = {
  baseSpeed: 600, // peak coast speed at full charge (world units/sec)
  baseJitter: 0.38, // ~22° random angular scatter per flick
  minJitter: 0.05, // accuracy floor (~3°)
  baseCooldown: 1, // seconds between flicks
  minCooldown: 0.4, // cadence floor
  // --- Heat: punishes sustained kiting. 0..1; full-charge flicks add the most,
  // tiny precise nudges almost nothing, so small dodges stay sustainable.
  heatPerFling: 0.45, // heat added by a FULL-charge flick (scaled by charge)
  baseCoolRate: 0.09, // heat dissipated per second (raised by Heat Sink)
  maxCoolRate: 0.45, // cooling cap (sanity bound)
  heatReengage: 0.5, // overheat clears only once heat falls back below this
  overheatSlowMult: 0.5, // patrol speed multiplier while overheated
  heatJitterBonus: 0.3, // extra scatter (rad) at full heat — control slips as you heat up
} as const

export const POWER_DEFAULTS = {
  max: 1000,
  regenRate: 3,
  startingPower: 100,
}

// Ability stat constants live in engine/abilities/ability-data.ts. Import from
// there directly.

// Display order for the hotbar AND the shop. Edit this array to reorder.
// Initial order: cheapest → most expensive at base cost (5, 25, 30, 40, 50, 100).
// ABILITY_META, HOLD_ABILITIES, factory tables, and upgrade definitions are all
// derived from per-ability files in engine/abilities/ — import them from there.
export const WEAPON_ORDER: readonly AbilityKind[] = [
  AbilityKind.meteorite,
  AbilityKind.rocket,
  AbilityKind.shield,
  AbilityKind.meteor,
  AbilityKind.blackHole,
  AbilityKind.sun,
  AbilityKind.helper,
  AbilityKind.telekinesis,
  AbilityKind.solarFlare,
  // Ultimates sit at the end — their hotbar slot is inherited from the base
  // they replace, so this position only governs row creation, not display.
  AbilityKind.cometShower,
  AbilityKind.meteorShower,
  AbilityKind.helperFactory,
  AbilityKind.supernova,
  AbilityKind.forceField,
  AbilityKind.fireworks,
  AbilityKind.eventHorizon,
  AbilityKind.solarPlague,
  AbilityKind.singularity,
]

export const ENEMY_STATS = {
  drone: {
    hp: 20,
    speed: 100,
    damage: 8,
    radius: 10,
    scoreValue: 10,
    powerReward: 5,
  },
  tank: {
    hp: 80,
    speed: 40,
    damage: 15,
    radius: 18,
    scoreValue: 30,
    powerReward: 15,
  },
  shooter: {
    hp: 30,
    speed: 50,
    damage: 6,
    radius: 12,
    scoreValue: 20,
    powerReward: 8,
    fireRate: 0.8,
    attackRange: 350,
    projectileDamage: 8,
  },
  swarm: {
    hp: 8,
    speed: 150,
    damage: 3,
    radius: 6,
    scoreValue: 5,
    powerReward: 2,
  },
  bomber: {
    hp: 50,
    speed: 35,
    damage: 5,
    radius: 14,
    scoreValue: 25,
    powerReward: 12,
    explosionDamage: 40,
    explosionRadius: 80,
  },
  dreadnought: {
    hp: 800,
    speed: 50,
    damage: 20,
    radius: 36,
    scoreValue: 500,
    powerReward: 100,
    // Doubles as the standoff distance — the boss approaches the player to here, then holds.
    attackRange: 220,
    // Laser attack. fireRange exceeds the standoff so it shoots from where it
    // holds; projectileSpeed is well under the player laser (800) so it reads as
    // a slow beam the player can slingshot away from.
    fireRate: 0.5,
    fireRange: 480,
    projectileDamage: 12,
    projectileSpeed: 300,
    projectileBeam: true,
  },
  shieldGenerator: {
    hp: 80,
    speed: 0,
    damage: 12,
    radius: 14,
    scoreValue: 50,
    powerReward: 20,
    // Generators fire lasers too — most of the incoming fire — so clearing them
    // is the way to cut the boss fight's pressure down.
    fireRate: 0.25,
    fireRange: 460,
    projectileDamage: 6,
    projectileSpeed: 280,
    projectileBeam: true,
  },
  voidWorm: {
    hp: 150,
    speed: 80,
    damage: 25,
    radius: 24,
    scoreValue: 400,
    powerReward: 80,
  },
  wormSegment: {
    hp: 120,
    speed: 0,
    // damage 0: the chain re-pins segments right after knockback, so contact
    // damage would re-apply every frame as the body crosses the ship. Only the
    // head bites.
    damage: 0,
    radius: 14,
    scoreValue: 25,
    powerReward: 8,
  },
  phaseShifter: {
    hp: 350,
    speed: 0,
    damage: 15,
    radius: 24,
    scoreValue: 500,
    powerReward: 100,
    // Fires lasers between teleports from wherever it lands.
    fireRate: 0.7,
    fireRange: 520,
    projectileDamage: 10,
    projectileSpeed: 320,
    projectileBeam: true,
  },
} as const

export const CURRENCY_DROPS: Record<EnemyKind, { min: number; max: number }> = {
  drone: { min: 0, max: 2 },
  tank: { min: 1, max: 5 },
  shooter: { min: 1, max: 3 },
  swarm: { min: 0, max: 1 },
  bomber: { min: 1, max: 4 },
  dreadnought: { min: 5, max: 15 },
  shieldGenerator: { min: 1, max: 3 },
  voidWorm: { min: 5, max: 15 },
  wormSegment: { min: 1, max: 3 },
  phaseShifter: { min: 5, max: 15 },
}

export const CURRENCY_NAME = 'Stardust'

export const POWER_ORB = {
  radius: 6,
  floatDuration: 0.5,
  magnetStrength: 350,
  drag: 0.94,
  // Safety-net expiry only: orbs auto-home at floatDuration and homing
  // collectibles never time out, so in practice an orb is always collected
  // well before this. It exists so an orb can't linger forever if homing is
  // ever gated off.
  lifetime: 12,
} as const

// Run-scoped boss material that gates Ultimate purchases. Change this one
// constant to rename it everywhere (HUD, shop, dev console).
export const SINGULARITY_SHARD_NAME = 'Singularity Shard'
// Shards awarded per boss kill.
export const SHARDS_PER_BOSS = 1

// Singularity Shard pickup — drops on boss death and auto-homes like a power
// orb (floats briefly, then flies to the ship; no click needed).
export const SINGULARITY_SHARD = {
  radius: 9,
  floatDuration: 0.5,
  lifetime: 12,
  // Violet diamond identity — kept here so the renderer (and any future HUD
  // pickup icon) share one source for the shard's colour.
  fill: '#d8b4ff',
  stroke: '#f0e0ff',
} as const

export const SPACE_METAL = {
  radius: 10,
  lifetime: 12,
  collectionRadius: 30,
  dropChance: {
    drone: 0.03,
    tank: 0.12,
    shooter: 0.06,
    swarm: 0.01,
    bomber: 0.1,
    // Boss drops are handled by BossDefinition.onDeath — these are never rolled.
    // Worm segments drop nothing so the body can't be farmed for metal.
    dreadnought: 0,
    shieldGenerator: 0,
    voidWorm: 0,
    wormSegment: 0,
    phaseShifter: 0,
  } as Record<EnemyKind, number>,
} as const

export const WAVES_PER_LEVEL = 3
// Boss appears every BOSS_LEVEL_INTERVAL levels (waves = WAVES_PER_LEVEL × BOSS_LEVEL_INTERVAL).
export const BOSS_LEVEL_INTERVAL = 3
// Fraction of normal enemy count on boss waves. Tune to adjust how crowded the boss fight feels.
export const BOSS_WAVE_ENEMY_MULTIPLIER = 0.4

export const SPAWN_DELAY = { min: 0.1, max: 1.0 } as const
export const SPAWN_DISTANCE = { min: 650, max: 1050 } as const

// Half-width of the box swarm members scatter into around their shared spawn center.
export const SWARM_SPAWN_SPREAD = 60

export const PROJECTILE_SPEED = 400
export const PROJECTILE_LIFETIME = 3
export const PROJECTILE_RADIUS = 4

export const PARTICLE_DEFAULTS = {
  maxParticles: 200,
  explosionCount: 12,
  trailInterval: 0.05,
}

export type ChangelogEntry = {
  version: string
  date: string
  changes: {
    breaking?: string[]
    features?: string[]
    balance?: string[]
    fixes?: string[]
    ui?: string[] // Anything that changes UI without changing actual game functionality
    architecture?: string[] // Internal refactors that don't change game features or behavior
  }
}

export const CHANGELOG: ChangelogEntry[] = [
  {
    version: '0.20.0',
    date: '2026-06-13',
    changes: {
      features: [
        'Four more ultimates, bought with the Singularity Shard economy and replacing their base weapon in the hotbar.',
        'Rocket → Fireworks: the rocket bursts into three rockets, each bursting into three more — a cascading cluster. Upgrade Finale to add a rocket to every second-wave burst.',
        'Black Hole → Event Horizon: a wider, stronger well that zaps enemies at the core and banishes them far from your ship. Upgrade Spaghettification to drag them in harder.',
        'Solar Flare → Solar Plague: the beam still burns enemies directly, but now also sets them ablaze — the fire keeps dealing damage over time and leaps between enemies that touch. Upgrade Wildfire to make it jump further.',
        'Telekinesis → Singularity: pulls enemies into a crushing core that hurts more the more it holds, then detonates on release — the longer you hold (up to 2s), the bigger the blast. Its core darkens toward deep purple as the blast charges. Upgrade Collapse to make it bigger still.',
      ],
      architecture: [
        'Effects can spawn child effects (Fireworks’ cascading rockets), hold abilities can fire a release burst (Singularity’s detonation), and enemies carry a generic fire status driven by a new burning system (Solar Plague). Gravity-pull, radial-force, force-field rendering, and solar beam-damage helpers are now shared between base abilities and their ultimates.',
      ],
      fixes: [
        'The Next Wave button (and other overlay buttons) no longer shrink when hovered in fullscreen.',
      ],
    },
  },
  {
    version: '0.19.0',
    date: '2026-06-12',
    changes: {
      features: [
        'Three more ultimates, each bought with the Singularity Shard economy and replacing its base weapon in the hotbar.',
        'Helper → Helper Factory: a tanky factory that deals no damage but builds a steady stream of helpers on a timer. Upgrade Assembly Line to build them faster.',
        'Sun → Supernova: the sun holds, then collapses and shifts blue before detonating in a brief, devastating blast. Upgrade Critical Mass to widen the explosion.',
        'Shield → Force Field: a dome that grows to twice its size then vanishes, flinging enemies away on contact and burning them. Upgrade Repulsor to throw them harder.',
      ],
      ui: [
        'Abilities you can’t afford now stay dimmed the whole time, instead of only darkening once they finish recharging.',
      ],
    },
  },
  {
    version: '0.18.1',
    date: '2026-06-11',
    changes: {
      architecture: [
        'Effects are registry-driven: each ability/weapon file owns its effect’s full lifecycle (factory, per-tick simulation, world-layer drawing) and registers a single EffectDefinition — the effects system and renderer dispatch generically, so adding an effect never touches them.',
        'Bosses declare their own rendering: BossDefinition gained renderBack (the Phase Shifter telegraph), spriteAlpha (the mid-shift ghost), and a hideShieldBubble predicate — the renderer no longer hard-codes any boss.',
        'Hold abilities declare their own overlays (renderBack/renderFront on the hold config): the Solar Flare haze and Telekinesis ripple moved into their ability files, so a new hold ability needs zero renderer edits.',
        'Bosses declare their movement behaviour on their BossDefinition and bosses always die as bosses — the per-kind movement/death tables in entity-creator now cover only regular enemies.',
        'Boss runtime state is a kind-tagged discriminated union: each boss declares its own state type in its own file (the Dreadnought’s drone timer, the worm’s attack cycle, the shifter’s teleport cycle) and TypeScript narrows it without casts.',
        'Upgrade ids live next to the upgrades they belong to: every ability/weapon file owns its id block and engine/upgrade-ids.ts assembles the global UpgradeId — adding content no longer edits a central 70-entry enum.',
        'Ultimates build their upgrade math through composeUltimateUpgrades — the base ability’s full upgrade patch flows through automatically, so a base gaining a new upgradable field can never be silently dropped by its ultimate.',
        'Shared geometry helpers: ringPositions (generator/swarm/meteor rings), clampToWorld (boss movement and teleport targeting), and bossPhase (the two-phase HP threshold) replace three near-identical copies.',
        'Dev-console state manipulation moved out of the React hook into engine/dev-tools.ts, and slingshot press/drag/release decoding into input/sling-gesture.ts — both pure and unit-tested; a guard test also keeps WEAPON_ORDER covering every ability.',
        'Each ability/weapon file binds its upgrades once via makeAbilityUpgrade / makeLoadoutUpgrade, so every upgrade declares only id/label/description/tiers — the repeated category + weapon fields (and the copy-paste risk of a stale weapon tag) are gone.',
        'The in-game help text for channelled abilities is derived from the ability registry instead of a hand-maintained list.',
      ],
    },
  },
  {
    version: '0.18.0',
    date: '2026-06-11',
    changes: {
      features: [
        'Ultimate abilities — upgraded variants of your weapons, forged with a new currency: the Singularity Shard. Every boss you defeat drops one (it floats free and homes to your ship automatically).',
        'Buy an ultimate from a weapon’s shop page once you own the base weapon. It costs stardust + space metal + Singularity Shards, and the shard price climbs with each ultimate you buy this run (1, then 2, then 3 …). The ultimate replaces its base in your hotbar (keeping the same slot).',
        'Meteorite → Comet Shower: a single tap rains meteorites — one dead-center on your aim, the rest scattered and staggered around it. Upgrade Comet Count for more meteorites, or Comet Cadence to make them fall in quicker succession.',
        'Meteor → Meteor Shower: a center hit plus a ring of meteors that land together a beat later. The Meteor Count upgrade adds another to the ring, closing the angle between them.',
        'New Power upgrades: Life Regen (slowly heal ship HP), Stardust Yield (multiply the Stardust earned from kills), Metal Detector (raise the chance enemies drop Space Metal), and Energy Siphon (gain more power from each kill).',
      ],
      ui: [
        'Owned ultimates are marked in the ability bar — and their upgrade cards in the shop — with a purple tint, so they stand apart from your base weapons.',
        'The three shop currencies now read as distinct coloured symbols (Stardust, Space Metal, Singularity Shard).',
        'Ship tab: the four Slingshot upgrades are tucked behind a “Slingshot” entry you drill into, keeping the tab tidy.',
        'Meteor strike telegraphs (the falling-meteor markers) now appear in the order the meteors will land, instead of all at once.',
        'An overheated ship now shows it — the hull washes red (fading as it cools) and vents smoke and embers.',
      ],
      fixes: [
        'Restarting from the pause menu works again — the new game no longer freezes in place after you pick a ship.',
      ],
      architecture: [
        'Ultimates are registry-driven (one `ultimate` block per ability) so any weapon can gain one in future without touching the shop, hotbar, or purchase flow.',
      ],
    },
  },
  {
    version: '0.17.0',
    date: '2026-06-10',
    changes: {
      features: [
        'New boss — Void Worm: a long segmented serpent that weaves after your ship and lunges in sudden charges you have to dodge. Its body shields the head — destroy the segments (the worm shortens and rejoins as pieces die), then kill the exposed head to bring it down. The boss HP bar tracks head + body combined.',
        'New boss — Phase Shifter: blinks across the battlefield, aiming to land right on top of you. A red X marks the destination a couple of seconds ahead — while it phases it cannot be harmed, and on arrival it materialises a ring of swarmers around itself. Below half health it teleports faster and brings a bigger ring.',
        'Boss waves now pick a random boss — each of the three bosses appears once before any repeats, then selection is fully random. The lineup reshuffles every run.',
      ],
      fixes: [
        'Tapping on (or right next to) your ship now fires the selected ability there instead of being swallowed by the slingshot — only an actual drag flings the ship, so enemies swarming you stay targetable.',
      ],
    },
  },
  {
    version: '0.16.1',
    date: '2026-06-10',
    changes: {
      ui: [
        'Full sprite art pass — every ship, enemy, and projectile redrawn with cleaner silhouettes and shading.',
        'Bullets (yours and enemies’) are larger with white-hot cores so they’re easier to track.',
      ],
    },
  },
  {
    version: '0.16.0',
    date: '2026-06-09',
    changes: {
      features: [
        'The Dreadnought boss now attacks — it fires a slow red laser beam you can slingshot clear of, shooting from range while it holds at its standoff.',
        'Its shield generators fire lasers too, and put out most of the incoming fire — so destroying them (which also drops the boss’s shield) is the way to cut the fight’s pressure down.',
      ],
    },
  },
  {
    version: '0.15.0',
    date: '2026-06-09',
    changes: {
      features: [
        'New movement — Slingshot: drag from your ship in any direction and release to fling it that way. Your way to dodge danger, reposition, or close the gap — and it works no matter which ability is selected. Throws carry a little random scatter, and the ship coasts then drifts to a stop.',
        'Slingshot Heat: every flick builds heat (big flings cost the most, tiny nudges almost nothing) that cools over time. Fill the bar and the slingshot overheats — locked out, and the ship slows, until it cools back down. Rewards short, precise dodges and burst use over endless kiting; your aim also gets shakier the hotter you run.',
        'Four new Ship upgrades for the slingshot — Power (fling farther), Control (less scatter), Cadence (shorter cooldown), and Heat Sink (cool faster).',
      ],
      ui: [
        'Added a HEAT gauge to the HUD, plus an aim arrow showing direction + charge while you drag (it greys out while the slingshot is recharging or overheated).',
      ],
    },
  },
  {
    version: '0.14.0',
    date: '2026-06-09',
    changes: {
      features: [
        'Dreadnought boss appears at the end of every 3rd level (waves 9, 18, 27 ...).',
        'Boss is wrapped in a shield (same look as your ship’s) projected by a ring of generator drones — destroy every generator to drop the shield and damage the boss.',
        'At 50% HP the boss re-arms: it regenerates its shield with 5 generators (up from 3) and spawns escort drones twice as fast.',
        'Boss slowly advances on the player and holds at a standoff, its generator ring spread evenly around it and tracking it as it moves.',
        'While shielded the boss can’t be harmed by anything — auto-attacks, homing missiles, ricochet bounces, allies, and every AoE ability now skip or pass through it and target the generators instead.',
        'Boss waves spawn a slimmed-down regular enemy escort alongside the boss.',
        'Killing the boss guarantees 1–4 space metal drops.',
      ],
      ui: [
        'The level-progress bar cross-fades into a top-screen boss HP bar when a boss appears, and back again once it falls.',
        'Carrier: buying a new ship weapon now auto-equips it into a still-default (Bullet) slot. Once all three slots hold non-default weapons, new purchases are left for you to slot manually.',
      ],
      architecture: [
        'New engine/bosses/ registry — add a BossDefinition to plug in future bosses (Void Worm, Phase Shifter) without touching game-loop or combat code.',
      ],
    },
  },
  {
    version: '0.13.2',
    date: '2026-06-09',
    changes: {
      balance: [
        'Each ricochet bounce refreshes the round to at least 0.5s of remaining lifetime, so a chain that keeps finding targets uses all its bounces instead of expiring mid-flight. Base lifetime unchanged.',
        'Laser pierce 2 → 3 enemies (+50%)',
      ],
      fixes: [
        'Entity IDs now use crypto.randomUUID for session-wide uniqueness (was a module-level counter) — bouncing rounds no longer skip enemies whose recycled IDs were already hit.',
      ],
      ui: [
        'Buying a ship weapon on a single-slot ship auto-equips it. Carrier keeps the manual slot choice.',
      ],
    },
  },
  {
    version: '0.13.1',
    date: '2026-06-08',
    changes: {
      features: [
        'Missile now splashes on impact — enemies in a small radius take 60% damage (direct hit unchanged). New Splash upgrade widens the radius.',
      ],
      balance: [
        'Nuke: damage ×2.5 (+150%), fire cadence ~1/3 of bullet (−67%), bigger blast and waste radius.',
        'Ricochet: bounce range 240 → 500 (+108%), full bullet speed.',
      ],
      ui: [
        'Nuclear-waste zone expands once on detonation then shrinks to nothing (no pulse); damage area matches the visual.',
        'Carrier loadout slots are now cycle-on-click chips (was a dropdown), showing slot number, current weapon, and a cycle hint.',
      ],
      fixes: ['Ricochet rounds now draw a short magenta trail.'],
    },
  },
  {
    version: '0.13.0',
    date: '2026-06-08',
    changes: {
      features: [
        'Ship auto-attack is now a swappable weapon. New Loadout shop tab offers alternatives (Bullet unchanged): Laser pierces in a line, Missile homes onto targets, Ricochet bounces between nearby enemies, Nuke lobs slow for a massive blast leaving a radioactive zone.',
        'Carrier fields 3 different weapons at once — one per slot, each firing on its own independent cadence.',
        'Per-weapon upgrade trees in the Loadout tab: damage, pierce, bounces, blast, fallout.',
      ],
      architecture: [
        'New engine/ship/ folder holds ship variants, weapon definitions, and the weapon registry (mirrors engine/abilities/): a new weapon needs one file + one registry entry. SHIP_VARIANTS moved there, re-exported from data.ts.',
      ],
    },
  },
  {
    version: '0.12.0',
    date: '2026-06-08',
    changes: {
      features: [
        'Added power-cost (Efficiency) upgrades to Rocket, Shield, Helper, and Telekinesis. Added Range / Radius upgrades to Meteor, Black Hole, Sun, and Solar Flare.',
        'Telekinesis gains a Force upgrade — pushes enemies harder.',
        'Damage upgrades now extend to 5 tiers for every weapon and the ship auto-turret.',
      ],
      balance: [
        'Meteorite: power cost 5 → 8 (+60%), damage 15 → 10 (−33%), cooldown 0.05 → 0.2 (×4).',
        'Tier 2 stardust cost ×2 (+100%), Tier 3 ×4 (+300%) across every weapon and ship upgrade.',
      ],
      fixes: [
        'Telekinesis on-screen circle now matches the upgraded pull radius.',
        'Offered weapons sit at the bottom of the shop list until purchased (no longer jump into the middle of your unlocked list).',
        'Mobile: space-metal ability buttons and weapon swapping are tappable again.',
        'Mobile (iOS pseudo-fullscreen): rotating portrait to landscape no longer leaves Safari’s tab bar showing.',
      ],
      ui: [
        'Maxed-out weapons show a "MAX" badge in the shop list.',
        'Changelog now has a filter dropdown to toggle categories (Features, Balance, Fixes, etc.); "Internal Architecture" is hidden by default.',
        'Ability cards show a top-right recharge ring that fills as the cooldown ticks down.',
        'Shop now lists weapons in unlock order (matching the hotbar); newly-offered weapons appear at the bottom of the list.',
      ],
    },
  },
  {
    version: '0.11.1',
    date: '2026-06-07',
    changes: {
      ui: [
        'Mobile: the weapon and space-metal ability buttons merge into one cluster clear of the play area — a bottom row in portrait, a right-side column in landscape. Desktop keeps the split bottom/side layout.',
        'Help (?) button removed from the HUD, moved into the settings menu.',
      ],
    },
  },
  {
    version: '0.11.0',
    date: '2026-06-07',
    changes: {
      ui: [
        'Replaced every game emoji (pause, fullscreen, help, all weapon and space-metal icons) with an inline-SVG icon set — icons render identically on every device and tint to the accent colour on hover.',
      ],
    },
  },
  {
    version: '0.10.2',
    date: '2026-06-07',
    changes: {
      ui: [
        'Drag abilities (telekinesis, solar flare) no longer scroll the page on mobile — the canvas claims touch gestures.',
        'Short landscape phones: the upgrade screen Continue button now sits right under the last upgrade (no forced gap).',
        "iOS pseudo-fullscreen now re-hides Safari's URL / tab bar after a rotate.",
      ],
    },
  },
  {
    version: '0.10.1',
    date: '2026-06-06',
    changes: {
      fixes: [
        'Non-bomber enemies (drones, tanks, shooters, swarmers) no longer suicide on contact — they deal their damage, bounce off the ship or helper, and stay in the fight. Bombers still detonate on impact.',
        'Bomber death explosions now damage helpers in the blast radius, not just the ship (shields still shelter a helper inside the dome).',
      ],
      balance: ['Bomber explosion damage 30 → 40 (+33%)'],
    },
  },
  {
    version: '0.10.0',
    date: '2026-06-06',
    changes: {
      features: [
        'Added an in-game help modal (? button, top-right) covering gameplay, controls, space-metal abilities, and progression; freezes the game while open.',
      ],
      ui: [
        'Reworked the start-screen blurb for the cosmic-guardian premise, pointing new players at the in-game help.',
      ],
    },
  },
  {
    version: '0.9.2',
    date: '2026-06-06',
    changes: {
      features: [
        'Helper allies no longer expire on a timer — they lose 1 HP/s and die at 0, with combat damage on top. The old Duration upgrade is now Max Health.',
      ],
      ui: [
        'Landscape fullscreen on mobile: start / ship-select / upgrade screens now scroll when taller than the viewport, keeping Start / Launch / Continue reachable.',
        'Canvas now renders at devicePixelRatio resolution — sprites are crisp on Retina / high-DPI mobile.',
        'Camera zoom now folds in min-dimension scaling, so wide-but-short viewports zoom out further.',
        'iOS pseudo-fullscreen now nudges Safari to auto-hide its URL bar on entry.',
      ],
      fixes: [
        'Helper damage and max-HP upgrades now reach the spawned ally.',
        'Escape Mode dash is now clamped to the play area.',
      ],
    },
  },
  {
    version: '0.9.1',
    date: '2026-06-06',
    changes: {
      balance: [
        'Sun duration 5 → 8s (+60%)',
        'Solar flare beam width 60 → 40px (−33%)',
        'Black hole cost 50 → 30 power (−40%)',
        'Black hole pull strength 200 → 250 (+25%)',
      ],
    },
  },
  {
    version: '0.9.0',
    date: '2026-06-06',
    changes: {
      features: [
        'Ability bar now hides locked abilities and orders the rest by unlock time — the first unlocked gets hotkey 1, the second 2, and the slot never shifts after.',
        'Escape Mode: new space-metal ability (hotkey G, costs 2 space metal) — slows the ship while charging, then dashes in your current heading with a flame trail; ship invincible throughout.',
        'Level-up weapons tab now offers 2 random locked weapons per level; buying one removes the other for that level-up. Owned weapons stay fully upgradable.',
      ],
      ui: [
        'Mobile ability bar wraps to multiple rows when many abilities are unlocked.',
        'Space-metal counter + abilities moved to a dedicated right-side rail, built on a small registry for new powers.',
      ],
    },
  },
  {
    version: '0.8.4',
    date: '2026-06-04',
    changes: {
      fixes: [
        'Enemy bullets no longer tunnel through the ship at 2× game speed — the swept collision check now applies to enemy fire too.',
      ],
      architecture: [
        'Solar Flare kills now tally score and currency through the game loop like every other kill source (was inline); removed dead telekinesis drag-delta input plumbing.',
      ],
    },
  },
  {
    version: '0.8.3',
    date: '2026-06-04',
    changes: {
      features: [
        'Telekinesis now applies a radial force that pushes enemies away from your cursor (was drag-based). Set TELEKINESIS.mode to "pull" in abilityData.ts to flip behavior.',
      ],
      fixes: [
        'Telekinesis now needs 1 second of power to start and shuts off the instant power runs out.',
      ],
    },
  },
  {
    version: '0.8.2',
    date: '2026-06-04',
    changes: {
      features: [
        'Allies now have an HP bar that follows them, mirroring the ship bar.',
        'Allies now orbit the ship at unique per-ally angles and weave with random noise — stacked allies fan out instead of overlapping.',
        'Solar Flare visual now spawns a dense white/yellow core with a wider orange spray.',
      ],
      balance: [
        'Allies dodge enemies worse — lower avoid radius, weaker push, added random movement — so they can die.',
      ],
      fixes: ['Solar Flare now deactivates the moment power drops below one tick of cost.'],
      architecture: [
        'Consolidated all per-ability data (meta, base stats, factories, upgrade definitions and application) into one file per ability under engine/abilities/ — a new ability is one file + an index entry.',
      ],
    },
  },
  {
    version: '0.8.1',
    date: '2026-06-04',
    changes: {
      features: [
        'Allies now follow your ship and weave away from nearby enemies (no longer stand still while shooting).',
        'Solar Flare is now a radial particle storm at your cursor (was a beam from your ship).',
        'Solar Flare arms only with at least 1 second of power available and stops the moment power runs out.',
        'Telekinesis force now uses a plateau curve — full strength near the cursor with a smooth falloff.',
      ],
      fixes: [
        'Enemies now die and damage allies when ramming them.',
        'Solar Flare cursor now stays under your actual mouse instead of drifting as the camera moves.',
        'Space metal can now be collected while Solar Flare or Telekinesis is selected.',
      ],
    },
  },
  {
    version: '0.8.0',
    date: '2026-06-04',
    changes: {
      features: [
        'New ability: Helper — click to summon a ranged ally that fights for 20 seconds. No cap; stack them.',
        'New ability: Telekinesis — hold to create a force field at your cursor; drag to push enemies away with distance-based falloff.',
        'New ability: Solar Flare — hold toward enemies for a continuous damage beam; power drains every 0.25s while active.',
        'Enemies now target and shoot at Helper allies.',
      ],
      fixes: [
        'Bullets no longer tunnel through enemies at 2× game speed — swept segment-circle collision replaces the old point check.',
        'Wave-complete screen: pressing Enter now advances to the next wave.',
      ],
    },
  },
  {
    version: '0.7.0',
    date: '2026-06-03',
    changes: {
      features: [
        'Ship selection screen before each game — choose from Fighter, Interceptor, Dreadnought, or Carrier',
        'Fighter: balanced all-round ship (100 HP, 50 shield)',
        'Interceptor: fast glass cannon (70 HP, 25 shield, 8 damage, 180 speed)',
        'Dreadnought: massive shield pool that regens after cooldown (110 HP, 120 shield, slow)',
        'Carrier: fires at up to 3 enemies simultaneously (moderate stats)',
        'Ship shield system — a secondary HP layer that absorbs damage first and regens over time',
        'Shield enters a cooldown when broken, then regens at half the starting amount',
        'Space metal can instantly refill the shield — press F or click the HUD button',
        'New upgrade: Fire Rate — increase auto-turret fire rate (3 tiers)',
        'New upgrade: Shield Strength — increase maximum shield (3 tiers)',
        'New upgrade: Engine Boost — increase ship speed (3 tiers)',
      ],
      fixes: [
        'Shop upgrade buttons are now fully clickable (was text-only, not the surrounding box)',
        'Two player bullets in the air: one hitting an enemy no longer removes the other',
      ],
      ui: ['Player ship is no longer visible in the background before a game starts'],
    },
  },
  {
    version: '0.6.1',
    date: '2026-06-02',
    changes: {
      features: [
        'Shield now reflects enemy velocity on contact — enemies bounce off the dome instead of snapping back to the edge',
        'Shield blocks bomber explosions if the ship is inside the dome and the bomber explodes outside it',
        'Rocket now detonates when it physically touches an enemy, instead of flying past and still damaging from empty space',
        'Shield grandfathering is now per-tick — an enemy inside when the shield dropped can walk out, but loses grandfathered status on leaving and is bounced back if it re-enters',
      ],
      ui: [
        'Camera now zooms based on viewport area — the same total world is visible regardless of screen size or fullscreen state',
        'Mobile shows more world area (zoomed-out) so enemies approaching from the sides are visible',
        'Mobile polish: bigger pause / fullscreen tap targets (44×44) and a much taller game area on phones',
        'Fullscreen now works on iPhone Safari via a CSS-based fallback (Fullscreen API is unsupported there)',
        'HUD elements (level bar, score, pause / fullscreen buttons, ability hotbar) now scale with the gameplay area',
        'Pause / settings / upgrade / game-over screens scale with the HUD too',
        'Game starts more zoomed-out by default',
      ],
      fixes: ['Going fullscreen no longer reveals more of the game world'],
    },
  },
  {
    version: '0.6.0',
    date: '2026-06-02',
    changes: {
      features: [
        'New ability: Rocket — flies from your ship to the target, exploding on arrival with a bigger blast radius than the meteor',
        'New ability: Shield — a stationary dome that absorbs enemy projectiles and blocks enemies from entering (those already inside when it drops stay free until they leave)',
        'New ability: Sun — drops a massive stationary AoE damage zone for a few seconds; very long cooldown',
        'Six abilities total now visible in the hotbar, unlockable from the shop',
      ],
      fixes: ['Hotbar and shop weapon order is now driven by a single WEAPON_ORDER array'],
    },
  },
  {
    version: '0.5.1',
    date: '2026-06-02',
    changes: {
      features: [
        'Clicked space metal now flies into the ship (same magnetic arc as power orbs) instead of teleporting away. Click-to-claim unchanged.',
      ],
      fixes: [
        'Wave delay no longer freezes in-flight meteors / homing power orbs — only enemy spawning is gated',
        'Game now opens with the camera already centered on your ship — no "rush across space" on first load or restart.',
        'Bombers now explode when they reach your ship — the on-death AoE fires on every death, not just when shot down.',
        'Swarm enemies now weave in sync with the game-speed setting and freeze cleanly when paused — driven by game time, not the wall clock.',
      ],
      ui: ['Game-speed buttons in Settings now announce their selected state to screen readers.'],
    },
  },
  {
    version: '0.5.0',
    date: '2026-06-02',
    changes: {
      features: [
        'Pause menu — press P or click the pause button; resumes cleanly with no time-skip',
        'Settings menu — game speed slider (0.5×/1×/2×) accessible from pause',
        'Fullscreen toggle button — uses the Fullscreen API to fill the screen',
        'Speed indicator in the HUD when game speed is not 1×',
      ],
      fixes: [
        'Tank enemies pursue the ship steadily — velocity is now smoothed instead of flipping each frame as the ship reverses',
      ],
      ui: [
        'Upgrade menu now stays a fixed size across tabs — no heading jump or layout shift when switching Weapons/Ship/Powers',
        'Shooter enemy sprite redesigned — cleaner diamond silhouette with a glowing eye',
      ],
    },
  },
  {
    version: '0.4.0',
    date: '2026-06-02',
    changes: {
      features: [
        'New enemy: Swarm — tiny, fast, zigzag movement, spawn in packs of 5-8',
        'New enemy: Bomber — slow, bulky, explodes on death dealing AoE damage to the ship',
        'Power orbs — enemies now drop blue orbs that magnetically arc toward your ship to restore power',
        'Space metal — rare gold hexagonal drops that must be clicked to collect (premium currency)',
      ],
      ui: ['Space metal counter in the HUD'],
      architecture: [
        'Unified effect system replaces per-ability arrays',
        'Data-driven movement behaviors (chase, keep-range, zigzag) replace hardcoded enemy if/else',
        'Ability creation uses a factory map instead of branching logic',
      ],
    },
  },
  {
    version: '0.3.0',
    date: '2026-06-02',
    changes: {
      features: [
        'Enemies trickle in near the ship with randomized order and timing, instead of all spawning at the map edge at once',
      ],
      ui: [
        'Level progress bar at the top of the HUD — fills as enemies spawn, with milestone dots per wave',
        'HUD now shows "Level X" instead of raw wave numbers',
        'Wave-complete and game-over screens show wave progress within the current level',
      ],
      fixes: [
        'Abilities now sort by power cost (cheapest first); hotkey numbers and HUD badges derive from that order',
      ],
      architecture: [
        'Random functions now use the seeded RNG instead of deterministic index-based positioning',
      ],
    },
  },
  {
    version: '0.2.1',
    date: '2026-06-01',
    changes: {
      fixes: [
        'Black Hole Duration upgrade now extends the black hole lifetime',
        'Game-over screen no longer shows "New High Score!" when you only tie your best',
      ],
      architecture: [
        'Black hole gradients are now cached instead of rebuilt each frame',
        'Enemy stats now read from a single source of truth',
        'Sprite keys converted to a const object, removing the last magic-string union',
      ],
    },
  },
  {
    version: '0.2.0',
    date: '2026-06-01',
    changes: {
      features: [
        'New enemy: Shooter — ranged enemy that fires projectiles at your ship',
        'New ability: Black Hole — pulls enemies in a spiral, deals damage over time (more at center)',
        'Dual attack system: Meteorite (cheap/fast) and Meteor (expensive/powerful)',
        'Ship upgrades: Hull Plating (max HP) and Auto-Turret (damage)',
        'Power regen upgrade',
        'Stardust currency dropped by enemies for purchasing upgrades',
        'Level system: every 3 waves = 1 level, upgrade screen between levels',
        'Seeded random number generator for unique sessions',
        'Upgrade shop with tabbed UI (Weapons, Ship, Powers)',
        'Drill-down weapon upgrades: click a weapon to see its sub-upgrades',
        'Hotkeys 1/2/3 to switch between abilities',
      ],
      balance: ['Ship damage 10 → 5 (−50%), power regen 3 → 5/s (+67%)'],
      architecture: ['Eliminated all magic-string union types in favor of const objects'],
      fixes: ['Renamed from Event Horizon to Null Space'],
    },
  },
  {
    version: '0.1.0',
    date: '2026-05-31',
    changes: {
      features: [
        'Initial release — playable space defense game',
        'Ship auto-flies and auto-attacks enemies',
        'Meteor strike ability (click to launch)',
        'Power system for abilities with passive regen',
        'Two enemy types: Drone and Tank',
        'Wave-based progression with increasing difficulty',
        'High score persistence via localStorage',
        'Lazy-loaded so it does not affect site load time',
      ],
      ui: [
        'Pixel art sprites rendered on Canvas 2D',
        'HUD with HP bar, power bar, score, wave counter',
        'Menu, wave complete, and game over screens',
        'Games hub page under Fun Stuff',
      ],
    },
  },
]

export const GAME_VERSION = CHANGELOG[0].version
