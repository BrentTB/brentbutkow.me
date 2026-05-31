---
name: diff-review
description: >-
  Review the current git diff for this portfolio site — the current branch plus any
  uncommitted working-tree changes compared against "dev" by default, or against another
  base ref when one is given (e.g. "diff-review main").
  Goes beyond what `npm run check` catches: hunts for dead code the change introduced,
  incomplete propagations (a rename, signature, prop, type, route, or copy-string updated
  in one place but left stale elsewhere), and duplication that should become a shared
  component / hook / function — on top of normal correctness, type-safety, accessibility,
  and project-convention review. Use this whenever the user asks to review code, review
  changes, review a diff/PR/branch, sanity-check their work before committing, or asks
  "does this look right", "what did I miss", or "anything I forgot to update". Reports
  findings grouped by severity, then offers to apply the safe fixes.
---

# Diff Review

Review **only what changed** in this repo and report what a careful senior engineer would
flag — then offer to fix it. The goal is a focused, high-signal review, not a lecture on the
whole codebase.

This repo already runs `tsc -b && eslint .` via `npm run check` (and on the Husky
pre-commit hook), so unused imports/vars, missing hook deps, and type errors are mostly
caught for you. Don't spend the review re-flagging those. Spend it on the things a compiler
and linter **can't** see: dead-but-valid code, half-finished changes, and copy-paste that
wants to be a shared abstraction.

## 1. Establish the scope

Figure out exactly which lines are under review before forming any opinion. A finding about
code the user didn't touch is noise.

**Default base is `dev`.** Review the current branch *and* any uncommitted working-tree
changes against `dev` — everything that differs from `dev` is in scope. Diff the working tree
against the merge-base so `dev`'s own later commits don't show up as noise; this is what a PR
into `dev` would show, plus your not-yet-committed work.

```bash
git status --short                          # modified + untracked at a glance
BASE=$(git merge-base dev HEAD)             # fork point from dev
git diff "$BASE" --stat                     # files + churn (branch commits + working tree)
git diff "$BASE"                            # the full diff under review
git ls-files --others --exclude-standard    # untracked files — read these in full
```

`git diff "$BASE"` already covers both committed branch work and uncommitted tracked changes
(staged and unstaged). Untracked files won't appear there — list them with the command above
and read each with the Read tool, since the entire file is "new" and in scope.

**Different base ref given (e.g. `diff-review main`):** use that ref in place of `dev` —
`BASE=$(git merge-base main HEAD)` — and review against it the same way. If you're currently
*on* the base branch, the merge-base is the current commit, so the review naturally narrows
to just the uncommitted work. If the base ref doesn't resolve (e.g. no local `dev`), say so
and confirm the intended base rather than silently reviewing against the wrong thing.

Read enough surrounding context (the whole function, the whole module, the other files that
import it) to judge each change — a diff hunk in isolation lies. Use Grep/Glob to follow
symbols outward; that outward reading is exactly how you catch the propagation and
duplication issues below.

## 2. The three focus checks

These are the headline reasons this skill exists. Do them deliberately — they're the ones
ordinary review skips.

### a. Dead code introduced by the change

Code that is syntactically used (so the linter stays quiet) but can never meaningfully run,
or is no longer reachable after the change:

- A new function, component, hook, prop, type, constant, CSS class, or `data.ts` entry that
  nothing references. Grep the symbol across `src/` to confirm — zero hits outside its own
  definition means it's dead.
- A branch that can't be taken: a condition that's now always true/false, an `isFunMode`
  guard around content that's also rendered unconditionally, a fallback after an early
  return, a `default` case that's unreachable.
- Code orphaned by a move: the change added the new home for some logic but left the old
  copy behind, or removed the only caller of a helper without removing the helper.
- Commented-out blocks or `console.log`/debug scaffolding left in.
- A `.module.scss` selector with no matching `className`/`styles.x` in the paired `.tsx`
  (and vice-versa — a `styles.x` referencing a class that was deleted).

For each, confirm with a grep before reporting — "I searched `src/` and `oldHelper` has no
remaining callers" is a finding; "this looks unused" is a guess.

### b. Incomplete propagation

A change made in one place that should have rippled to others but didn't. This is the
highest-value, easiest-to-miss category. Walk each kind of edit and ask "where else does
this fact live?":

- **Rename / signature change**: a function, prop, or type renamed or re-shaped at the
  definition but a call site, a sibling component, a test, or a `data.ts` literal still uses
  the old name/shape.
- **Routing** (see CLAUDE.md): a route added/changed/removed in
  [routes.config.tsx](src/routes/routes.config.tsx) but [Router.tsx](src/routes/Router.tsx),
  the Navbar, `routePaths`, `routes.types.ts`, or a `Link`/`SafeLink` `to=` elsewhere not
  kept in sync. Paths should never be hard-coded — they come from `routePaths`.
- **Types vs. data**: a field added to a type in
  [data/data.types.ts](src/data/data.types.ts) (or a page's `*.types.ts`) but some `data.ts`
  file not updated to provide it — or removed from a type but still set in data.
- **Fun-mode duality** (core feature): new user-facing content or behavior added for one
  mode but not considered for the other. If there's a `subtitle`, is there a `subtitleFun`?
  If a section is gated by `isFunMode`, is the Professional-mode experience still complete?
  New CSS animation/glow — is it correctly scoped to `:global(html.fun-mode) &` so it
  doesn't leak into Professional mode?
- **Paired copy strings / variants**: one of a known pair updated (e.g. a label changed but
  its `aria-label`, its mobile counterpart, or its fun-mode twin left stale).
- **Design tokens**: a color/font changed via a hard-coded value where the rest of the
  system reads a CSS custom property from [index.scss](src/index.scss) — or a new token
  added but old hard-coded values left in place elsewhere.

When you suspect propagation gaps, grep for the old value/name across `src/` and report the
specific stragglers with file:line.

### c. Duplication worth extracting

The change introduced (or sits beside) repeated logic or markup that would be clearer and
safer as one reusable thing. Be concrete about the abstraction:

- Two+ components doing near-identical rendering → a shared component in
  [src/components/](src/components) or a page-local `components/` folder.
- Repeated stateful logic (effect + cleanup, event listeners, localStorage, a derived value
  from `useFunMode`) → a custom hook (`useX`).
- Repeated pure logic / formatting / validation → a plain helper function, near
  [src/data/](src/data) or `src/components/utils/` as fits.
- Repeated SCSS blocks → reach for the existing `card-base` mixin in
  [styles/\_shared.scss](src/styles/_shared.scss) or a new mixin/token, rather than
  copy-pasting rules.

Only flag duplication that's genuinely the same idea and likely to drift apart. Two things
that merely look similar today but have independent reasons to change are **not**
duplication — say so rather than over-abstracting. Note the rough cost (how many call sites,
how much code) so the user can judge whether it's worth it.

## 3. Normal code-review checks

Apply the usual lens too, weighted toward this repo's documented bar (see CLAUDE.md):

- **Correctness & logic**: off-by-one, wrong/missing conditionals, async/await and promise
  handling, error/empty/loading states, edge cases the happy path skips.
- **Type safety**: no `any`, no casting untrusted/JSON data instead of validating it (the
  repo uses type guards like `isJokeType` — follow that pattern). Prefer precise types over
  widening.
- **No magic-string union types**: flag any new `type Foo = 'a' | 'b'` pattern. This repo
  requires a `const` object + derived type so the values are usable at runtime without magic
  strings (e.g. `const Foo = { a: 'a', b: 'b' } as const; type Foo = (typeof Foo)[keyof typeof Foo]`).
  See CLAUDE.md "No magic-string union types" for the full pattern. Existing violations in
  unchanged code are out of scope, but any **new** string-union type in the diff is a 🟡 flag.
- **Effect hygiene**: every `useEffect`/`requestAnimationFrame`/listener/timeout/observer
  added must clean up on unmount. A missing cleanup is a real bug here, not a nit.
- **Hook test coverage**: **every custom hook (`useX`) must have a colocated `*.test.ts`.** If the
  diff adds a new hook, or changes an existing one's behaviour, without adding/updating its test,
  flag it as a 🔴 must-fix — this repo requires all hooks to be unit-tested and the pre-commit runs
  `vitest`. DOM/context hooks (`useFunMode`, `useDocumentTitle`) are tested with
  `@testing-library/react`'s `renderHook` plus the right provider/router wrapper.
- **Links**: external links must go through
  [SafeLink](src/components/utils/SafeLink.tsx) (auto `target="_blank"` +
  `rel="noopener noreferrer"`); internal navigation uses React Router `Link`. Flag raw
  `<a href>` to external URLs.
- **Accessibility**: real `<button>`s for actions, `aria-label`/`aria-expanded`/
  `aria-checked`/`role` on new interactive elements, semantic elements, keyboard
  operability. This repo treats a11y as part of "polished".
- **Convention fit**: content belongs in `data.ts`, not hard-coded in JSX; folder-per-
  component/page layout; the editorial row+hairline page language (don't reintroduce
  bordered "card" boxes on content pages); use design tokens, not literal colors/fonts.
- **File naming**: a file must be named after its primary export — a hook in `useX.ts(x)`, a
  component in `Component.tsx` (case follows the export). Flag any hook/component whose filename
  doesn't match (e.g. a `useFunMode` hook in `FunMode.ts` → should be `useFunMode.ts`), and the
  paired test (`useX.test.ts`). Plain utility modules with no single hook/component (`fun-mode.ts`,
  `jokes.ts`) are exempt.
- **The SCSS class-collision gotcha**: page-level `*Card` styles compose onto the same
  element as the shared atom's `.card`. Don't set `display`/layout on the page-level `.card`
  — it races the atom. Layout goes on an inner wrapper. Flag new violations.
- **Security & secrets**: no leaked keys/tokens, no `dangerouslySetInnerHTML` with unsanitized
  input, no obvious injection.
- **Naming / clarity / dead simplicity**: a confusingly named symbol, an over-complicated
  expression that could be plain, a comment that now contradicts the code.

Skip what `npm run check` already enforces unless you spot something it missed.

## 4. Verify, then report

Before writing the report, run the gates the repo expects so you don't hand back a review
that ignores a red build or failing tests:

```bash
npm run check
npm test
```

Mention the results briefly (green, or the specific failure). Then present findings grouped
by severity, highest first. Keep each finding tight: what, where, why it matters, and the
fix.

```
## Diff review — <scope, e.g. "claude-refactor + working tree vs dev">

`npm run check`: <pass / the failing output>
`npm test`: <pass / the failing output>

### 🔴 Must fix
- **<one-line title>** — `path/to/file.tsx:42`
  <1–2 sentences: the problem and why it matters.>
  Fix: <the concrete change.>

### 🟡 Should fix
- ...

### 🟢 Consider
- ...

### ✅ Looks good
<Brief, genuine note on what's solid — keep it short.>
```

Order findings within each group by the focus checks first (dead code, propagation,
duplication), then the general checks. If a category turned up nothing, don't pad it — say
"no dead code introduced" in a line and move on. A short review of a small diff is a good
review; don't manufacture findings to look thorough. If the diff is clean, say so plainly.

Always use `file:line` references so they're clickable.

## 5. Offer to fix

After the report, offer to apply the fixes — don't apply them unprompted. Group the offer so
the user can choose scope:

> Want me to apply these? I can do the 🔴 must-fixes (safe, mechanical), or all of them, or
> just specific ones — your call.

Guidance when fixing:

- Apply the clear-cut, low-risk fixes (delete dead code, complete a propagation, extract an
  obvious duplicate) directly with Edit.
- For anything with a judgment call or a behavior change, confirm the approach first rather
  than guessing.
- After editing, re-run `npm run check` and (if it touches anything visible) follow the
  preview verification workflow. Report what you changed and the check result.
- Match surrounding style and let Prettier handle formatting (2-space, single quotes, no
  semicolons, ~100 cols) — don't hand-format.
- Keep fixes scoped to the review. If you spot something tempting but out of scope, mention
  it rather than sneaking it into the diff.
