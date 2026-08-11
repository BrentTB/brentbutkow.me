---
name: og-card
description: >-
  Runbook for the Open Graph social card a page previews as when it is shared: the template variant,
  the copy shape, when a card earns bespoke art, the layout traps, and the generate-and-commit flow.
  Use whenever adding a page, changing a page's pitch, or touching scripts/og/.
---

# Add or change a social card — runbook

Every indexable route has its own card, and [site-invariants.test.ts](../../../src/site-invariants.test.ts)
enforces it three ways: a route must declare an `ogImage`, that path must have an entry in the generator,
and that entry's variant must exist in the template. A page without one falls back to the home card,
which reads "Brent Butkow — Full-stack engineer" — vague on a page about Brent, actively wrong on a tool.

## 1. Write the variant

[scripts/og/og-template.html](../../../scripts/og/og-template.html) — add an entry to `variants`. The
card is 1200x630 and has five parts, all optional except path and title:

| Field           | What it is                                                                                                       |
| --------------- | ---------------------------------------------------------------------------------------------------------------- |
| `path`          | The terminal-style route, e.g. `~/fun-stuff/ascii-art`. Mirrors the breadcrumb.                                  |
| `title`         | The page name alone. No "— Brent Butkow"; the brand line already says it.                                        |
| `subtitle`      | The page's pitch. See below. An array breaks the lines by hand; a string wraps.                                  |
| `tags`          | Zero or one short mono pill of prose. A row of source or agency codes may run longer — `recall-radar` lists six. |
| `art`           | A key handled in the `variant.art` block, only if the page earns it.                                             |
| `titleSize`     | Override when the default size breaks the title badly.                                                           |
| `subtitleWidth` | Override when the default column forces an extra line.                                                           |

## 2. Write the copy

The subtitle is **not** the `routesMeta` description. That one is written for search engines and repeats
"Brent Butkow" for keyword reasons; the card is read by a person deciding whether to click.

- **Two or three lines, roughly 110–135 characters.** Four lines drives the tag into the brand line,
  which is pinned to the bottom of the card.
- **Say what the page does and what is good about it**, in the voice from the `brent-writing-voice`
  memory — plain verbs, flowing sentences, contractions where natural, understated rather than salesy.
- **Describe the thing, not the mechanism.** "Point it at a photo, a video, or your webcam, and watch the
  whole thing come back as characters" beats naming the algorithm.
- Keep the escape hatches and the caveats off the card. They are page content, not the pitch.

## 3. Decide whether it gets art

Most cards should not. Bespoke art is for pages with something to draw, and the plain treatment (path,
title, subtitle, tag) is the correct answer for hub pages and pages about Brent — see the `education` or
`contact` variants.

When a page does earn art, **draw the thing the page does**, one frame of it:

- `null-space` — a starfield.
- `pixel-world-simulator` — a slab of the sim's own world mid-collapse, drawn from the material palette.
- `malicious-ux` — the No button caught mid-hop with the cursor still where it started.
- `othello` — the board mid-flip, in a position reached by playing it out.
- `ascii-art` — characters resolving out of noise into a shape.
- `gulag-sort` — the bars it kept, and dashed gaps where it deleted the rest.

Art lives in the right-hand 380px, inside the `.edgeArt` column, which is masked so it fades out before
the text. Setting `art` adds `hasEdgeArt` to the card, which narrows the text column to clear it.

Anything generated must be **deterministic** — seed your own LCG rather than using `Math.random`, or the
card changes every time somebody regenerates it and the diff is noise.

## 4. Wire it up

1. [scripts/generate-og.mjs](../../../scripts/generate-og.mjs) — add `{ variant, out }` to `cards`. The
   `out` path must match the `ogImage` exactly.
2. [src/routes/routes.meta.ts](../../../src/routes/routes.meta.ts) — add `ogImage: '/og/<name>.png'`.
3. `npm run generate:og` — drives headless Chrome, needs Chrome installed (or `CHROME=` set). Generation
   is deliberately **not** part of the build; the PNGs are committed.
4. Commit the new PNG.

## 5. Look at what came out

Open the PNG. Every trap below shipped once and none of them fail a test:

- **A title breaking mid-word.** "4×4×4 Tic-Tac-Toe" wrapped as "Tic-Tac-" / "Toe" at the default size.
  Fix with `titleSize`, not by renaming the page.
- **A four-line subtitle** pushing the tag into the brand line. Trim it, or widen with `subtitleWidth`
  if the art on that card fades early enough to allow it.
- **Art overflowing the card.** Four stacked 4×4 layers ran off the bottom; fourteen bars and an
  eight-column board both ran off the right. Count the pixels: the clear area is roughly x 110–380 inside
  the edge column.
- **Art that reads as a rendering fault.** An Othello disc drawn at exactly its halfway point is a 1px
  line, not a disc.
- **A depiction that could not happen.** If the art shows a game, play the position out from a legal
  start. An Othello board with the opening four untouched is impossible, because every play must flip
  something and those four squares churn the most.

## 6. Do not commit unchanged PNGs

`npm run generate:og` rewrites **every** card, and the encoder is not byte-stable, so cards you did not
touch come back a few hundred bytes different. Revert those: `git checkout public/og/<unchanged>.png`.
Otherwise a one-card change lands as a multi-megabyte diff.
