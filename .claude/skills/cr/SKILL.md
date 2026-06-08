---
name: cr
description: >-
  Code review of all staged changes (committed + staged working-tree) between the current
  branch and dev. Reads surrounding context for every changed region, then reviews for
  incomplete propagation, security issues, code quality, and refactoring opportunities.
  Use when the user asks for a code review, CR, or wants a second pair of eyes on their
  staged work before committing or pushing.
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

  Each subagent can't see this file, so **paste §2 + §3 into its prompt**, plus: its file paths, the
  base SHA, and these instructions —
  - read its files' diffs: `git diff <base> -- <paths>` and `git diff --cached -- <paths>`;
  - read surrounding context per §2;
  - grep **all of `src/`** for every symbol it changed — consumers may live outside its group or
    outside the diff entirely;
  - apply every category in §3;
  - return findings only, each as: `severity | title | file:line | why | fix`, plus a `changed symbols:`
    list and any stale consumers found. No prose, no raw diff.

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

Work each category. For every finding cite `file:line` and explain **why** it's a problem, not just **what**.

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
- **Design tokens**: a color/font hard-coded where the system reads a CSS custom property from `index.scss`.
- **Game changelog**: if changed files belong to a game subsystem (e.g.
  `src/pages/fun-stuff/subpages/NullSpace/`), check the game's `data.ts` `CHANGELOG` array and version
  reflect the changes. Every game maintains a changelog — missing entries are a propagation gap.

Confirm each finding with a grep before reporting — "searched `src/`, found 3 stale references" is a
finding; "this might be stale" is a guess.

### b. Security

The site stores no user data today, but still flag:

- `dangerouslySetInnerHTML` with unsanitized input.
- Leaked keys, tokens, or credentials in committed code.
- External URLs built from user input without validation.
- Dependencies with known vulnerabilities (if relevant files changed).
- Raw `<a href>` to external URLs that should go through `SafeLink`.

### c. Code quality

Apply the repo's documented bar (CLAUDE.md):

- **Correctness & logic**: off-by-one, wrong/missing conditionals, async/await handling,
  error/empty/loading states, edge cases the happy path skips.
- **Type safety**: no `any`, no casting untrusted data — use type guards like `isJokeType`.
- **No magic-string union types**: flag any new `type Foo = 'a' | 'b'` — require the `const` object + derived type pattern.
- **Effect hygiene**: every `useEffect`/`requestAnimationFrame`/listener/timeout must clean up on
  unmount. Missing cleanup is a bug, not a nit.
- **Hook tests**: every custom hook (`useX`) needs a colocated `*.test.ts`. A new/changed hook without one is a must-fix.
- **Named exports only**: no `default` exports in new files.
- **Naming & conventions**: file named after its primary export, content in `data.ts` not JSX, folder-per-component layout.
- **Comments**: lean, present-tense, explain *why* not *what*. No "previously…"/"no longer…" narration. No comments that restate the code.

### d. Refactoring opportunities

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
- **Group by severity** for the report.

Don't re-read diffs here — work from the returned findings.

## 5. Report

Group findings by severity. Keep each tight: what, where (`file:line`), why, and the fix.

```
## Code review — <branch> vs dev

### 🔴 Must fix
- **<title>** — `path/file.tsx:42`
  <1-2 sentences: the problem and why it matters.>
  Fix: <the concrete change.>

### 🟡 Should fix
- ...

### 🟢 Consider
- ...

### ✅ Looks good
<Brief note on what's solid — keep it short.>
```

- **🔴 Must fix**: bugs, missing cleanups, broken propagation, security issues, missing hook tests.
- **🟡 Should fix**: code quality issues, convention violations, incomplete fun-mode handling.
- **🟢 Consider**: refactoring, simplification, minor style.

Empty category → say so in one line and move on. Don't manufacture findings. A clean diff gets a short review.

## 6. Offer to fix

After the report, offer to apply fixes — don't apply unprompted:

> Want me to apply these? I can do the 🔴 must-fixes (safe, mechanical), or all of them, or just specific ones — your call.

When fixing:

- Apply clear-cut, low-risk fixes directly.
- For anything with a judgment call or behavior change, confirm the approach first.
- After editing, re-run `npm run check` and `npm test`. Report results.
- Keep fixes scoped to the review — no out-of-scope changes.
