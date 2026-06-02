---
name: pr
description: >-
  Create or update a pull request from the current branch into dev. Checks that the branch
  is pushed and up to date first. Generates a structured PR description from the diff
  (features, UI changes, bug fixes, refactors, etc.). Creates the PR if none exists, updates
  an empty description if the PR exists but has no body, or prints the existing description
  if the PR already has one.
---

# PR — Create or update a pull request into dev

## 1. Pre-flight: is the branch ready to PR?

Before doing anything else, verify the branch is in a pushable state. Run these checks and
**stop with a clear message** if any fail — do not create or update a PR from a stale branch.

Run these as **separate, bare commands** — no `$(...)` capture, no redirects — so each matches an
allowlist prefix and runs without a permission prompt. Read the current branch name first, then
substitute it **literally** (write the real name like `my-branch`, never `$BRANCH`) into the rest:

```bash
git rev-parse --abbrev-ref HEAD                       # current branch (fail if dev or main)
git rev-parse --abbrev-ref --symbolic-full-name @{u}  # remote tracking branch (errors if none)
git fetch origin dev --quiet                          # latest remote dev
git fetch origin my-branch --quiet                    # latest remote branch
git log origin/my-branch..HEAD --oneline              # unpushed local commits
git log HEAD..origin/dev --oneline                    # commits behind dev
```

**Stop and tell the user** (do not proceed) if:

- The current branch **is** `dev` or `main` — "You're on `dev`/`main`. Check out a feature
  branch first."
- The branch has **no remote tracking branch** or has **unpushed local commits** — "You have
  unpushed commits. Run `git push` first."
- The branch is **behind `origin/dev`** (i.e. `git log HEAD..origin/dev` shows commits) —
  "Your branch is behind `origin/dev`. Rebase or merge dev first, then push."

If all checks pass, continue.

## 2. Gather the diff

Collect everything that differs between this branch and `dev`:

```bash
git merge-base origin/dev HEAD   # base SHA
```

Substitute the printed SHA **literally** (write the real SHA like `a1b2c3d`, never `$BASE`):

```bash
git log a1b2c3d..HEAD --oneline   # commit list
git diff a1b2c3d --stat           # files changed summary
git diff a1b2c3d                  # full diff
```

Read the full diff carefully. Understand what changed and why — commit messages, file names,
and the code itself all contribute.

## 3. Write the PR description

Compose a PR title (under 70 characters, imperative mood) and a structured body. The body
uses this format:

```markdown
## Summary
<!-- 1-3 sentences: the high-level what and why -->

## Changes
<!-- Group changes under the applicable headings below. Delete any heading with no entries. -->

### New features
- ...

### UI changes
- ...

### Bug fixes
- ...

### Refactors
- ...

### Tests
- ...

### Other
- ...
```

Guidelines:
- Be specific: "add Black Hole ability with area-of-effect damage" not "add new ability".
- Reference file paths where helpful for reviewers.
- Each bullet is one logical change — don't list every file touched, group by intent.
- Delete empty sections rather than leaving them with "None".
- Keep it concise but complete — a reviewer should understand the full scope from the
  description alone.

## 4. Create or update the PR

Check whether a PR already exists for this branch into `dev`:

```bash
gh pr view --json number,title,body,url 2>/dev/null
```

### Case A — No PR exists

Write the body to a temp file with the **Write tool** (e.g. `/tmp/pr-body.md`), then create the
PR with `--body-file` — no `$(...)` substitution, so it runs without a permission prompt:

```bash
gh pr create --base dev --title "<title>" --body-file /tmp/pr-body.md
```

Print the PR URL when done.

### Case B — PR exists but has an empty body

Write the body to a temp file with the **Write tool** (e.g. `/tmp/pr-body.md`), then update with
`--body-file`:

```bash
gh pr edit --body-file /tmp/pr-body.md
```

Tell the user the PR was updated and print the URL.

### Case C — PR exists and already has a description

Do **not** modify the PR. Instead, print the existing description to the chat so the user
can see it. Then print the generated description below it under a heading like
"**Generated description (not applied):**" so the user can compare or manually update if
they want.
