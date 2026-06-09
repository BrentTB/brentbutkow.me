# CLAUDE.md

Personal portfolio site for Brent Butkow (`brentbutkow.me` / `butkow.com`). Single-page React app
with a global **Professional ↔ Fun** toggle that flips the whole site between recruiter-ready and
playful.

Scoped instructions live in nested `CLAUDE.md` files — load on demand when you touch those areas:

- [src/CLAUDE.md](src/CLAUDE.md) — architecture, routing, folder/casing conventions, the Fun toggle
- [src/styles/CLAUDE.md](src/styles/CLAUDE.md) — design tokens, shared SCSS, responsive, a11y
- [src/pages/CLAUDE.md](src/pages/CLAUDE.md) — page layout language (editorial rows, cards/ atoms)
- [src/pages/fun-stuff/subpages/NullSpace/CLAUDE.md](src/pages/fun-stuff/subpages/NullSpace/CLAUDE.md) — Null Space game changelog/semver rule

## Skills

ALWAYS invoke the Caveman + Token Reducer skills as the **very first action** on any task —
before reading files, thinking, planning, or implementing, not just before replying. They are the
first tool calls of your first turn. Stop only if told to.

## Stack

- **React 18.3** + **TypeScript 5.5** (strict), **Vite 7**
- **React Router 7**
- **SCSS Modules** (`*.module.scss`)
- **ESLint + Prettier + Husky**
- Deployed on **Vercel** (SPA rewrites in `vercel.json`); optional Analytics + Speed Insights gated behind env vars

## Commands

```bash
npm run dev           # Vite dev server with HMR
npm run check         # tsc -b && eslint .  ← run before every commit
npm run format        # prettier --write src
npm run build         # tsc -b && vite build
npm run preview       # serve the production build
npm test              # vitest run (test:watch to watch)
```

- **Tests**: **Vitest** (jsdom, config in [vite.config.ts](vite.config.ts)), colocated as `*.test.ts`
  (e.g. [jokes.test.ts](src/data/jokes.test.ts), [fun-mode.test.ts](src/modes/fun-mode.test.ts),
  [routes.config.test.ts](src/routes/routes.config.test.ts)). Husky pre-commit runs `npm test` and **fails on any failure**.
- **Hard rule: every custom hook (`useX`) ships with a colocated unit test, added/updated in the same change.**
  DOM/context hooks (`useFunMode`, `useDocumentTitle`) use `renderHook` with a provider/router wrapper — see their tests.
- **Hard rule: every bug fix includes a regression test in the same change.** It must fail without the
  fix and pass with it — before committing, revert the fix and re-run `npm test` to confirm it fails.
  Name it so a future reader knows what it guards. See `updateGameState — state field round-trip persistence`
  in [game-loop.test.ts](src/pages/fun-stuff/subpages/NullSpace/engine/game-loop.test.ts) (guards stale
  `...state` spread losing locally-mutated state — TypeScript can't catch it).

`npm run check` then `npm run format` run via the Husky [pre-commit](.husky/pre-commit) hook. Keep both green — don't bypass.

## Code quality expectations

This repo is a showcase — code should look as polished as the UI.

- **Strict TypeScript, no `any`.** Model data with explicit types in `*.types.ts`; reuse [data/data.types.ts](src/data/data.types.ts).
- **No magic-string union types.** Define a `const` object and derive the type so values are also runtime identifiers:

  ```ts
  // Good — values accessible as ProjectileOwner.ship
  export const ProjectileOwner = { ship: 'ship', player: 'player' } as const
  export type ProjectileOwner = (typeof ProjectileOwner)[keyof typeof ProjectileOwner]

  // Bad — 'ship' is a magic string everywhere
  export type ProjectileOwner = 'ship' | 'player'
  ```

  Applies to any string-union used as a discriminator, enum-like set, or lookup key. Object and type share the same identifier.

- **Validate untrusted/JSON data** rather than casting — see `isJokeType` in [data/jokes.ts](src/data/jokes.ts).
- **Clean up effects**: cancel `requestAnimationFrame`, remove listeners, clear timeouts on unmount (see
  [WaterRipple.tsx](src/components/effects/WaterRipple.tsx), [CodeSection.tsx](src/components/CodeSection/CodeSection.tsx)).
- **External links via [SafeLink](src/components/utils/SafeLink.tsx)** (auto `target="_blank"` + `rel="noopener noreferrer"`); internal links use Router `Link`.
- **Comments lean + present-tense.** Say what the code does now and why — never how it used to work, never
  narrate a change ("no longer…", "previously…"). Self-explanatory code gets no comment. One tight line over a paragraph.
  - Bad: `// One ripple per press — covers mouse and touch. Dragging a finger no longer spams a stream of ripples...`
  - Good: `// One ripple per press — covers mouse and touch.`
- **Named exports only — no `default`.** New files use named exports. Migrate existing defaults
  opportunistically as files are touched — don't churn unrelated files just to convert.
- **No re-export shims when refactoring.** Moving/renaming a file or symbol? Update every call site to
  the new path in the same change — never leave the old path re-exporting from the new one for
  backwards-compat. Grep the old path/name, fix all importers, delete the old module.
- **Extract reusable behaviour into utility files; don't bury it inline.** If a new primitive could
  plausibly serve another feature, put it in a dedicated helper with a generic signature and compose it.
  Canonical example: [homing.ts](src/pages/fun-stuff/subpages/NullSpace/engine/homing.ts) — a `homeTowardTarget`
  primitive (position, target, strength, dt) used by power orbs and clicked space metals in
  [collectibles.ts](src/pages/fun-stuff/subpages/NullSpace/engine/collectibles.ts). Build the helper when
  the second use case is obvious from the task at hand — not for hypotheticals. One caller, no clear future caller → keep inline, extract when the second arrives.
- **Style**: 2-space indent, single quotes, no semicolons, ~100 col (Prettier — [.prettierrc](.prettierrc)). Let Prettier format; don't fight it.
