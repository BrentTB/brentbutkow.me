# src/pages/CLAUDE.md

Page layout language (content-first, NOT card-based). See [src/CLAUDE.md](../CLAUDE.md) for folder conventions and the Fun toggle, [src/styles/CLAUDE.md](../styles/CLAUDE.md) for tokens + `card-base`.

Content pages avoid the "title + subtitle + grid of boxes" template. Keep them editorial:

- **`PageHeader` renders a title only** — no decorative subtitle restating the title.
- **The two `cards/` atoms are editorial rows, not boxes.** `DetailCard` (Experience, Education) is a
  timeline row: mono **date rail** (`grid-template-columns: 150px 1fr`) beside content. `ArticleOrLinkCard`
  (Achievements, Fun Stuff, Contact) is a list row with a hairline `border-top`, left accent bar + `→`/`↗`
  on hover for links. Achievements groups rows under a year rail. New lists follow this row+hairline pattern.
- **Class-collision gotcha**: page-specific `*Card` styles compose onto the same element as the atom's
  `.card` (CSS-modules merge both). Don't set `display`/layout on the page-level `.card` — it races the
  atom's. Put layout on an inner wrapper (see `ContactCard`'s `.row`).
