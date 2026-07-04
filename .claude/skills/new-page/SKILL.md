---
name: new-page
description: >-
  Runbook for adding a new page/route to the site: route table, SEO meta, sitemap,
  fun-mode behavior, and the propagation checks past reviews caught missing. Use whenever
  adding a page, route, subpage, or redirect — or when a new URL needs to exist.
---

# Add a page/route — runbook

Propagation-heavy workflow: a route touches five files that don't import each other. Do the
steps in order; each names its exact file.

## 1. Declare the path

[src/routes/routes.paths.ts](../../../src/routes/routes.paths.ts) — add to `routePaths`
(`kebab-case` URL). Nothing else may ever hard-code the URL string: consumers write
`routePaths.myPage`. If a back button will land on this page, also add a short name to
`routeLabels` in the same file.

## 2. Add SEO meta (mandatory — the app throws without it)

[src/routes/routes.meta.ts](../../../src/routes/routes.meta.ts) — add a `routesMeta` entry
keyed by the path. `title` + `description` are required (`metaFor` throws at module init if
missing, and `routes.config.test.ts` asserts them). Optional: `ogImage` (path under
`public/`, regenerate via `npm run generate:og`), `jsonLd`, `noindex: true` for
non-indexable routes. The prerender plugin reads this file at build time — keep it free of
component imports.

## 3. Create the page

Folder-per-page under `src/pages/`: folder `Thing/` with `ThingPage.tsx` +
`ThingPage.module.scss` + `data.ts` (existing pages: `Home/HomePage.tsx`,
`Education/EducationPage.tsx`). Copy lives in `data.ts`, not JSX; components are
presentational. Named exports only. Follow the editorial layout language in [src/pages/CLAUDE.md](../../../src/pages/CLAUDE.md)
(rows + hairlines, not card grids) and casing rules in [src/CLAUDE.md](../../../src/CLAUDE.md).

## 4. Register the route

[src/routes/routes.config.tsx](../../../src/routes/routes.config.tsx) — add an `AppRoute`
entry: `path: routePaths.myPage`, `element`, `...metaFor(routePaths.myPage)`. Default:
navbar pages load eagerly, everything else uses the `lazy(...)` pattern at the top of the
file (keeps leaf pages out of the initial bundle). Set `label` for a navbar tab, or
`dontShowInNavbar: true` and link to it from its parent page instead.
Fun-stuff subpages go in `funStuffRoutes` with paths composed from `funStuffSubRoutes`.

## 5. Decide fun-mode behavior (required decision, even if the answer is "nothing")

Every page answers "how does this behave in each mode?" — the three patterns (conditional
render / swapped copy / `:global(html.fun-mode) &` CSS) are in
[src/CLAUDE.md](../../../src/CLAUDE.md) "The Professional ↔ Fun toggle".

## 6. Sitemap (the step everyone forgets)

[public/sitemap.xml](../../../public/sitemap.xml) is hand-maintained — add a `<url>` block
(`loc` + `changefreq` + `priority`, match neighbors). Skip only for `noindex` routes, the
`*` catch-all, and dynamic detail pages (`:param` paths).

## 7. Propagate and verify

- Link to the page from wherever users should find it (Projects page, parent page, navbar) —
  via `routePaths`, internal `<Link>`, never a literal string or raw `<a>` (lint blocks raw anchors).
- `npm run check` and `npm test` — `routes.config.test.ts` enforces unique paths,
  title/description presence, and navbar labels.
- New user-facing copy → run the humanizer skill. UI built → frontend-design skill applies.
- See the change working: follow the `visual-verify` skill (dev server port drifts — read
  the log, don't trust the default).
