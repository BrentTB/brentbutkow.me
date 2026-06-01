# Event Horizon

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
EventHorizon/
├── engine/          # Pure game logic — zero React imports, trivially testable
│   ├── types.ts     # All type definitions (Entity, GameState, Ship, Enemy, etc.)
│   ├── game-loop.ts # Core update: updateGameState(state, dt, input) → state
│   ├── entities.ts  # Factory functions: createShip, createEnemy, createProjectile
│   ├── collision.ts # Circle-circle collision detection + distance
│   ├── waves.ts     # Wave generation: getWave(n) → EnemySpawn[]
│   ├── abilities.ts # Player ability logic (meteor strike, power costs)
│   └── persistence.ts # localStorage high score with validation
├── renderer/        # Canvas 2D rendering — reads state, draws frames
│   ├── renderer.ts  # renderFrame(ctx, state, camera, sprites, stars)
│   ├── camera.ts    # Ship-follow camera with smooth lerp
│   ├── sprites.ts   # Pixel art sprite definitions as 2D color arrays
│   ├── sprite-cache.ts # Pre-renders sprites to OffscreenCanvas at boot
│   └── starfield.ts # Parallax star background
├── components/      # React UI overlays (HTML, not canvas)
│   ├── GameHUD.tsx   # HP bar, power bar, wave/score, ability buttons
│   └── GameOverlay.tsx # Menu, wave complete, game over screens
├── useEventHorizon.ts # Main hook: wires engine + renderer + input + React state
├── EventHorizon.tsx   # Page component: canvas + HUD + overlays
└── data.ts            # Game constants (centralized for tuning)
```

### Key design decisions

**Pure engine** — `updateGameState(state, dt, input)` is a pure function. It takes the current state, a time delta, and player input, and returns the next state. No side effects, no DOM, no React. This makes the game logic trivially testable with Vitest.

**Pixel art sprites** — Sprites are defined as 2D arrays of hex color strings in `sprites.ts`. At boot, `sprite-cache.ts` rasterizes them to `OffscreenCanvas` at 3x scale. The renderer draws them with `imageSmoothingEnabled = false` for crisp pixel art.

**HTML HUD** — The HUD (health, power, score, abilities) is rendered as HTML/CSS overlaid on the canvas, not drawn on the canvas itself. This keeps it accessible (real buttons, keyboard support) and styled with the site's design tokens.

**Power system** — Abilities cost power to cast (not just cooldown). Power regenerates passively and is awarded when enemies die. This creates a resource management layer on top of the action.

**Lazy loaded** — The entire game is code-split via `React.lazy()` so it doesn't affect initial page load for visitors not playing.

## Game constants

All tunable values are centralized in `data.ts`:

- Ship stats (HP, damage, fire rate, speed, attack range)
- Power settings (max, regen rate, starting amount)
- Meteor strike (delay, cooldown, power cost, damage, AoE radius)
- Enemy stats per type (HP, speed, damage, score value, power reward)
- Projectile and particle settings

## Future phases

Future planned phases include (but are not limited to):

- More abilities (black holes, shields, telekinesis, friendly aliens, suns)
- Ship types with different stat profiles and swappable weapons
- Sprite animations (engine thrust, firing, enemy death sequences)
- Boss enemies with unique mechanics
- Collectible space metal for premium upgrades
- Story/lore delivered between waves
