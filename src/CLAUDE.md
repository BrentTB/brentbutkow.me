# src/CLAUDE.md

Architecture, routing, folder conventions, and the Fun toggle. See [root CLAUDE.md](../CLAUDE.md) for stack, commands, tests, and global code-quality rules.

## Architecture

Entry: [main.tsx](main.tsx) → [App.tsx](App.tsx). `App` wires the shell:

```
BrowserRouter → FunModeProvider → WaterRippleLayer + Navbar + Router   (Footer + analytics outside)
```

- **Routing is centralized + data-driven.** [routes.config.tsx](routes/routes.config.tsx) exports
  `routePaths`, `routes: AppRoute[]`, and fun-stuff subroutes. [Router.tsx](routes/Router.tsx) maps
  over `routes`; [Navbar.tsx](components/navbar/Navbar.tsx) reuses it (filtering `dontShowInNavbar`).
  Each route's `title` syncs to `document.title` via [useDocumentTitle.ts](routes/useDocumentTitle.ts)
  (called in `Router`; unmatched → `*`/404 title). **Add a page by editing the config — never hard-code a path, nav link, or title.**
- **State is minimal**: Context for the global Fun-mode flag, `useState` for local UI. No Redux/external store.
- **Content lives in `data.ts`**, not JSX — typed against [data/data.types.ts](data/data.types.ts).
  Components are presentational, fed via props.

## Layout / folder conventions

**Casing rule** — filename = primary export:

| Kind                             | Case         | Examples                                                |
| -------------------------------- | ------------ | ------------------------------------------------------- |
| `.tsx` component                 | `PascalCase` | `Hero.tsx`, `PageHeader.tsx`                            |
| Hook (`useX`)                    | `camelCase`  | `useFunMode.ts`, `useDocumentTitle.ts`                  |
| Plain `.ts` (utils, data, logic) | `kebab-case` | `fun-mode.ts`, `jokes.ts`, `black-hole.ts`              |
| Folder mapping 1:1 to a `.tsx`   | `PascalCase` | `NullSpace/`, `GulagSort/`, `FunStuff/`, `Hero/`        |
| Folder for internal organization | `camelCase`  | `engine/`, `systems/`, `spaceMetalAbilities/`, `utils/` |

Don't name a hook file after its concept (`FunMode.ts` is wrong → `useFunMode.ts`).
Folder-per-component: `Thing/Thing.tsx` + `Thing/Thing.module.scss`.
Folder-per-page under [pages/](pages): `PageName.tsx`, `PageName.module.scss`, `data.ts`, plus a
local `components/` (PascalCase folders inside). Cross-page primitives live in [components/](components).

## The Professional ↔ Fun toggle (core feature)

The site's personality — treat it as first-class.

- **Source of truth**: [contexts/FunModeProvider.tsx](contexts/FunModeProvider.tsx) holds `isFunMode`.
  Read it with `useFunMode()` from [contexts/FunMode.ts](contexts/FunMode.ts) (throws outside the provider).
- **Persistence + CSS hook**: [modes/fun-mode.ts](modes/fun-mode.ts) persists to `localStorage` and
  toggles the `fun-mode` class on `<html>` — the bridge to styling.
- **Toggle UI**: [components/ModeToggle.tsx](components/ModeToggle.tsx), in the Navbar with `label1="Professional" label2="Fun"`.

When adding anything, ask "how should this behave in each mode?" Three patterns:

1. **Conditional render** — gate playful content with `isFunMode` (jokes in [HomePage.tsx](pages/home/HomePage.tsx),
   WaterRipple background, the `onlyShowInFunMode` flag).
2. **Swapped copy** — formal vs fun string picked by mode (`subtitle` vs `subtitleFun` in [home/data.ts](pages/home/data.ts)).
3. **CSS reactions** — `:global(html.fun-mode) & { ... }` inside a module for Fun-only animation/glow.

Professional mode stays clean, calm, recruiter-ready. Fun mode gets the animations, rainbow glows, jokes,
easter eggs (`/404` "Like the number 404?" link, Gulag Sort).
