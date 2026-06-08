# CLAUDE.md

Personal portfolio site for Brent Butkow (`brentbutkow.me` / `butkow.com`). Single-page React app
with a global **Professional ↔ Fun** toggle that flips the whole site between recruiter-ready and
playful.

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

## Architecture

Entry: [main.tsx](src/main.tsx) → [App.tsx](src/App.tsx). `App` wires the shell:

```
BrowserRouter → FunModeProvider → WaterRippleLayer + Navbar + Router   (Footer + analytics outside)
```

- **Routing is centralized + data-driven.** [routes.config.tsx](src/routes/routes.config.tsx) exports
  `routePaths`, `routes: AppRoute[]`, and fun-stuff subroutes. [Router.tsx](src/routes/Router.tsx) maps
  over `routes`; [Navbar.tsx](src/components/navbar/Navbar.tsx) reuses it (filtering `dontShowInNavbar`).
  Each route's `title` syncs to `document.title` via [useDocumentTitle.ts](src/routes/useDocumentTitle.ts)
  (called in `Router`; unmatched → `*`/404 title). **Add a page by editing the config — never hard-code a path, nav link, or title.**
- **State is minimal**: Context for the global Fun-mode flag, `useState` for local UI. No Redux/external store.
- **Content lives in `data.ts`**, not JSX — typed against [data/data.types.ts](src/data/data.types.ts).
  Components are presentational, fed via props.

### Layout / folder conventions

**Casing rule** — filename = primary export:

| Kind                             | Case         | Examples                                                |
| -------------------------------- | ------------ | ------------------------------------------------------- |
| `.tsx` component                 | `PascalCase` | `Hero.tsx`, `PageHeader.tsx`                            |
| Hook (`useX`)                    | `camelCase`  | `useFunMode.ts`, `useDocumentTitle.ts`                  |
| Plain `.ts` (utils, data, logic) | `kebab-case` | `fun-mode.ts`, `jokes.ts`, `black-hole.ts`              |
| Folder mapping 1:1 to a `.tsx`   | `PascalCase` | `NullSpace/`, `GulagSort/`, `FunStuff/`, `Hero/`        |
| Folder for internal organization | `camelCase`  | `engine/`, `systems/`, `spaceMetalAbilities/`, `utils/` |

Don't name a hook file after its concept (`FunMode.ts` is wrong → `useFunMode.ts`).
Folder-per-component: `Thing/Thing.tsx` + `Thing/Thing.module.scss`.
Folder-per-page under [src/pages/](src/pages): `PageName.tsx`, `PageName.module.scss`, `data.ts`, plus a
local `components/` (PascalCase folders inside). Cross-page primitives live in [src/components/](src/components).

### Page layout language (content-first, NOT card-based)

Content pages avoid the "title + subtitle + grid of boxes" template. Keep them editorial:

- **`PageHeader` renders a title only** — no decorative subtitle restating the title.
- **The two `cards/` atoms are editorial rows, not boxes.** `DetailCard` (Experience, Education) is a
  timeline row: mono **date rail** (`grid-template-columns: 150px 1fr`) beside content. `ArticleOrLinkCard`
  (Achievements, Fun Stuff, Contact) is a list row with a hairline `border-top`, left accent bar + `→`/`↗`
  on hover for links. Achievements groups rows under a year rail. New lists follow this row+hairline pattern.
- **Class-collision gotcha**: page-specific `*Card` styles compose onto the same element as the atom's
  `.card` (CSS-modules merge both). Don't set `display`/layout on the page-level `.card` — it races the
  atom's. Put layout on an inner wrapper (see `ContactCard`'s `.row`).

## The Professional ↔ Fun toggle (core feature)

The site's personality — treat it as first-class.

- **Source of truth**: [contexts/FunModeProvider.tsx](src/contexts/FunModeProvider.tsx) holds `isFunMode`.
  Read it with `useFunMode()` from [contexts/FunMode.ts](src/contexts/FunMode.ts) (throws outside the provider).
- **Persistence + CSS hook**: [modes/fun-mode.ts](src/modes/fun-mode.ts) persists to `localStorage` and
  toggles the `fun-mode` class on `<html>` — the bridge to styling.
- **Toggle UI**: [components/ModeToggle.tsx](src/components/ModeToggle.tsx), in the Navbar with `label1="Professional" label2="Fun"`.

When adding anything, ask "how should this behave in each mode?" Three patterns:

1. **Conditional render** — gate playful content with `isFunMode` (jokes in [HomePage.tsx](src/pages/home/HomePage.tsx),
   WaterRipple background, the `onlyShowInFunMode` flag).
2. **Swapped copy** — formal vs fun string picked by mode (`subtitle` vs `subtitleFun` in [home/data.ts](src/pages/home/data.ts)).
3. **CSS reactions** — `:global(html.fun-mode) & { ... }` inside a module for Fun-only animation/glow.

Professional mode stays clean, calm, recruiter-ready. Fun mode gets the animations, rainbow glows, jokes,
easter eggs (`/404` "Like the number 404?" link, Gulag Sort).

## Styling & polish

- **Design tokens**: CSS custom properties in `:root` in [src/index.scss](src/index.scss). **Refined-dark,
  editorial-technical** look — deep ink palette (`--bg`, `--surface`, `--border`) + a single **warm-gold
  accent** (`--accent`; use `rgba(var(--accent-rgb), 0.x)` for alpha, never hard-code). Type: **IBM Plex Sans**
  for headings + body (`--font-display` = `--font-body`; headings just heavier 600/700, tighter tracking),
  **IBM Plex Mono** (`--font-mono`) for eyebrows/nav/metadata/labels. No separate display typeface.
  Atmosphere = one radial glow + a fixed film-grain overlay (`body::before`). Use the variables — don't hard-code colors or fonts.
- **Shared SCSS**: [styles/\_shared.scss](src/styles/_shared.scss) has the `card-base` mixin (hairline
  border, `--surface` fill, `--radius`, soft elevation + inset top highlight) and Fun-mode keyframes
  (`float`, `glow`, `rainbow-shadow`). Use via `@use '../../styles/shared' as *;` then `@include card-base;`.
  Since pages are de-carded into rows, `card-base` is mainly the home **joke card** (which keeps the Fun-mode
  rainbow glow alive). Reach for it only for a genuinely boxed surface; default to row+hairline above.
- **Responsive**: `.shell` ([App.module.scss](src/App.module.scss)) caps width; Navbar collapses to a hamburger under 1100px. Mobile-first.
- **Accessibility**: semantic elements, real `<button>`s, `aria-label`/`aria-expanded`/`aria-checked`/`role="switch"`
  (see ModeToggle, Navbar, ToggleableSection). Maintain this bar on new interactive elements.

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

## Null Space game changelog

When changing the Null Space game (`src/pages/fun-stuff/subpages/NullSpace/`), update `CHANGELOG` and
`GAME_VERSION` in [NullSpace/data.ts](src/pages/fun-stuff/subpages/NullSpace/data.ts). Semver:

- **Major (x.0.0)**: breaking (save-format incompatibility, removed features)
- **Minor (0.x.0)**: new features (enemies, abilities, upgrades, UI)
- **Patch (0.0.x)**: bug fixes, balance tweaks, visual polish

Each entry has `version`, `date`, `changes` with optional `breaking`, `features`, `balance`, `fixes` arrays.
Use `balance` for pure data-value changes (damage, costs, speeds) with no code change. Changelog shows collapsed below the game canvas on desktop.
