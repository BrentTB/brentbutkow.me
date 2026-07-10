---
name: cr
description: >-
  Code review of all staged changes (committed + staged working-tree) between the current
  branch and dev. Reads surrounding context for every changed region, then hunts for bugs
  (with concrete failure scenarios), incomplete propagation, missing/weak tests, security
  issues, code quality, and refactoring opportunities; runs check/test/knip in parallel.
  Use when the user asks for a code review, CR, or wants a second pair of eyes on their
  staged work before committing or pushing.
model: opus
---

# CR — Code review against dev

Review **staged changes** (committed branch work + `git add`-ed working-tree) between this branch and
`dev`. Goal: focused, high-signal — not a lecture on the whole codebase.

## Execution model — keep the raw diff out of the main context

The expensive part (full diffs + surrounding context + grep output) must **not** flood the main window.

- **Small change** (roughly ≤150 changed lines across ≤3 files): review **inline** — do §2 + §3
  yourself, the context is small enough. Skip the fan-out overhead.
- **Bigger**: **fan out**. Group the changed files by coupling (a component with its colocated
  `*.module.scss` / `*.test.ts` / `data.ts` / `*.types.ts` = one group; standalone files = their own).
  Spawn **one subagent per group** (Agent tool, `general-purpose`, all in parallel — multiple Agent
  calls in a single message). Each subagent reads its files' diffs + context + greps **in its own
  context** and returns **only structured findings** — never raw diff or context. Then you synthesize
  (§4) and report (§5).

  **Connector files** — a changed hub that several groups depend on (`routes.config.tsx`,
  `data.types.ts`, `App.tsx`/`Router.tsx`, a barrel `index.ts`, or any changed file imported across
  multiple groups) — do **not** belong in a folder group. Leave them for the §4 integration check,
  where the full set of folder changes is known and coherence can actually be judged.

  Each subagent can't see this file, so **paste §2 + §3 into its prompt**, plus: its file paths, the
  base SHA, and these instructions —
  - read its files' diffs: `git diff <base> -- <paths>` and `git diff --cached -- <paths>`;
  - read surrounding context per §2;
  - grep **all of `src/`** for every symbol it changed — consumers may live outside its group or
    outside the diff entirely;
  - apply every category in §3;
  - for every suspected bug, actively try to construct a concrete failure: name the input/state that
    triggers it and the wrong outcome. Can't construct one after honest effort → downgrade to a note
    or drop it;
  - return findings only, each as: `severity | title | file:line | why | failure scenario | fix`,
    plus a `changed symbols:` list and any stale consumers found. No prose, no raw diff.

## 1. Establish scope (cheap — runs in the main context)

Only review what the user changed. Unstaged/untracked files are out of scope.

Run as **separate, bare commands** — no `$(...)` capture, no `||`, no redirects — so each matches an
allowlist prefix and runs without a prompt:

```bash
git rev-parse --abbrev-ref HEAD     # current branch
git merge-base origin/dev HEAD      # base SHA — if origin/dev is missing, run `git merge-base dev HEAD`
```

Substitute the printed SHA **literally** (write the real SHA like `a1b2c3d`, never `$BASE`). These
stay cheap — summaries and file lists only, **not** the full diff:

```bash
git log a1b2c3d..HEAD --oneline   # committed branch changes
git diff a1b2c3d --stat           # committed summary
git diff a1b2c3d --name-only      # committed changed files
git diff --cached --stat          # staged summary
git diff --cached --name-only     # staged changed files
```

No committed changes and nothing staged → tell the user there's nothing to review and stop. Use the
file lists + line counts to pick inline vs fan-out and to group files. Full diffs (`git diff <base> --
<paths>`, `git diff --cached -- <paths>`) are pulled by whoever reviews — you inline, or each subagent.

## 1b. Run the machines (background, parallel with the review)

Kick these off with `run_in_background` **before** starting §2 — they catch deterministic bug classes
(type errors, failing tests, cross-file dead code) no amount of reading beats, and they cost nothing
while you review:

```bash
npm run check     # tsc + eslint
npm test          # vitest
npm run knip      # orphaned files/exports/types
```

Fold failures into findings with the relevant output quoted (a failing test that touches changed files
is 🚨; knip hits on changed files are 📝 dead code). Caveat in the report if the working tree has
unstaged edits — the tools see the tree, not just the staged set.

## 2. Read surrounding context

A diff hunk in isolation lies. For every changed region, read enough to understand it:

- **The full function/component** containing each change, not just the hunk.
- **The file's imports/exports** — what it exposes, what it depends on.
- **Consumers** — grep the changed symbol across `src/` to catch propagation gaps.
- **Sibling files** in the folder — `data.ts`, `*.types.ts`, `*.test.ts`, `*.module.scss` — paired
  with the changed file.
- **Type definitions** in `src/data/data.types.ts` or page-local `*.types.ts` when data shapes are involved.

Read and grep liberally. Thoroughness over speed.

## 3. Review checklist

Work each category. For every finding cite `file:line` and explain **why** it's a problem, not just
**what**. **Bug findings (🚨) additionally need a concrete failure scenario** — the input or state
that triggers it and the wrong outcome ("resize to mobile while paused → listener never re-attached →
controls dead"). If you can't construct one, it's a ⚠️/📝, not a bug.

### a. Incomplete propagation

Highest-value — changes in one place that should have rippled elsewhere:

- **Renames / signature changes**: a function, prop, type, or constant reshaped at its definition but
  a call site, test, `data.ts` literal, or sibling still uses the old name/shape. Grep the old name across `src/`.
- **Routing**: a route added/changed/removed in `routes.config.tsx` but `routePaths`, `Router.tsx`,
  the Navbar, or `Link`/`SafeLink` `to=` values not kept in sync.
- **Types vs data**: a field added/removed from a type but `data.ts` files not updated to match.
- **Fun-mode duality**: new content for one mode but not the other. Is there a `subtitle` needing a
  `subtitleFun`? Is new CSS animation scoped to `:global(html.fun-mode) &`?
- **Paired strings**: a label changed but its `aria-label`, mobile counterpart, or fun-mode twin left stale.
- **Copy propagation**: counts that need pluralizing ("1 states" shipped), placeholders/hints that
  enumerate options when the options changed ("…or company" shown for a country with no company filter).
- **Design tokens**: a color/font hard-coded where the system reads a CSS custom property from `index.scss`.
- **Game changelog**: if changed files belong to a game subsystem (e.g.
  `src/projects/NullSpace/`), check the game's `data.ts` `CHANGELOG` array and version
  reflect the changes. Every game maintains a changelog — missing entries are a propagation gap.

Confirm each finding with a grep before reporting — "searched `src/`, found 3 stale references" is a
finding; "this might be stale" is a guess.

Then invert it — **review what the diff doesn't contain**. From the change's intent, list the
surfaces that _should_ have moved (test, changelog entry, copy, aria twin, fun-mode variant, sitemap,
`data.ts`) and confirm each either changed or provably doesn't need to. Absences are the misses
reading the diff alone can never surface.

### b. Security

The site stores no user data today, but still flag:

- `dangerouslySetInnerHTML` with unsanitized input.
- Leaked keys, tokens, or credentials in committed code.
- External URLs built from user input without validation.
- Dependencies with known vulnerabilities (if relevant files changed).
- Raw `<a href>` to external URLs that should go through `SafeLink`.

### c. Bug hunt — correctness

The highest-value reading is **adversarial**: don't check that the code looks right, try to break it.
For each changed function/component:

- **Trace one real input end-to-end** through the new code path — actual values, not shapes. Most
  logic bugs surface in the trace, not the skim.
- **Boundaries**: empty array, zero, one element, first/last iteration, max/overflow, `undefined`
  optional fields, string with no match. Check each boundary the change touches.
- **Async & timing**: missing `await`, unhandled rejection, race with unmount, effect that reads a
  **stale closure**, `useEffect`/`useCallback`/`useMemo` **deps array vs the values actually used**.
- **State lifecycle**: does the new field survive init → update → persist → restore? Null Space
  `GameState` fields must round-trip save→load — a `...state` spread silently drops locally-mutated
  fields. Old persisted data (localStorage saves) hitting new code needs a guard.
- **Hot loops**: per-frame allocation in canvas render paths (objects, arrays, gradients, closures
  created inside the frame) — cache outside the frame.
- **Behavior matches the label**: walk the real interaction path once in your head — button text,
  disabled logic, filter semantics. A "Download CV" that navigates, a seen-toggle that leaves the row
  visible under "Unread" — this class ships repeatedly.
- **Error/empty/loading states**: what renders when the data isn't there yet, or the fetch fails?

### d. The tests themselves

Changed/added tests are code under review too — and missing tests are the #1 historical miss:

- Bug fix without a **regression test that fails without the fix**? Must-fix.
- New/changed hook (`useX`), engine module, or interactive component branch without a colocated
  test extension? Must-fix.
- Tests asserting **hardcoded copies of constants** instead of importing them — churn trap, flag it.
- Weakened assertions (deleted expect, broadened matcher, `toBeTruthy` where a value was checked),
  tests that only prove "doesn't throw".

### e. Code quality

Apply the repo's documented bar (CLAUDE.md):

- **Type safety**: no `any`, no casting untrusted data — use type guards like `isJokeType`. New
  external input (server JSON, localStorage) gets a bound: length cap, shape check, phase check.
- **No magic-string union types**: flag any new `type Foo = 'a' | 'b'` — require the `const` object + derived type pattern.
- **Effect hygiene**: every `useEffect`/`requestAnimationFrame`/listener/timeout must clean up on
  unmount. Missing cleanup is a bug, not a nit.
- **One source of truth**: re-declared config/derived data, or an exported helper re-implemented at a
  call site — import it instead.
- **Named exports only**: no `default` exports in new files.
- **Naming & conventions**: file named after its primary export, content in `data.ts` not JSX, folder-per-component layout.
- **Comments**: lean, present-tense, explain _why_ not _what_. Beyond narration words, check
  **content drift** — re-read every comment/JSDoc adjacent to a change: does it still describe the
  code as it now is (params, field lists, ordering)?
- **a11y beyond lint**: focus trap/restore in dialogs, `prefers-reduced-motion` on new animation,
  Home/End in composite widgets, `aria-pressed`/focus management consistent with sibling components.

### f. Refactoring opportunities

Concrete improvements, not hypothetical future-proofing:

- **Duplication**: two+ blocks doing near-identical work that could share a component, hook, or helper.
  Only flag genuinely-the-same-idea code — two things that merely look similar but change independently aren't duplication.
- **Simplification**: over-complicated expressions, needless indirection, deep nesting that could be
  early returns, verbose patterns with a simpler idiomatic equivalent.
- **Dead code**: new functions, components, props, types, CSS classes, or `data.ts` entries nothing
  references. Grep to confirm — zero hits outside the definition means dead.
- **Extraction**: logic in a component clearer as a custom hook or utility, especially if it mixes
  concerns (e.g. DOM manipulation inside business logic).

For each suggestion note the rough cost (call sites, code moved) so the user can judge if it's worth it now.

## 4. Synthesize (main context)

When fanning out, collect all subagents' findings, then:

- **Dedupe** overlapping findings (same `file:line` + issue).
- **Reconcile propagation across groups**: union every subagent's `changed symbols`; if one group's
  change has a consumer another group flagged, keep it as one finding. (Each subagent already grepped
  all of `src/`, so cross-group gaps are caught — just merge them.)
- **Integration check at connector files**: for each connector/hub file (the ones set aside in the
  Execution model section, plus any file the unioned `changed symbols` show is imported by ≥2 groups),
  read just that file and confirm
  it correctly wires every folder group's changes — new exports registered, routes added to
  `routePaths`/`Router`/Navbar, type fields matched in `data.ts`, props threaded through. This is the
  one place a whole-PR view is needed; connector files are small, so do it here in the main context.
  If a connector file is large, delegate it to one more subagent with the `changed symbols` list.
- **Verify before reporting**: for every 🚨 (and any ⚠️ you're unsure of), re-read the cited lines in
  the current source and try to **refute** the finding — is the guard actually there two lines up? Is
  the "stale consumer" inside a deleted file? A finding that survives an honest refutation attempt
  gets reported; one that doesn't gets dropped or downgraded. False positives torch the review's
  credibility as surely as misses.
- **Collect the machine results** (§1b): read the background outputs of `npm run check`, `npm test`,
  `npm run knip`; fold failures into findings with output quoted.
- **Group by severity** for the report.

Don't re-read folder diffs here — work from the returned findings (the integration check reads only
the connector files' current source, not diffs; the verify pass reads only cited regions).

## 5. Report

Group findings by severity. Keep each tight: what, where (`file:line`), why, and the fix.

```
## Code review — <branch> vs dev

### 🚨 Critical issues
- **<title>** — `path/file.tsx:42`
  <1-2 sentences: the problem and why it matters.>
  Breaks when: <concrete input/state → wrong outcome.>
  Fix: <the concrete change.>

### ⚠️ Warnings
- ...

### 📝 Notes
- ...

### ✅ Looks good
<Brief note on what's solid — keep it short.>
```

- **🚨 Critical issues**: bugs (with a failure scenario), failing checks/tests, missing cleanups,
  broken propagation, security issues, bug fix without a regression test, missing hook/engine tests.
- **⚠️ Warnings**: code quality issues, convention violations, incomplete fun-mode handling, weak tests.
- **📝 Notes**: refactoring, simplification, dead code, minor style.

Empty category → say so in one line and move on. Don't manufacture findings. A clean diff gets a short review.

## 6. Offer to fix

After the report, offer to apply fixes — don't apply unprompted:

> Want me to apply these? I can do the 🚨 critical fixes (safe, mechanical), or all of them, or just specific ones — your call.

When fixing:

- Apply clear-cut, low-risk fixes directly.
- For anything with a judgment call or behavior change, confirm the approach first.
- After editing, re-run `npm run check` and `npm test`. Report results.
- Keep fixes scoped to the review — no out-of-scope changes.
