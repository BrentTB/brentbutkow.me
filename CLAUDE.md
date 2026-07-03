# CLAUDE.md

Personal portfolio site for Brent Butkow (`brentbutkow.me` / `butkow.com`). Single-page React app
with a global **Professional ↔ Fun** toggle that flips the whole site between recruiter-ready and
playful.

## Codebase navigation

Before grepping or spawning Explore for "where is X" — check this first:

- [CONCEPTS.md](CONCEPTS.md) — hand-curated concept → entry-point map (Fun toggle, routing, editorial layout, Null Space, etc.).

Scoped instructions live in nested `CLAUDE.md` files — load on demand when you touch those areas:

- [src/CLAUDE.md](src/CLAUDE.md) — architecture, routing, folder/casing conventions, the Fun toggle
- [src/styles/CLAUDE.md](src/styles/CLAUDE.md) — design tokens, shared SCSS, responsive, a11y
- [src/pages/CLAUDE.md](src/pages/CLAUDE.md) — page layout language (editorial rows, cards/ atoms)
- [src/projects/NullSpace/CLAUDE.md](src/projects/NullSpace/CLAUDE.md) — Null Space game changelog/semver rule

## Skills

ALWAYS invoke the Caveman + Token Reducer skills as the **very first action** on any task —
before reading files, thinking, planning, or implementing, not just before replying. They are the
first tool calls of your first turn. Stop only if told to.

### User-visible changes — design & copy

- **Before** writing or changing UI a user can see (markup/styles: `.tsx`/`.jsx`/`.scss`/`.css`/`.html`),
  invoke the **frontend-design** skill and apply its principles. A PreToolUse hook reminds you on UI-file edits.
- **After** all edits in a turn that add or change **user-facing copy** (rendered strings, content,
  `data.ts` copy), invoke the **humanizer** skill on that copy to strip AI-writing tells — skip comments,
  code, and identifiers. A Stop hook reminds you at end of turn. If no human-facing text changed, skip it.

### Runbook skills (execution-verified)

Step-by-step runbooks for the recurring multi-file workflows — each was verified by executing
it end-to-end. Invoke before improvising:

- **new-page** — add a route (paths → meta → page → config → sitemap → fun-mode).
- **null-space-change** — change the game safely (determinism, round-trip test, changelog).
- **recall-radar-country** — add a country/source (config records + the copy that enumerates countries).
- **visual-verify** — see a UI change actually working in the browser (the miss class no test catches).

### Automated guardrails (hooks + lint)

These catch the deterministic half of the issues `cr` keeps finding, so they never reach review. Hooks
live in [.claude/hooks/](.claude/hooks/), wired in [.claude/settings.json](.claude/settings.json); their
logic is unit-tested (`npm run test:hooks`).

- **frontend-design-reminder** (PreToolUse) — nudges the frontend-design skill on UI-file edits.
- **humanizer-reminder** (Stop) — flags changed copy-bearing files for the humanizer skill.
- **stale-comment-reminder** (PreToolUse) — blocks comments that narrate history ("no longer",
  "previously", "used to", …). Comments are present-tense.
- **test-companion-reminder** (Stop) — if a `useX` hook or `engine/` module changed without its
  colocated `*.test.ts`, reminds you to add/extend the test.
- **changelog-bump-reminder** (Stop) — if Null Space files changed without a `CHANGELOG`/`GAME_VERSION`
  bump in `data.ts`, reminds you (skip for internal refactors).

ESLint (in [eslint.config.js](eslint.config.js), runs under `npm run check`) also enforces:
no magic-string union types; named exports only (no `default`); no raw `<a>` in JSX except same-page
`#hash` anchors (use `SafeLink`/`Link`); `jsx-a11y` recommended rules; no wall-clock or unseeded
randomness in the Null Space engine (`Math.random`/`Date.now`/`performance.now`/`new Date` — use the
seeded `rng`; the rng module itself is the one exempt seam).

Repo-wide invariant tests in [site-invariants.test.ts](src/site-invariants.test.ts) (run under
`npm test`): every root-absolute asset path referenced in `src/` exists in `public/` (a CV link once
shipped as a 404), and every `import.meta.env.*` is `VITE_`-prefixed or a Vite built-in (Vite silently
gives the client `undefined` otherwise — this shipped broken twice).

[knip](knip.json) (`npm run knip`, part of `npm run check` and a CI step) catches cross-file dead
code `tsc` can't — orphaned files, exports, and types (item 6 below). An export used only inside its
own file isn't "used" to knip: drop the `export` keyword. Genuinely dead code gets deleted, not kept
behind an `export` to dodge the unused warning. New dev-only entry points (extra root `*.html`) go in
knip's `entry` list.

## Before you finish — recurring review misses

The judgment calls `cr` flags most often (ranked from every past review + fix commit). Self-check
before declaring done:

1. **Tests.** The #1 miss — flagged in 10 of 15 past reviews. Not just hooks/engine: a component that
   gained an interactive branch or a `scripts/` module needs one too. Fixed a bug → add a regression
   test that **fails without the fix** (verify by reverting). Added a `GameState` field → add a
   save→load round-trip test (the `...state` spread silently drops locally-mutated fields). Assert
   against **imported constants**, not hardcoded copies of their values; a test that only proves
   "doesn't throw" proves nothing.
2. **Duplication.** Copied a block to a 2nd caller → extract a helper (see [homing.ts](src/projects/NullSpace/engine/homing.ts)).
   Past misses: the same 422-response parser pasted into a hook and a page; the same menu-positioning
   effect in `Select` and `Combobox`.
3. **One source of truth.** Don't re-declare config/derived data (e.g. `ENEMY_CONFIGS` vs `ENEMY_STATS`)
   or re-implement an exported helper in the UI — import it.
4. **Untrusted data.** Parse server/localStorage JSON through the repo's existing guards
   (`isJokeType`-style) — never `as` casts. New external input gets a bound (length cap, phase check
   for old saves). Flagged in 5 different sessions.
5. **Propagation.** Renamed something → grep for stale strings/glyphs across every surface. User-facing
   change → bump the changelog and check its prose matches the shipped constants. Copy propagates too:
   pluralize counts ("1 states" shipped), and re-check placeholders/hints that enumerate options when
   the options vary ("…or company" shown for a country with no company filter).
6. **Dead code.** After a refactor/rename, delete orphaned exports, enum members, config, and re-export
   shims — `tsc` won't catch cross-file dead code (a whole orphaned `SubscriptionPanel.tsx` shipped).
   `npm run knip` now flags this class; run it, then delete or de-export what it finds.
7. **Comment drift.** The hook only blocks narration _words_; comments whose **content** went stale —
   JSDoc for a removed prop, a comment listing fields in an order the code no longer uses — are on you.
   Re-read comments adjacent to every change.
8. **Hot loop.** No per-frame allocation in canvas render (cache gradients/paths outside the frame —
   a per-frame `{x, y}` in `renderer.ts` shipped).
9. **a11y.** Lint now enforces the basics (roles, keyboard handlers on clickables). Still on you: focus
   trap/restore in dialogs, `prefers-reduced-motion` on new animation, Home/End in composite widgets,
   `aria-pressed`/focus management consistent with siblings.
10. **Behavior matches the label.** Walk the real click path once: a "Download CV" that navigated
    instead of downloading, a submit button that disabled itself mid-typing, a seen-toggle that left
    the row visible under an "Unread" filter — all shipped.

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
  DOM/context hooks (`useFunMode`, `useRouteMeta`) use `renderHook` with a provider/router wrapper — see their tests.
- **Hard rule: every bug fix includes a regression test in the same change.** It must fail without the
  fix and pass with it — before committing, revert the fix and re-run `npm test` to confirm it fails.
  Name it so a future reader knows what it guards. See `updateGameState — state field round-trip persistence`
  in [game-loop.test.ts](src/projects/NullSpace/engine/game-loop.test.ts) (guards stale
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
  Canonical example: [homing.ts](src/projects/NullSpace/engine/homing.ts) — a `homeTowardTarget`
  primitive (position, target, strength, dt) used by power orbs and clicked space metals in
  [collectibles.ts](src/projects/NullSpace/engine/collectibles.ts). Build the helper when
  the second use case is obvious from the task at hand — not for hypotheticals. One caller, no clear future caller → keep inline, extract when the second arrives.
- **Style**: 2-space indent, single quotes, no semicolons, ~100 col (Prettier — [.prettierrc](.prettierrc)). Let Prettier format; don't fight it.
