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

Review **staged changes** (committed branch work + `git add`-ed working-tree changes) between
this branch and `dev`. The goal is a focused, high-signal review — not a lecture on the whole
codebase.

## 1. Establish the scope

Only review what the user actually changed. Unstaged and untracked files are out of scope.

```bash
BRANCH=$(git rev-parse --abbrev-ref HEAD)
BASE=$(git merge-base origin/dev HEAD 2>/dev/null || git merge-base dev HEAD)

# Committed branch changes
git log "$BASE"..HEAD --oneline

# Staged working-tree changes (on top of committed work)
git diff --cached --stat

# The full reviewable diff: committed branch work + staged changes
# (committed diff against base, plus staged diff against HEAD)
git diff "$BASE" --stat          # committed changes
git diff "$BASE"                 # committed full diff
git diff --cached --stat         # staged on top
git diff --cached                # staged full diff
```

If there are no committed branch changes and nothing staged, tell the user there's nothing
to review and stop.

## 2. Read surrounding context

A diff hunk in isolation lies. For every changed region, read enough context to understand
the change:

- **The full function or component** containing each change, not just the 3-line hunk.
- **The file's imports and exports** — what does this module expose, what does it depend on?
- **Other files that import changed symbols** — grep for the symbol across `src/` to find
  consumers. This is how you catch propagation gaps.
- **Sibling files** in the same folder — `data.ts`, `*.types.ts`, `*.test.ts`,
  `*.module.scss` — that are paired with the changed file.
- **Type definitions** in `src/data/data.types.ts` or page-local `*.types.ts` when data
  shapes are involved.

Use the Read tool and grep liberally. Speed doesn't matter — thoroughness does.

## 3. Review checklist

Work through each category below. For every finding, cite the specific `file:line` and
explain **why** it's a problem, not just **what** it is.

### a. Incomplete propagation

The highest-value category — changes made in one place that should have rippled elsewhere:

- **Renames / signature changes**: a function, prop, type, or constant renamed or reshaped
  at its definition but a call site, test, `data.ts` literal, or sibling component still
  uses the old name/shape. Grep for the old name across `src/`.
- **Routing**: a route added/changed/removed in `routes.config.tsx` but `routePaths`,
  `Router.tsx`, the Navbar, or `Link`/`SafeLink` `to=` values not kept in sync.
- **Types vs. data**: a field added/removed from a type but `data.ts` files not updated to
  match.
- **Fun-mode duality**: new user-facing content added for one mode but not considered for the
  other. If there's a `subtitle`, should there be a `subtitleFun`? Is new CSS animation
  scoped to `:global(html.fun-mode) &`?
- **Paired strings**: a label changed but its `aria-label`, mobile counterpart, or fun-mode
  twin left stale.
- **Design tokens**: a color/font hard-coded where the rest of the system reads a CSS custom
  property from `index.scss`.

Confirm each finding with a grep before reporting — "I searched `src/` and found 3 stale
references to the old name" is a finding; "this might be stale" is a guess.

### b. Security

Even though this site stores no user data today, flag anything that could become a problem:

- `dangerouslySetInnerHTML` with unsanitized input.
- Leaked keys, tokens, or credentials in committed code.
- External URLs constructed from user input without validation.
- Dependencies with known vulnerabilities (if relevant files changed).
- Raw `<a href>` to external URLs that should go through `SafeLink`.

### c. Code quality

Apply the repo's documented bar (see CLAUDE.md):

- **Correctness & logic**: off-by-one, wrong/missing conditionals, async/await handling,
  error/empty/loading states, edge cases the happy path skips.
- **Type safety**: no `any`, no casting untrusted data — use type guards like `isJokeType`.
- **No magic-string union types**: flag any new `type Foo = 'a' | 'b'` — require the
  `const` object + derived type pattern.
- **Effect hygiene**: every `useEffect`/`requestAnimationFrame`/listener/timeout must clean
  up on unmount. Missing cleanup is a bug, not a nit.
- **Hook tests**: every custom hook (`useX`) must have a colocated `*.test.ts`. A new or
  changed hook without a test is a must-fix.
- **Named exports only**: no `default` exports in new files.
- **Naming & conventions**: file named after its primary export, content in `data.ts` not
  JSX, folder-per-component layout.
- **Comments**: lean, present-tense, explain *why* not *what*. No "previously…" or
  "no longer…" narration. No comments that just restate the code.

### d. Refactoring opportunities

Concrete improvements that would make the code cleaner, not hypothetical future-proofing:

- **Duplication**: two+ components or blocks doing near-identical work that could be a shared
  component, hook, or helper. Only flag when the code is genuinely the same idea — two things
  that merely look similar but have independent reasons to change are not duplication.
- **Simplification**: over-complicated expressions, unnecessary indirection, deeply nested
  conditionals that could be early returns, verbose patterns that have a simpler idiomatic
  equivalent.
- **Dead code**: new functions, components, props, types, CSS classes, or `data.ts` entries
  that nothing references. Grep to confirm — zero hits outside the definition means dead.
- **Extraction**: a chunk of logic in a component that would be clearer as a custom hook or
  utility function, especially if it mixes concerns (e.g. DOM manipulation inside business
  logic).

For each suggestion, note the rough cost (how many call sites, how much code moves) so the
user can judge whether it's worth it now.

## 4. Report

Present findings grouped by severity. Keep each finding tight: what, where (`file:line`),
why it matters, and the fix.

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

- **🔴 Must fix**: bugs, missing cleanups, broken propagation, security issues, missing
  hook tests.
- **🟡 Should fix**: code quality issues, convention violations, incomplete fun-mode
  handling.
- **🟢 Consider**: refactoring opportunities, simplification suggestions, minor style
  improvements.

If a category has no findings, say so in one line and move on. Don't manufacture findings
to look thorough. A clean diff gets a short review.

## 5. Offer to fix

After the report, offer to apply fixes — don't apply them unprompted:

> Want me to apply these? I can do the 🔴 must-fixes (safe, mechanical), or all of them,
> or just specific ones — your call.

When fixing:
- Apply clear-cut, low-risk fixes directly.
- For anything with a judgment call or behavior change, confirm the approach first.
- After editing, re-run `npm run check` and `npm test`. Report the results.
- Keep fixes scoped to the review — don't sneak in out-of-scope changes.
