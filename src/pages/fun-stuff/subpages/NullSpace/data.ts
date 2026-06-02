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

export const POWER_DEFAULTS = {
  max: 1000,
  regenRate: 3,
  startingPower: 100,
}

export const METEORITE_STRIKE = {
  delay: 0.3,
  cooldown: 0.05,
  powerCost: 5,
  damage: 15,
  aoeRadius: 40,
} as const

export const METEOR_STRIKE = {
  delay: 0.5,
  cooldown: 1.5,
  powerCost: 40,
  damage: 60,
  aoeRadius: 100,
} as const

export const BLACK_HOLE = {
  cooldown: 2,
  powerCost: 50,
  damage: 3,
  radius: 120,
  pullStrength: 200,
  duration: 4,
} as const

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
    explosionDamage: 30,
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

export const PROJECTILE_SPEED = 400
export const PROJECTILE_LIFETIME = 3
export const PROJECTILE_RADIUS = 4

export const PARTICLE_DEFAULTS = {
  maxParticles: 200,
  explosionCount: 12,
  trailInterval: 0.05,
}

export const GAME_VERSION = '0.5.1'

export type ChangelogEntry = {
  version: string
  date: string
  changes: {
    breaking?: string[]
    features?: string[]
    balance?: string[]
    fixes?: string[]
  }
}

export const CHANGELOG: ChangelogEntry[] = [
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
        'Game-speed buttons in Settings now announce their selected state to screen readers.',
      ],
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
        'Upgrade menu now stays a fixed size across tabs — no more heading jumping or layout shifts when switching between Weapons/Ship/Powers',
        'Tank enemies pursue the ship steadily — velocity is now smoothed instead of flipping each frame as the ship reverses',
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
        'Space metal counter in the HUD',
      ],
      fixes: [
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
        'Level progress bar at the top of the HUD — fills as enemies spawn, with milestone dots per wave',
        'HUD now shows "Level X" instead of raw wave numbers',
        'Enemies trickle in near the ship with randomized order and timing instead of all spawning at the map edge at once',
        'Wave-complete and game-over screens show wave progress within the current level',
      ],
      fixes: [
        'Abilities now sort by power cost (cheapest first), and their hotkey numbers and HUD badges derive from that order so they always match',
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
        'Upgrade shop with tabbed UI (Weapons, Ship, Powers)',
        'Drill-down weapon upgrades: click a weapon to see its sub-upgrades',
        'Ship upgrades: Hull Plating (max HP) and Auto-Turret (damage)',
        'Power regen upgrade',
        'Stardust currency dropped by enemies for purchasing upgrades',
        'Level system: every 3 waves = 1 level, upgrade screen between levels',
        'Hotkeys 1/2/3 to switch between abilities',
        'Seeded random number generator for unique sessions',
      ],
      balance: ['Ship damage reduced (10→5) and power regen increased (3→5/s)'],
      fixes: [
        'Eliminated all magic-string union types in favor of const objects',
        'Renamed from Event Horizon to Null Space',
      ],
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
        'Pixel art sprites rendered on Canvas 2D',
        'Parallax starfield background',
        'High score persistence via localStorage',
        'HUD with HP bar, power bar, score, wave counter',
        'Menu, wave complete, and game over screens',
        'Lazy-loaded so it does not affect site load time',
        'Games hub page under Fun Stuff',
      ],
    },
  },
]
