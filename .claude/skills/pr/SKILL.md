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

```bash
# Current branch name (fail if on dev or main)
BRANCH=$(git rev-parse --abbrev-ref HEAD)

# Check remote tracking
git rev-parse --abbrev-ref --symbolic-full-name @{u} 2>/dev/null

# Fetch latest remote state
git fetch origin dev --quiet 2>/dev/null
git fetch origin "$BRANCH" --quiet 2>/dev/null

# Check if local branch has been pushed
git log origin/"$BRANCH"..HEAD --oneline 2>/dev/null

# Check if local branch is up to date with remote dev
git log HEAD..origin/dev --oneline 2>/dev/null
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
BASE=$(git merge-base origin/dev HEAD)
git log "$BASE"..HEAD --oneline          # commit list
git diff "$BASE" --stat                  # files changed summary
git diff "$BASE"                         # full diff
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

Create one:

```bash
gh pr create --base dev --title "<title>" --body "$(cat <<'EOF'
<body>
EOF
)"
```

Print the PR URL when done.

### Case B — PR exists but has an empty body

Update the description:

```bash
gh pr edit --body "$(cat <<'EOF'
<body>
EOF
)"
```

Tell the user the PR was updated and print the URL.

### Case C — PR exists and already has a description

Do **not** modify the PR. Instead, print the existing description to the chat so the user
can see it. Then print the generated description below it under a heading like
"**Generated description (not applied):**" so the user can compare or manually update if
they want.
