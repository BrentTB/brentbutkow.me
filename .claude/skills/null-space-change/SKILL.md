---
name: null-space-change
description: >-
  Runbook for making a safe change to the Null Space game (engine, renderer, abilities,
  balance): determinism rules, the GameState round-trip test, changelog + version bump.
  Use for any change under src/projects/NullSpace/ — features, fixes, balance tweaks,
  new abilities, renderer work.
---

# Change Null Space safely — runbook

The engine is deterministic and save-compatible; most shipped bugs here came from breaking
one of those two properties. Read [src/projects/NullSpace/CLAUDE.md](../../../src/projects/NullSpace/CLAUDE.md)
first (semver rule), then follow the steps.

## 1. Know the map

- `engine/` — pure simulation, contract `(state, dt, input) → state`. Key spots:
  `engine/game-loop.ts` (tick), `engine/types.ts` (`GameState`), `engine/upgrade-ids.ts`
  (central upgrade ID registry), `engine/world/persistence.ts` (`saveGame`/`loadGame`),
  `engine/math/random.ts` (the seeded rng), plus `abilities/`, `bosses/`, `calamities/`,
  `ship/`, `systems/`, `world/`. Economy gains (currency, spaceMetal, shards) flow through
  `*Gained` return values from systems like `engine/systems/collectibles.ts` and are banked
  in `engine/game-loop.ts` at several sites (collect, warp loot, pocket-remaining) — an
  economy change must cover all of them, and every `updateGameState` return object
  (dying / wave-cleared / normal) must thread the field.
- `renderer/` — canvas drawing. `renderer/renderer.ts` exports `renderFrame`, the hot loop.
- `data.ts` (NullSpace root) — `CHANGELOG` + `GAME_VERSION`.

## 2. Determinism rules (lint enforces, know why)

No `Math.random`, `Date.now`, `performance.now`, or `new Date` anywhere in `engine/` — use
`rng` from `engine/math/random.ts` (`rng.next()`, `rng.range(min, max)`,
`rng.intRange(min, max)`). Time is threaded through `dt`/state fields. In tests, pin the
sequence with `setSessionSeed(SEED)` before `startGame` (see the top of
`engine/game-loop.test.ts`).

## 3. New `GameState` field? Round-trip test is mandatory

The engine's `...state` spreads silently drop fields a subsystem mutated locally —
TypeScript can't catch it. Copy the pattern from
`updateGameState — state field round-trip persistence` in `engine/game-loop.test.ts`:
mutate the field via `updateGameState`, then run ~60 more frames and assert it survived.
If the field must persist across sessions, also exercise `saveGame`/`loadGame` and decide
what an **old save without the field** loads as (past bug: old saves in a removed phase
loaded into a dead-end).

## 4. Tests (colocated, same change)

- Every engine module change → extend its sibling `*.test.ts` (pattern: build state with
  `createInitialState()` + `startGame(state, ShipKind.fighter)` + helpers, assert on the
  returned state). A Stop hook reminds you if the test file didn't change.
- Bug fix → regression test that **fails with the fix reverted** — actually revert and run
  `npm test` to prove it.
- Assert against imported constants (e.g. `BASE_ABILITY_CAP`), never hardcoded copies —
  balance retunes must not break tests.

## 5. Renderer changes: nothing allocated per frame

`renderFrame` runs 60×/sec. Gradients, paths, sprites, and objects are built once outside
the loop — sprites via `buildSpriteCache()`/`buildAnimationCache()`
(`renderer/sprite-cache.ts`), held in refs in `useNullSpace.ts` and passed in. A per-frame
`{x, y}` literal in `renderer.ts` shipped once; don't add the next one.

## 6. Changelog + version (skip only for pure internal refactors)

In [src/projects/NullSpace/data.ts](../../../src/projects/NullSpace/data.ts): prepend a
`CHANGELOG` entry (`GAME_VERSION` reads `CHANGELOG[0].version`). Shape:
`{ version, date, changes: { breaking? features? balance? fixes? ui? architecture? } }`.
Semver: breaking saves/removed features → major; new player-visible content → minor;
fixes/balance/polish → patch; internal-only work (engine fields, refactors worth noting)
→ patch under `architecture` (that category is hidden by default in the UI). The prose must match the shipped constants — reviews have caught drift. Changelog
text is user-facing copy → humanizer skill applies.

## 7. Verify

`npm run check`, `npm test`. Anything visible (renderer, HUD, page chrome) → follow the
`visual-verify` skill; the game canvas has shipped mobile-overflow bugs, so include the
mobile pass.
