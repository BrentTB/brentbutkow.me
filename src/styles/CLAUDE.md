# src/styles/CLAUDE.md

Styling & polish. See [src/CLAUDE.md](../CLAUDE.md) for the Fun toggle (CSS hook = `html.fun-mode`).

- **Design tokens**: CSS custom properties in `:root` in [src/index.scss](../index.scss). **Refined-dark,
  editorial-technical** look — deep ink palette (`--bg`, `--surface`, `--border`) + a single **warm-gold
  accent** (`--accent`; use `rgba(var(--accent-rgb), 0.x)` for alpha, never hard-code). Type: **IBM Plex Sans**
  for headings + body (`--font-display` = `--font-body`; headings just heavier 600/700, tighter tracking),
  **IBM Plex Mono** (`--font-mono`) for eyebrows/nav/metadata/labels. No separate display typeface.
  Atmosphere = one radial glow + a fixed film-grain overlay (`body::before`). Use the variables — don't hard-code colors or fonts.
- **Shared SCSS**: [styles/\_shared.scss](_shared.scss) has the `card-base` mixin (hairline
  border, `--surface` fill, `--radius`, soft elevation + inset top highlight) and Fun-mode keyframes
  (`float`, `glow`, `rainbow-shadow`). Use via `@use '../../styles/shared' as *;` then `@include card-base;`.
  Since pages are de-carded into rows, `card-base` is mainly the home **joke card** (which keeps the Fun-mode
  rainbow glow alive). Reach for it only for a genuinely boxed surface; default to row+hairline (see [src/pages/CLAUDE.md](../pages/CLAUDE.md)).
- **Responsive**: `.shell` ([App.module.scss](../App.module.scss)) caps width; Navbar collapses to a hamburger under 1100px. Mobile-first.
- **Accessibility**: semantic elements, real `<button>`s, `aria-label`/`aria-expanded`/`aria-checked`/`role="switch"`
  (see ModeToggle, Navbar, ToggleableSection). Maintain this bar on new interactive elements.
