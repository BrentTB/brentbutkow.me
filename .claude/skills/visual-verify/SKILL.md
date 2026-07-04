---
name: visual-verify
description: >-
  Runbook for verifying a UI change in the running app with the preview tools — covers the
  one failure class (visual regressions: overflow, z-index, lost styles, broken layout) that
  no lint or unit test catches. Use after any change to markup or styles a user can see,
  before declaring the work done.
---

# Verify a UI change in the browser — runbook

Unit tests pass and the page is still broken: five past reviews found visual regressions
(menu behind a dialog, mobile canvas overflow, animation that won't replay). This runbook
is how to actually look.

## 1. Start the dev server — then find the REAL port

- `preview_start` with the `dev` config from [.claude/launch.json](../../../.claude/launch.json).
- **Do not trust the port in the tool result.** Vite auto-hops when 5173 is taken (another
  session's server often holds it) and the tool can report a stale guess. Run `preview_logs`
  and read the `Local: http://localhost:NNNN/` line — that's the truth. If the page comes up
  blank (`title: ""`, 0 buttons), you're on the wrong port: navigate with
  `preview_eval` → `window.location.href = 'http://localhost:NNNN/...'`.

## 2. Check for errors before looking at pixels

- `preview_console_logs` with `level: "error"` — a clean console is the baseline.
- `preview_network` with `filter: "failed"` if the change involves data or assets.

## 3. Inspect state, not screenshots

- `preview_snapshot` for structure/text presence (roles, labels — also catches a11y wiring).
- `preview_inspect` for exact CSS values (colors, spacing, fonts) — more reliable than
  eyeballing a screenshot. Compare the changed element against an untouched sibling
  (e.g. computed height of a restyled control vs its neighbors — a 3px drift is invisible
  in a screenshot and obvious in `offsetHeight`).
- `preview_click` / `preview_fill` to walk the real interaction path — the class of shipped
  bug where the label lies ("Download" that navigates, a filter that ignores a toggle).

## 4. The three passes beyond default desktop

1. **Mobile**: `preview_resize` preset `mobile` — past shipped bugs: `100vw` scrollbar
   overflow, missing safe-area insets, canvas wider than viewport.
2. **Fun mode**: toggle it (click the navbar ModeToggle) — every visual change needs an
   answer in both modes; fun-only CSS lives under `:global(html.fun-mode) &`.
3. **Layering**: if the change involves a dialog, dropdown, portal, or sticky element, open
   them _together_ — a portaled menu once shipped hidden behind a dialog (z-index).

`prefers-reduced-motion` can't be emulated by these tools — for new animation, verify the
`@media (prefers-reduced-motion: reduce)` block exists in the SCSS instead.

## 5. Prove it, then clean up

- `preview_screenshot` as evidence in your summary for visual changes.
- `preview_stop` the server when done (frees the port for the user's own session).

Fix → re-check from step 2. Diagnose in source files; `preview_eval` DOM pokes are lost on
reload.
