# CLAUDE.md

Personal portfolio site for Brent Butkow (`brentbutkow.me` / `butkow.com`). A polished single-page
React app that walks the line between **formal and fun** — a global toggle flips the whole site
between a buttoned-up "Professional" presentation and a playful "Fun" mode.

## Stack

- **React 18.3** + **TypeScript 5.5** (strict), **Vite 7** build
- **React Router 7** for client-side routing
- **SCSS Modules** (`*.module.scss`) for scoped styling
- **ESLint + Prettier + Husky** for quality gates
- Deployed on **Vercel** (SPA rewrites in `vercel.json`); optional Vercel Analytics + Speed Insights gated behind env vars

## Commands

```bash
npm run dev           # Vite dev server with HMR
npm run check         # tsc -b && eslint .  ← run this before every commit
npm run format        # prettier --write src
npm run build         # tsc -b && vite build
npm run preview       # serve the production build
npm test              # vitest run (unit tests; npm run test:watch to watch)
```

- **Tests** use **Vitest** (jsdom env, config in [vite.config.ts](vite.config.ts)). They live next to
  the code as `*.test.ts` (e.g. [jokes.test.ts](src/data/jokes.test.ts),
  [fun-mode.test.ts](src/modes/fun-mode.test.ts), [routes.config.test.ts](src/routes/routes.config.test.ts)) —
  follow that colocated pattern for new ones. The Husky pre-commit runs `npm test` and **fails the
  commit if any test fails**.
- **Every custom hook (`useX`) must ship with a unit test.** This is a hard rule — when you add or
  change a hook, add/update its colocated `*.test.ts` in the same change. (Hooks that touch the DOM or
  context — `useFunMode`, `useDocumentTitle` — use `@testing-library/react`'s `renderHook` with the
  appropriate provider/router wrapper; see their tests for the pattern.)

`npm run check` then `npm run format` run automatically via the Husky `pre-commit` hook
([.husky/pre-commit](.husky/pre-commit)). Keep both green — don't bypass the hook.

## Architecture

Entry: [main.tsx](src/main.tsx) → [App.tsx](src/App.tsx). `App` wires up the provider/layout shell:

```
BrowserRouter → FunModeProvider → WaterRippleLayer + Navbar + Router   (Footer + analytics outside)
```

- **Routing is centralized and data-driven.** [routes.config.tsx](src/routes/routes.config.tsx)
  exports `routePaths`, the `routes: AppRoute[]` array, and fun-stuff subroutes.
  [Router.tsx](src/routes/Router.tsx) maps over `routes`, and [Navbar.tsx](src/components/navbar/Navbar.tsx)
  reuses the same array (filtering out `dontShowInNavbar`). Each route also carries a `title`, which
  [useDocumentTitle.ts](src/routes/useDocumentTitle.ts) (called in `Router`) syncs to `document.title`
  per route (unmatched paths fall back to the `*`/404 title). **Add a page by editing the config —
  never hard-code a path, a nav link, or a tab title.**
- **State** is deliberately minimal: React Context for the global Fun-mode flag, `useState` for local
  UI (mobile menu, joke selection, code tabs). No Redux / external store.
- **Content lives in `data.ts` files**, not in JSX. Each page folder has a `data.ts` typed against
  [data/data.types.ts](src/data/data.types.ts). Components are presentational — they receive data via props.

### Layout / folder conventions

- **A file is named after its primary export.** A component lives in a file named for the component
  (`Hero.tsx`), and a hook in a file named for the hook (`useFunMode.ts`, `useDocumentTitle.ts`) —
  the filename's case follows the export (`PascalCase` component, `useCamelCase` hook). Don't name a
  hook file after its concept (`FunMode.ts` for `useFunMode` is wrong → `useFunMode.ts`). Plain
  utility modules with no single hook/component (e.g. `fun-mode.ts`, `jokes.ts`, `data.ts`) stay
  lowercase/kebab-case.
- **Folder-per-component**: `Thing/Thing.tsx` + `Thing/Thing.module.scss` side by side.
- **Folder-per-page** under [src/pages/](src/pages): `PageName.tsx`, `PageName.module.scss`, `data.ts`,
  and a local `components/` for page-specific cards (e.g. `ExperienceCard`, `AchievementCard`).
- Cross-page primitives live in [src/components/](src/components): `cards/`, `navbar/`, `footer/`,
  `effects/`, `PageFormatting/` (`PageLayout`, `PageHeader`), `ToggleableSection/`, `CodeSection/`, `utils/`.
- Pages: `home`, `experience`, `education`, `achievements`, `fun-stuff` (+ `GulagSort` / `CourseProjects`
  subpages), `contact-me`, `not-found`.

### Page layout language (content-first, NOT card-based)

The content pages deliberately avoid the "title + subtitle + grid of boxes" template. Keep them
editorial:

- **`PageHeader` renders a title only** — no decorative subtitle. Don't reintroduce filler subheadings
  that just restate the title.
- **The two `cards/` atoms are editorial rows, not boxes.** `DetailCard` (Experience, Education) is a
  timeline row: a mono **date rail** (`grid-template-columns: 150px 1fr`) beside the content.
  `ArticleOrLinkCard` (Achievements, Fun Stuff, Contact) is a list row with a hairline `border-top`
  divider, a left accent bar + `→`/`↗` on hover for links. Achievements groups rows under a year rail.
  New content lists should follow this row+hairline pattern, not a bordered card.
- **Class-collision gotcha**: page-specific `*Card` styles compose onto the same element as the shared
  atom's `.card` (CSS-modules merge both classes). Don't set `display`/layout on the page-level `.card`
  — it races the atom's. Put layout on an inner wrapper (see `ContactCard`'s `.row`).

## The Professional ↔ Fun toggle (core feature)

This is the personality of the site — treat it as a first-class concern, not an afterthought.

- **Source of truth**: [contexts/FunModeProvider.tsx](src/contexts/FunModeProvider.tsx) holds the
  `isFunMode` boolean. Read it anywhere with `useFunMode()` from [contexts/FunMode.ts](src/contexts/FunMode.ts)
  (the hook throws if used outside the provider).
- **Persistence + the CSS hook**: [modes/fun-mode.ts](src/modes/fun-mode.ts) persists the flag to
  `localStorage` and toggles the `fun-mode` class on `<html>`. This class is the bridge to styling.
- **The toggle UI**: [components/ModeToggle.tsx](src/components/ModeToggle.tsx) is the
  Professional/Fun switch, rendered in the Navbar with `label1="Professional" label2="Fun"`.

When adding anything, ask "how should this behave in each mode?" Three established patterns:

1. **Conditional rendering in TSX** — gate playful content with `isFunMode`
   (e.g. the jokes section in [HomePage.tsx](src/pages/home/HomePage.tsx), the WaterRipple WebGL
   background, the `onlyShowInFunMode` flag on hero actions / achievements).
2. **Swapped copy** — provide a formal and a fun string and pick by mode
   (e.g. `subtitle` vs `subtitleFun` in [home/data.ts](src/pages/home/data.ts)).
3. **CSS reactions** — style against the root class: `:global(html.fun-mode) & { ... }` inside a
   module to add animation/glow only in Fun mode.

Keep Professional mode genuinely professional: clean, calm, recruiter-ready. Fun mode is where the
animations, rainbow glows, jokes, and easter eggs (the `/404` "Like the number 404?" link, Gulag Sort)
come alive.

## Styling & polish

- **Design tokens** are CSS custom properties in `:root` in [src/index.scss](src/index.scss). The
  system is a **refined-dark, editorial-technical** look: a deep ink palette (`--bg`, `--surface`,
  `--border`) with a single disciplined **warm-gold accent** (`--accent` + `--accent-rgb` for alpha
  compositing — use `rgba(var(--accent-rgb), 0.x)`, never hard-code the mint of old). Type is set in
  tokens too: headings and body both use **IBM Plex Sans** (`--font-display` = `--font-body`; headings
  just carry more weight — 600/700 — and tighter tracking for hierarchy), with `--font-mono`
  (**IBM Plex Mono**) for eyebrows / nav / metadata / labels. Deliberately no separate "display"
  typeface — the look stays plain-spoken and technical, not designer-y.
  Atmosphere comes from one restrained radial glow + a fixed film-grain overlay (`body::before`), not
  stacked gradient blobs. Use the variables — don't hard-code colors or font families.
- **Shared SCSS** lives in [styles/_shared.scss](src/styles/_shared.scss): the `card-base` mixin
  (the consistent card look — hairline border, `--surface` fill, `--radius`, soft elevation + an
  inset top highlight) and the Fun-mode keyframes (`float`, `glow`, `rainbow-shadow`). Pull it in
  with `@use '../../styles/shared' as *;` then `@include card-base;`. Since the content pages are now
  de-carded into editorial rows, `card-base` is mainly the home **joke card** — which is also what
  keeps the Fun-mode rainbow glow alive after the de-carding. Reach for it only when you genuinely
  want a boxed surface; default to the row+hairline page-layout language above instead.
- **Responsive**: the `.shell` wrapper ([App.module.scss](src/App.module.scss)) caps width and the
  Navbar collapses to a hamburger under 1100px. Design mobile-first.
- **Accessibility is part of "polished"**: semantic elements, real `<button>`s, `aria-label` /
  `aria-expanded` / `aria-checked` / `role="switch"` (see ModeToggle, Navbar, ToggleableSection).
  Maintain this bar on new interactive elements.

## Code quality expectations

This repo is a showcase — the code itself should look as polished as the UI.

- **Strict TypeScript, no `any`.** Model data with explicit types in `*.types.ts`; reuse the shared
  domain types in [data/data.types.ts](src/data/data.types.ts).
- **Validate untrusted/JSON data** rather than casting — see the `isJokeType` type guard in
  [data/jokes.ts](src/data/jokes.ts).
- **Clean up effects**: cancel `requestAnimationFrame`, remove listeners, clear timeouts on unmount
  (see [WaterRipple.tsx](src/components/effects/WaterRipple.tsx), [CodeSection.tsx](src/components/CodeSection/CodeSection.tsx)).
- **External links go through [SafeLink](src/components/utils/SafeLink.tsx)** (auto `target="_blank"`
  + `rel="noopener noreferrer"`); internal links use React Router `Link`.
- **Comments are lean and present-tense.** Explain what the code does now and why — never how it
  used to work, and never narrate a change ("no longer…", "previously…", "the old approach"). If the
  code is self-explanatory, write no comment. Prefer one tight line over a paragraph.
  - Bad: `// One ripple per press — covers mouse and touch. Dragging a finger no longer spams a stream of ripples (which looked bad against the MAX_RIPPLES cap).`
  - Good: `// One ripple per press — covers mouse and touch.`
  - Bad: `// Fun mode: lighter bar so it sits in the water rather than reading as a near-black slab against the light-blue background.`
  - Good: _(no comment — the code speaks for itself)_
- **Named exports only — no `default` exports.** New files use named exports
  (`export function Hero() {}`, `export const routePaths = …`). Existing default exports are migrated
  opportunistically as files are touched, not in a big-bang pass — so don't churn unrelated files
  just to convert them.
- Match the surrounding style: 2-space indent, single quotes, no semicolons, ~100 col width
  (enforced by Prettier — see [.prettierrc](.prettierrc)). Let Prettier format; don't fight it.

## Notes

- `.github/workflows/copilot-instructions.md` is an older, longer guideline doc. Where it disagrees
  with this file or the code, trust the code and this file (e.g. color tokens live in `index.scss`,
  not `_shared.scss`).
- `cool-effects.scss` and `TODO.md` at the root are scratch/reference, not wired into the build.
