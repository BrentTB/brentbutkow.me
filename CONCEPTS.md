# CONCEPTS

Hand-curated cross-reference: idea → entry-point files. Pairs with [CLAUDE.md](CLAUDE.md) (rules). Use this to find _where_ a concept lives before opening source.

## Dual personality (Professional ↔ Fun)

The site flips between recruiter-ready and playful. Not a flag — a system with three patterns (conditional render, swapped copy, CSS reactions).

- State: [src/contexts/FunModeProvider.tsx](src/contexts/FunModeProvider.tsx), [src/contexts/FunMode.ts](src/contexts/FunMode.ts) (`useFunMode` hook)
- Persistence + CSS bridge: [src/modes/fun-mode.ts](src/modes/fun-mode.ts) (localStorage + `html.fun-mode` class)
- Toggle UI: [src/components/ModeToggle.tsx](src/components/ModeToggle.tsx)
- Conditional content example: [src/pages/Home/HomePage.tsx](src/pages/Home/HomePage.tsx) (jokes)
- Swapped copy example: [src/pages/Home/data.ts](src/pages/Home/data.ts) (`subtitle` vs `subtitleFun`)
- CSS reaction pattern: `:global(html.fun-mode) & { ... }` inside any `*.module.scss`

## Routing as single source of truth

Add a page = edit one config file. Nav, router, doc-title, 404 all derive.

- Config: [src/routes/routes.config.tsx](src/routes/routes.config.tsx) — exports `routePaths`, `routes`
- Renderer: [src/routes/Router.tsx](src/routes/Router.tsx)
- Head/SEO sync (title, description, canonical, OG): [src/routes/useRouteMeta.ts](src/routes/useRouteMeta.ts)
- Nav reuses config: [src/components/navbar/Navbar.tsx](src/components/navbar/Navbar.tsx) (filters `dontShowInNavbar`)

## Content/JSX separation

Pages render structure; content lives next to them in `data.ts`, typed centrally.

- Shared types: [src/data/data.types.ts](src/data/data.types.ts)
- Pattern: each `src/pages/<page>/` has `<Page>.tsx` + `data.ts` + `<Page>.module.scss`

## Editorial page layout (not card grids)

Pages are de-carded — hairline rows, not boxes. Two atoms cover most cases.

- Timeline rows (Experience, Education): [src/components/cards/DetailCard.tsx](src/components/cards/DetailCard.tsx)
- Link rows (Achievements, Fun Stuff, Contact): [src/components/cards/ArticleOrLinkCard.tsx](src/components/cards/ArticleOrLinkCard.tsx)
- Page header (title only, no subtitle): [src/components/PageFormatting/PageHeader.tsx](src/components/PageFormatting/PageHeader.tsx)
- Class-collision gotcha: don't set layout on page-level `.card` — put it on an inner wrapper (see ContactCard)

## Design tokens & shared SCSS

Atomic colors, fonts, spacing live in CSS custom properties — never hard-code.

- Tokens: [src/index.scss](src/index.scss) `:root` (deep-ink palette + warm-gold `--accent`)
- Mixins + Fun-mode keyframes: [src/styles/\_shared.scss](src/styles/_shared.scss) (`card-base`, `float`, `glow`, `rainbow-shadow`)
- Use via `@use '../../styles/shared' as *;`

## Null Space (canvas game inside the portfolio)

Full HTML5 game with engine, systems, abilities, semver changelog. Lives at [src/projects/NullSpace/](src/projects/NullSpace/).

- Game loop: `engine/game-loop.ts` (`createInitialState`, `updateGameState`, …)
- Subsystems: `engine/abilities/`, `engine/entities/`, `engine/systems/`, `engine/world/`, `spaceMetalAbilities/`
- Changelog rule: update `CHANGELOG` + `GAME_VERSION` in `data.ts` per semver (major = breaking save, minor = feature, patch = balance/fix)
- Reusable primitive example: `engine/math/homing.ts` (`homeTowardTarget`) — used by power orbs and clicked space metals

## Malicious UX (museum of dark patterns)

Sixteen deliberately hostile widgets, each in a "vitrine" beside a museum wall label. Lives at [src/projects/MaliciousUx/](src/projects/MaliciousUx/).

- Add a specimen: component folder under `exhibits/` (`X.tsx` + `X.module.scss` + `data.ts` for its microcopy), a `placards` entry + `ExhibitId` in the project's `data.ts`/`malicious-ux.types.ts`, then a row in `exhibits/registry.ts`. `registry.test.ts` fails if any of those are missed.
- **Keyboard-honesty contract**: hostility fires on pointer input only, gated by `usePointerIntent`. Tab + Enter always does what the label says. `exhibits/keyboard-honesty.test.tsx` is the guard — a new exhibit with a pointer trick belongs in it.
- Shared behaviours: `useEvasiveTarget` (+ pure `engine/evade.ts`), `useOffscreenReset`, `useReturningPrompt`
- Specimen palette (deliberately _not_ the site tokens — the widgets are meant to look foreign): `styles/_exhibit.scss`
- Fun mode turns the dials up rather than changing the patterns: `hostilityFor()` in `data.ts`
- The back-button trap never touches real `history` — the browser chrome is drawn

## Effects & atmosphere

- Background water-ripple layer (mouse/touch reactive, Fun-mode only): [src/components/effects/WaterRipple.tsx](src/components/effects/WaterRipple.tsx)
- Film-grain + radial glow: `body::before` in [src/index.scss](src/index.scss)

## Test gates (cannot bypass)

[.husky/pre-commit](.husky/pre-commit) runs: `typecheck:fast` → eslint staged → vitest related → prettier. Every hook ships with a colocated test; every bug fix ships with a regression test.

## External entry points

- Vercel SPA rewrites: [vercel.json](vercel.json)
- Analytics (env-gated): `@vercel/analytics`, `@vercel/speed-insights` in [src/App.tsx](src/App.tsx)
