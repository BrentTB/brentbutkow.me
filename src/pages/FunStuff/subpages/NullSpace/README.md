# Null Space

A space defense game where you control the fabric of space itself to protect your ship.

Your ship auto-flies and auto-attacks enemies. You don't control the ship directly — instead, you launch meteor strikes, create black holes, and warp reality to keep it alive through increasingly difficult waves of enemies.

## How to play

- **Click anywhere** during gameplay to launch a meteor strike at that location
- Meteors cost **power** (blue bar) — it regenerates over time and when you defeat enemies
- Your ship patrols automatically and fires at nearby enemies
- Survive as many waves as you can

## Architecture

The game separates pure logic from rendering and React:

```
NullSpace/
├── engine/        # Pure game logic — zero React imports, trivially testable
│   ├── abilities/
│   ├── entities/
│   ├── math/
│   ├── spaceMetalAbilities/
│   ├── systems/
│   └── world/
├── renderer/      # Canvas 2D rendering — reads state, draws frames
├── components/    # React UI overlays (HTML, not canvas)
│   ├── Development/
│   ├── GameHUD/
│   ├── GameOverlay/
│   ├── PauseMenu/
│   ├── StartScreen/
│   └── UpgradeScreen/
├── useNullSpace.ts # Main hook: wires engine + renderer + input + React state
├── NullSpace.tsx   # Page component: canvas + HUD + overlays
└── data.ts         # Game constants (centralized for tuning)
```

Tests live colocated as `*.test.ts` beside the module they cover (e.g. `engine/systems/combat.test.ts`).

### Key design decisions

**Pure engine** — `updateGameState(state, dt, input)` is a pure function. It takes the current state, a time delta, and player input, and returns the next state. No side effects, no DOM, no React. This makes the game logic trivially testable with Vitest. The engine is split by concern — `abilities/`, `entities/`, `systems/`, `math/`, `world/` — so each piece stays small and independently testable.

**Self-registering abilities** — Each ability lives in its own file under `engine/abilities/` and registers itself in `ABILITY_DEFINITIONS` (`abilities/index.ts`), the single source of truth. Every downstream lookup table — HUD metadata, base stats, effect/ally factories, upgrades — is _derived_ from that map, so adding an ability is just a new file plus one registration line.

**Pixel art sprites** — Sprites are defined as 2D arrays of hex color strings in `sprites.ts`. At boot, `sprite-cache.ts` rasterizes them to `OffscreenCanvas` at 3x scale. The renderer draws them with `imageSmoothingEnabled = false` for crisp pixel art.

**HTML HUD** — The HUD (health, power, score, abilities) is rendered as HTML/CSS overlaid on the canvas, not drawn on the canvas itself. This keeps it accessible (real buttons, keyboard support) and styled with the site's design tokens.

**Power system** — Abilities cost power to cast (not just cooldown). Power regenerates passively and is awarded when enemies die. This creates a resource management layer on top of the action.

**Lazy loaded** — The entire game is code-split via `React.lazy()` so it doesn't affect initial page load for visitors not playing.

## Game constants

All tunable values are centralized in `data.ts`:

- Ship variants (HP, damage, fire rate, speed, attack range, weapon)
- Power settings (max, regen rate, starting amount)
- Per-ability tuning lives next to each ability in `engine/abilities/ability-data.ts`
- Enemy stats per type (HP, speed, damage, score value, power reward)
- Currency drops, collectibles (power orbs, space metal), waves-per-level
- Projectile and particle settings
