import { AbilityKind, ShipKind } from './engine/types'
import type { EnemyKind } from './engine/types'

export const GAME_NAME = 'Null Space'

export const WORLD_SIZE = { x: 3000, y: 3000 }

export const SHIP_DEFAULTS = {
  hp: 100,
  maxHp: 100,
  damage: 5,
  fireRate: 2,
  speed: 120,
  radius: 16,
  attackRange: 280,
}

export type ShipVariantStats = {
  hp: number
  maxHp: number
  maxShield: number
  shieldRegen: number
  damage: number
  fireRate: number
  speed: number
  attackRange: number
  radius: number
  weaponSlots: number
}

export type ShipVariantConfig = {
  label: string
  description: string
  stats: ShipVariantStats
}

// Upper bounds for the ship-select stat bars — the full-bar visual scale, not a
// gameplay cap. Keyed by stat so a ceiling can't silently drift from a tweaked variant.
export const STAT_MAX = {
  maxHp: 160,
  maxShield: 140,
  shieldRegen: 8,
  damage: 10,
  speed: 200,
  fireRate: 4,
} as const

export const SHIELD_COOLDOWN = 3

export const SHIP_ORDER: ShipKind[] = [
  ShipKind.fighter,
  ShipKind.interceptor,
  ShipKind.dreadnought,
  ShipKind.carrier,
]

export const SHIP_VARIANTS: Record<ShipKind, ShipVariantConfig> = {
  [ShipKind.fighter]: {
    label: 'Fighter',
    description: 'Balanced all-round ship. Reliable in any situation.',
    stats: {
      hp: 100,
      maxHp: 100,
      maxShield: 50,
      shieldRegen: 4,
      damage: 6,
      fireRate: 2.5,
      speed: 120,
      attackRange: 280,
      radius: 16,
      weaponSlots: 1,
    },
  },
  [ShipKind.interceptor]: {
    label: 'Interceptor',
    description: 'Fast and hard-hitting. Fragile under sustained fire.',
    stats: {
      hp: 70,
      maxHp: 70,
      maxShield: 25,
      shieldRegen: 3,
      damage: 8,
      fireRate: 3,
      speed: 180,
      attackRange: 280,
      radius: 14,
      weaponSlots: 1,
    },
  },
  [ShipKind.dreadnought]: {
    label: 'Dreadnought',
    description: 'Massive shield pool that regens after a brief cooldown. Slow but hard to kill.',
    stats: {
      hp: 110,
      maxHp: 110,
      maxShield: 120,
      shieldRegen: 6,
      damage: 4,
      fireRate: 1.5,
      speed: 75,
      attackRange: 280,
      radius: 18,
      weaponSlots: 1,
    },
  },
  [ShipKind.carrier]: {
    label: 'Carrier',
    description: 'Fires at 3 enemies at once — but weaker hull, lower speed, and slower guns.',
    stats: {
      hp: 75,
      maxHp: 75,
      maxShield: 30,
      shieldRegen: 2,
      damage: 4,
      fireRate: 1.5,
      speed: 90,
      attackRange: 280,
      radius: 16,
      weaponSlots: 3,
    },
  },
}

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
} as const

export const CURRENCY_DROPS: Record<EnemyKind, { min: number; max: number }> = {
  drone: { min: 0, max: 2 },
  tank: { min: 1, max: 5 },
  shooter: { min: 1, max: 3 },
  swarm: { min: 0, max: 1 },
  bomber: { min: 1, max: 4 },
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
  } as Record<EnemyKind, number>,
} as const

export const WAVES_PER_LEVEL = 3

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
    version: '0.12.0',
    date: '2026-06-08',
    changes: {
      features: [
        'Every weapon now has a power-cost (Efficiency) upgrade where one was missing — Rocket, Shield, Helper, and Telekinesis. Every AoE ability now has a Range / Radius upgrade — Meteor, Black Hole, Sun, and Solar Flare.',
        'Telekinesis gains a Force upgrade — push enemies harder over time.',
        'Damage upgrades extend to 5 tiers for every weapon and the ship auto-turret, giving late-game stardust a real sink.',
      ],
      balance: [
        'Meteorite nerf: power cost 5 → 8, damage 15 → 10, cooldown 0.05 → 0.2. Tap-to-aim on mobile made it dominant; this brings it in line with mid-game weapons.',
        'Tier 2 stardust costs ×2, Tier 3 ×4 across every weapon and ship upgrade. Endgame upgrades now feel earned.',
      ],
      fixes: [
        'Telekinesis on-screen circle now matches the upgraded pull radius. Buying the Radius upgrade extends both the effect and the visible circle, not just the effect.',
        'Shop ordering: offered weapons no longer jump into the middle of your unlocked list — they sit at the bottom until purchased.',
      ],
      ui: [
        'Maxed-out weapons display a "MAX" badge in the shop list — no need to click in to check.',
        'Changelog now has a filter dropdown — toggle categories (Features, Balance, Fixes, etc.). "Internal Architecture" is hidden by default.',
        'Ability cards show a small recharge ring at the top-right that fills as the cooldown ticks down — readable even when the card has no visible label area.',
        'Shop now lists weapons in unlock order (matching the hotbar). Newly-offered weapons appear at the bottom of the list instead of slotting into their canonical position.',
      ],
    },
  },
  {
    version: '0.11.1',
    date: '2026-06-07',
    changes: {
      ui: [
        'Mobile: the weapon and space-metal ability buttons now merge into one cluster positioned clear of the play area — a bottom row in portrait, a right-side column in landscape — so the controls no longer block shots at enemies on the facing edge. Desktop keeps the split bottom/side layout.',
        'The Help button is removed (The ? button), and moved into the settings menu',
      ],
    },
  },
  {
    version: '0.11.0',
    date: '2026-06-07',
    changes: {
      ui: [
        'Replaced every game emoji (pause, fullscreen, help, all weapon and space-metal icons) with a crisp inline-SVG icon set. Icons now render identically and sleek on every device instead of as full-color OS emoji on mobile, and tint to the accent colour on hover.',
      ],
    },
  },
  {
    version: '0.10.2',
    date: '2026-06-07',
    changes: {
      ui: [
        'Drag abilities (telekinesis, solar flare) no longer scroll the page on mobile — the canvas now claims touch gestures so a drag keeps controlling the game instead of panning the page.',
        'Short landscape phones: the upgrade screen no longer leaves a forced gap that pushed the Continue button below the fold when a tab had only a few upgrades — the button now sits right under the last upgrade.',
        "iOS pseudo-fullscreen now re-hides Safari's URL / tab bar after a rotate — turning the phone no longer leaves the bars stranded on screen.",
      ],
    },
  },
  {
    version: '0.10.1',
    date: '2026-06-06',
    changes: {
      fixes: [
        'Non-bomber enemies (drones, tanks, shooters, swarmers) no longer suicide on contact — they deal their damage, bounce off the ship or helper, and stay in the fight. Bombers still detonate on impact.',
        'Bomber death explosions now damage helpers caught in the blast radius, not just the ship (shields still shelter a helper inside the dome).',
      ],
      balance: ['Increase bomber explosion damage by 33%: 30->40'],
    },
  },
  {
    version: '0.10.0',
    date: '2026-06-06',
    changes: {
      features: [
        'Added an in-game help modal — the ? button (top-right) covers gameplay, controls, space-metal abilities, and progression. Opening it freezes the game and blocks input until you close it.',
      ],
      ui: [
        'Reworked the start-screen blurb to set up the cosmic-guardian premise and point new players at the in-game help.',
      ],
    },
  },
  {
    version: '0.9.2',
    date: '2026-06-06',
    changes: {
      features: [
        'Helper allies no longer expire on a timer — they steadily lose HP (1/s) and die when HP hits 0. Combat damage stacks on top. The old Duration upgrade is now Max Health, directly extending how long allies survive.',
      ],
      ui: [
        'Landscape fullscreen on mobile: start / ship-select / upgrade screens now scroll when the panel is taller than the viewport, so the Start / Launch / Continue buttons are always reachable.',
        'Canvas now renders at devicePixelRatio resolution — sprites are crisp on Retina / high-DPI mobile instead of blocky in fullscreen.',
        'Camera zoom now folds in min-dimension scaling, so wide-but-short viewports (landscape phone fullscreen) zoom out further and the play area no longer feels cramped.',
        'iOS pseudo-fullscreen now nudges Safari to auto-hide its URL bar on entry.',
      ],
      fixes: [
        'Helper damage upgrades and max-HP upgrades now actually reach the spawned ally (the duration upgrade was previously a no-op because the factory ignored ability stats).',
        'Escape Mode dash is now clamped to the play area, so a dash near the edge no longer flings the ship off-screen.',
      ],
    },
  },
  {
    version: '0.9.1',
    date: '2026-06-06',
    changes: {
      balance: [
        'Increase sun duration by 60%: 5->8s',
        'Decrease solar flare beam width by 33%: 60->40px',
        'Decrease black hole cost by 40%: 50->30 power',
        'Increase black hole pull strength by 25%: 200->250',
      ],
    },
  },
  {
    version: '0.9.0',
    date: '2026-06-06',
    changes: {
      features: [
        'Ability bar now hides locked abilities and orders the rest by unlock time. The ability you unlock first gets hotkey 1, the second gets 2, and so on — the slot never shifts after that.',
        'Escape Mode: new space-metal ability (hotkey G, costs 2 space metal). Briefly slows the ship while charging, then dashes in your current heading with a flame trail. Ship is invincible the entire time.',
        'Level-up weapons tab now offers 2 random locked weapons per level; buying either one removes the other for that level-up. Owned weapons remain fully upgradable.',
      ],
      ui: [
        'Mobile ability bar wraps to multiple rows when many abilities are unlocked, fixing the cramped overflow on narrow screens.',
        'Space-metal counter + abilities moved to a dedicated right-side rail. Built on a small registry so new space-metal powers slot in without UI surgery.',
      ],
    },
  },
  {
    version: '0.8.4',
    date: '2026-06-04',
    changes: {
      fixes: [
        'Enemy bullets no longer tunnel through the ship at 2× game speed — the swept collision check now applies to enemy fire as well as your own.',
      ],
      architecture: [
        'Solar Flare kills now tally score and currency through the game loop like every other kill source, instead of inline; removed the dead telekinesis drag-delta input plumbing.',
      ],
    },
  },
  {
    version: '0.8.3',
    date: '2026-06-04',
    changes: {
      features: [
        'Telekinesis now applies a radial force that pushes enemies away from your cursor instead of shoving them around with your drag. Set TELEKINESIS.mode to "pull" in abilityData.ts to flip behavior.',
      ],
      fixes: [
        'Telekinesis now needs 1 second of power to start (same as solar flare) and shuts off the instant power runs out, instead of half-firing on passive regen.',
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
        'Solar Flare visual now spawns a dense hot core (white/yellow) with a wider orange spray, giving a real fire feel.',
      ],
      balance: [
        'Allies are noticeably worse at dodging enemies (lower avoid radius, weaker push, added random movement) so they can actually die.',
      ],
      fixes: [
        'Solar Flare now deactivates the moment power drops below one tick of cost — it no longer keeps half-firing on the trickle of passive regen after running out.',
      ],
      architecture: [
        'Consolidated all per-ability data (meta, base stats, factories, upgrade definitions, upgrade-application logic) into one file per ability under engine/abilities/. Adding a new ability now means creating a single file and registering it in the index, instead of editing ~6 separate lookup tables across the codebase.',
      ],
    },
  },
  {
    version: '0.8.1',
    date: '2026-06-04',
    changes: {
      features: [
        'Allies now follow your ship and weave away from nearby enemies — they no longer stand still while shooting.',
        'Solar Flare is now a radial particle storm at your cursor instead of a beam from your ship.',
        'Solar Flare arms only when you have at least 1 second of power available, and stops the moment power runs out.',
        'Telekinesis force now uses a plateau curve — full strength near the cursor with a smooth falloff, so you no longer need to land the cursor dead-on an entity.',
      ],
      fixes: [
        'Enemies now die and damage allies when ramming them — previously only enemy projectiles could damage allies.',
        'Solar Flare cursor now stays under your actual mouse instead of drifting in world coordinates as the camera moves.',
        'Space metal can now be collected while Solar Flare or Telekinesis is selected.',
      ],
    },
  },
  {
    version: '0.8.0',
    date: '2026-06-04',
    changes: {
      features: [
        'New ability: Helper — click to summon a ranged ally that fights alongside the ship for 20 seconds. No cap; stack them up.',
        'New ability: Telekinesis — hold to create a force field at your cursor. Drag it to push enemies away with distance-based falloff.',
        'New ability: Solar Flare — hold toward enemies to emit a continuous damage beam. Power drains every 0.25s while active.',
        'Enemies now target and shoot at Helper allies — use them as bait.',
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
        'When the shield breaks it enters a cooldown before regenerating at half the starting amount',
        'Space metal can instantly refill the shield — press F or click the HUD button',
        'New upgrade: Fire Rate — increase auto-turret fire rate (3 tiers)',
        'New upgrade: Shield Strength — increase maximum shield (3 tiers)',
        'New upgrade: Engine Boost — increase ship speed (3 tiers)',
      ],
      fixes: [
        'Shop upgrade buttons are now fully clickable (previously only the text was clickable, not the surrounding box)',
        'Fixed an issue where if 2 player bullets were in the air and one hit an enemy, the other would be removed',
      ],
      ui: ['The player ship is now not visible in the background before starting a game'],
    },
  },
  {
    version: '0.6.1',
    date: '2026-06-02',
    changes: {
      features: [
        'Shield now reflects enemy velocity on contact — enemies bounce off the dome instead of just being snapped back to the edge',
        'Shield blocks bomber explosions if the ship is inside the dome and the bomber explodes outside it',
        'Rocket now detonates when it physically touches an enemy — no more flying past an enemy and still damaging it from empty space',
        'Shield grandfathering is now per-tick — an enemy that was inside when the shield dropped can still walk out, but the moment it leaves it loses its grandfathered status and gets bounced back if it tries to re-enter',
      ],
      ui: [
        'Camera now zooms based on viewport area — the same total amount of world is visible regardless of screen size or fullscreen state',
        'Mobile shows more world area (zoomed-out) so enemies approaching from the sides are visible',
        'Mobile-friendly polish: bigger pause / fullscreen tap targets (44×44) and a much taller game area on phones',
        'Fullscreen now works on iPhone Safari via a CSS-based fallback (Fullscreen API is unsupported there)',
        'HUD elements (level bar, score, pause / fullscreen buttons, ability hotbar) now scale with the gameplay area — going fullscreen no longer leaves the UI looking tiny',
        'Pause / settings / upgrade / game-over screens scale with the HUD too',
        'Game starts a bit more zoomed-out by default — more of the surrounding space is visible at a glance',
      ],
      fixes: [
        'Going fullscreen no longer reveals more of the game world — gameplay difficulty stays consistent across window sizes',
      ],
    },
  },
  {
    version: '0.6.0',
    date: '2026-06-02',
    changes: {
      features: [
        'New ability: Rocket — launches from your ship and flies to the target, exploding on arrival with a bigger blast radius than the meteor',
        'New ability: Shield — places a stationary dome that absorbs enemy projectiles and physically blocks enemies from entering (enemies already inside when the shield drops stay free until they leave)',
        'New ability: Sun — drops a massive stationary AoE damage zone that lasts a few seconds — devastating, very long cooldown',
        'Six abilities total now visible in the hotbar, unlockable from the shop',
      ],
      fixes: [
        'Weapon order in the hotbar and shop is now controlled by a single WEAPON_ORDER array — no more drift between the two UIs when a new weapon is added',
      ],
    },
  },
  {
    version: '0.5.1',
    date: '2026-06-02',
    changes: {
      features: [
        'Space metal now flies into the ship when you click it (same magnetic arc as power orbs) instead of teleporting away. Click semantics unchanged — you still have to click to claim it; only the visual flight is new.',
      ],
      fixes: [
        'Wave delay no longer freezes in-flight meteors / homing power orbs — only enemy spawning is gated by the delay',
        'Game now opens with the camera already centered on your ship — no more brief "rush across space" on first load or after restarting.',
        'Bombers now explode when they reach your ship — the on-death AoE fires on every death, not just when you shoot them down. Letting a bomber ram you now hurts as intended.',
        'Swarm enemies now weave in sync with the game-speed setting (and freeze cleanly when paused) — their side-to-side motion is driven by game time instead of the wall clock.',
      ],
      ui: ['Game-speed buttons in Settings now announce their selected state to screen readers.'],
    },
  },
  {
    version: '0.5.0',
    date: '2026-06-02',
    changes: {
      features: [
        'Pause menu — press P or click the pause button. Resumes cleanly with no time-skip',
        'Settings menu — game speed slider (0.5×/1×/2×) accessible from pause',
        'Fullscreen toggle button — uses the Fullscreen API to fill the screen',
        'Speed indicator in the HUD when game speed is not 1×',
      ],
      fixes: [
        'Tank enemies pursue the ship steadily — velocity is now smoothed instead of flipping each frame as the ship reverses',
      ],
      ui: [
        'Upgrade menu now stays a fixed size across tabs — no more heading jumping or layout shifts when switching between Weapons/Ship/Powers',
        'Shooter enemy sprite redesigned — cleaner diamond silhouette with a glowing eye, easier to tell apart from other enemies at a glance',
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
        'Power orbs — enemies now drop collectible blue orbs that magnetically arc toward your ship to restore power',
        'Space metal — rare gold hexagonal drops that must be clicked to collect (premium currency)',
      ],
      ui: ['Space metal counter in the HUD'],
      architecture: [
        'Unified effect system replaces per-ability arrays for cleaner architecture',
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
        'Enemies trickle in near the ship with randomized order and timing instead of all spawning at the map edge at once',
      ],
      ui: [
        'Level progress bar at the top of the HUD — fills as enemies spawn, with milestone dots per wave',
        'HUD now shows "Level X" instead of raw wave numbers',
        'Wave-complete and game-over screens show wave progress within the current level',
      ],
      fixes: [
        'Abilities now sort by power cost (cheapest first), and their hotkey numbers and HUD badges derive from that order so they always match',
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
        'Black Hole Duration upgrade now actually extends the black hole lifetime',
        'Game-over screen no longer shows "New High Score!" when you only tie your best',
      ],
      architecture: [
        'Smoother rendering: black hole gradients are now cached instead of rebuilt each frame',
        'Enemy stats now read from a single source of truth so balance tweaks always apply',
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
      balance: ['Ship damage reduced (10→5) and power regen increased (3→5/s)'],
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
