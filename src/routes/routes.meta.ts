// Pure route metadata: titles, descriptions, social images, and structured data, keyed by path.
// No component or page imports live here, so build tooling (the prerender plugin in
// vite.config.ts) can import this without dragging React, SCSS, or page chunks into node.
// routes.config.tsx spreads these entries into the route table — this file is the single
// source of truth for what search engines and social scrapers see per route.

import { routePaths } from './routes.paths'
import { funStuffSubRoutes } from '../pages/FunStuff/data'
import { gamesSubRoutes } from '../pages/FunStuff/subpages/Games/data'

export const SITE_URL = 'https://brentbutkow.me'
/** Site-wide social share image, used when a route has no ogImage of its own. */
export const DEFAULT_OG_IMAGE = '/og-image.png'

export type RouteMeta = {
  /** Full document title for this route (drives the browser tab / SEO). */
  title: string
  /** Meta description for this route (drives search snippets + Open Graph). */
  description: string
  /** Route-specific Open Graph image path under /public; falls back to DEFAULT_OG_IMAGE. */
  ogImage?: string
  /** schema.org structured data, injected as a JSON-LD script at build time. */
  jsonLd?: Record<string, unknown>
  /** Keep this route out of search indexes (emits `robots: noindex, nofollow`). */
  noindex?: boolean
}

const gamesPath = `${routePaths.funStuff}${funStuffSubRoutes.games}`
const nullSpacePath = `${gamesPath}${gamesSubRoutes.nullSpace}`
const pixelWorldPath = `${gamesPath}${gamesSubRoutes.pixelWorldSimulator}`
const ticTacToePath = `${gamesPath}${gamesSubRoutes.ticTacToe}`
const othelloPath = `${gamesPath}${gamesSubRoutes.othello}`

/** Looks up meta for a path, failing loudly at module-init if a route forgot its entry. */
export function metaFor(path: string): RouteMeta {
  const meta = routesMeta[path]
  if (!meta) throw new Error(`routes.meta: no meta entry for path "${path}"`)
  return meta
}

/** Meta for every routable page, keyed by path ('*' is the 404 catch-all). */
export const routesMeta: Record<string, RouteMeta> = {
  [routePaths.home]: {
    title: 'Brent Butkow — Full-stack engineer',
    description:
      'Full-stack engineer at Foodcomply. Building cloud infrastructure and web apps, with a side of wacky projects and dad jokes.',
    jsonLd: {
      '@context': 'https://schema.org',
      '@type': 'Person',
      name: 'Brent Butkow',
      url: SITE_URL,
      jobTitle: 'Software Engineer',
      worksFor: { '@type': 'Organization', name: 'Foodcomply' },
      alumniOf: { '@type': 'CollegeOrUniversity', name: 'University of the Witwatersrand' },
      knowsAbout: ['TypeScript', 'React', 'Node.js', 'Food-safety compliance software'],
    },
  },
  [routePaths.experience]: {
    title: 'Experience — Brent Butkow',
    description:
      'The professional experience of Brent Butkow — full-stack and cloud engineering roles, the stacks used, and what was shipped.',
  },
  [routePaths.education]: {
    title: 'Education — Brent Butkow',
    description:
      'The education and academic background of Brent Butkow in software and engineering.',
  },
  [routePaths.achievements]: {
    title: 'Achievements — Brent Butkow',
    description:
      'Awards, recognition, and standout achievements from the studies and career of Brent Butkow.',
  },
  [routePaths.projects]: {
    title: 'Projects — Brent Butkow',
    description:
      'Software projects built by Brent Butkow, including Recall Radar, a live US, Canada, UK, EU and SA food-recall dashboard.',
  },
  [routePaths.recallRadar]: {
    title: 'Food Recall Tracker — US, Canada, UK, EU & SA | Recall Radar — Brent Butkow',
    description:
      'Track the latest food recalls across the US, Canada, UK, EU and South Africa. Updated daily from FDA, USDA, NCC, CFIA, FSA and RASFF, with free email alerts and severity ratings.',
    ogImage: '/og/recall-radar.png',
    jsonLd: {
      '@context': 'https://schema.org',
      '@type': 'WebApplication',
      name: 'Recall Radar',
      url: `${SITE_URL}${routePaths.recallRadar}`,
      applicationCategory: 'Food safety',
      operatingSystem: 'Web browser',
      description:
        'A live food-recall dashboard tracking the US, Canada, UK, EU and South Africa. Updated daily from FDA, USDA FSIS, CFIA, FSA, RASFF and NCC, with ML classification, severity ratings and free email alerts.',
      offers: { '@type': 'Offer', price: '0', priceCurrency: 'USD' },
      creator: { '@type': 'Person', name: 'Brent Butkow', url: SITE_URL },
    },
  },
  // Subscription flow pages are reached from email links only — keep them out of search indexes.
  [routePaths.recallRadarConfirm]: {
    title: 'Confirm subscription — Recall Radar',
    description: 'Confirm your Recall Radar alert subscription.',
    noindex: true,
  },
  [routePaths.recallRadarManage]: {
    title: 'Manage alerts — Recall Radar',
    description: 'Manage or unsubscribe from your Recall Radar alerts.',
    noindex: true,
  },
  [routePaths.recallRadarUnsubscribe]: {
    title: 'Unsubscribe — Recall Radar',
    description: 'Unsubscribe from your Recall Radar alerts.',
    noindex: true,
  },
  [`${routePaths.recallRadar}/:source/:recallNumber`]: {
    title: 'Recall — Recall Radar',
    description:
      'A single food-recall record on Recall Radar — full details, ML classification, and related recalls.',
  },
  [routePaths.funStuff]: {
    title: 'Fun Stuff — Brent Butkow',
    description:
      'Side projects, experiments, and playful builds by Brent Butkow — browser games, a joke sorting algorithm, and more.',
  },
  [gamesPath]: {
    title: 'Games — Brent Butkow',
    description:
      'Browser games and interactive experiments by Brent Butkow, playable right in your browser.',
  },
  [nullSpacePath]: {
    title: 'Null Space — Brent Butkow',
    description:
      'Null Space — a browser space-defense game where you bend space itself: launch meteors, open black holes, and warp reality to protect your ship.',
    ogImage: '/og/null-space.png',
    jsonLd: {
      '@context': 'https://schema.org',
      '@type': 'VideoGame',
      name: 'Null Space',
      url: `${SITE_URL}${nullSpacePath}`,
      genre: 'Space defense',
      gamePlatform: 'Web browser',
      playMode: 'SinglePlayer',
      description:
        'A browser space-defense game where you bend space itself: launch meteors, open black holes, and warp reality to protect your ship.',
      author: { '@type': 'Person', name: 'Brent Butkow', url: SITE_URL },
      offers: { '@type': 'Offer', price: '0', priceCurrency: 'USD' },
    },
  },
  [pixelWorldPath]: {
    title: 'Pixel World Simulator — Brent Butkow',
    description:
      'Pixel World Simulator — a browser sandbox where you draw materials and watch them fall, flow, and react to each other.',
    ogImage: '/og/pixel-world-simulator.png',
    jsonLd: {
      '@context': 'https://schema.org',
      '@type': 'VideoGame',
      name: 'Pixel World Simulator',
      url: `${SITE_URL}${pixelWorldPath}`,
      genre: 'Sandbox',
      gamePlatform: 'Web browser',
      playMode: 'SinglePlayer',
      description:
        'A browser sandbox where you draw materials and watch them fall, flow, and react to each other.',
      author: { '@type': 'Person', name: 'Brent Butkow', url: SITE_URL },
      offers: { '@type': 'Offer', price: '0', priceCurrency: 'USD' },
    },
  },
  [ticTacToePath]: {
    title: '4×4×4 Tic-Tac-Toe — Brent Butkow',
    description:
      'Four in a row on a 4×4 board, except the board is a cube four layers deep. Turn the cube or spread the layers out, then play a friend on the same screen, a friend online over a room code, or a computer opponent with four difficulty levels.',
    jsonLd: {
      '@context': 'https://schema.org',
      '@type': 'VideoGame',
      name: '4×4×4 Tic-Tac-Toe',
      url: `${SITE_URL}${ticTacToePath}`,
      genre: 'Strategy',
      gamePlatform: 'Web browser',
      playMode: ['SinglePlayer', 'MultiPlayer'],
      description:
        'Four in a row on a 4×4 board, except the board is a cube four layers deep. A line can run along a row, up a rod, or corner to corner through the cube. Play a friend on the same screen, a friend online over a room code, or a computer opponent with four difficulty levels.',
      author: { '@type': 'Person', name: 'Brent Butkow', url: SITE_URL },
      offers: { '@type': 'Offer', price: '0', priceCurrency: 'USD' },
    },
  },
  [othelloPath]: {
    title: 'Othello — Brent Butkow',
    description:
      'Play Othello in your browser. Trap a line of your opponent’s discs and they flip to your colour; whoever holds the most when the board fills wins. Play a friend on the same screen, a friend online over a room code, or a computer opponent at three difficulty levels, on a 6×6, 8×8, or 10×10 board.',
    jsonLd: {
      '@context': 'https://schema.org',
      '@type': 'VideoGame',
      name: 'Othello',
      url: `${SITE_URL}${othelloPath}`,
      genre: 'Strategy',
      gamePlatform: 'Web browser',
      playMode: ['SinglePlayer', 'MultiPlayer'],
      description:
        'Othello (Reversi): trap a line of your opponent’s discs between two of yours and they all flip to your colour. Whoever holds the most discs when the board fills wins. Play a friend on the same screen, a friend online over a room code, or a computer opponent at three difficulty levels, on a 6×6, 8×8, or 10×10 board.',
      author: { '@type': 'Person', name: 'Brent Butkow', url: SITE_URL },
      offers: { '@type': 'Offer', price: '0', priceCurrency: 'USD' },
    },
  },
  [`${routePaths.funStuff}${funStuffSubRoutes.asciiArt}`]: {
    title: 'ASCII Art Studio — Brent Butkow',
    description:
      'ASCII Art Studio — turn a photo, video, or your webcam into live ASCII art entirely in your browser. A TypeScript port of Brent Butkow’s Python vidToAscii tool.',
  },
  [`${routePaths.funStuff}${funStuffSubRoutes.imageEncoder}`]: {
    title: 'Image Encoder — Brent Butkow',
    description:
      'Image Encoder — hide a secret message inside a picture by nudging its pixel colors, optionally lock it with a key, and reveal it again. Steganography that runs entirely in your browser.',
  },
  [`${routePaths.funStuff}${funStuffSubRoutes.gulagSort}`]: {
    title: 'Gulag Sort — Brent Butkow',
    description:
      'Gulag Sort — a self-developed sorting algorithm by Brent Butkow, riffing on the joke Stalin sort.',
  },
  [`${routePaths.funStuff}${funStuffSubRoutes.courseProjects}`]: {
    title: 'Course Projects — Brent Butkow',
    description:
      'A collection of software projects Brent Butkow built during school and university.',
  },
  [routePaths.contact]: {
    title: 'Contact — Brent Butkow',
    description: 'Get in touch with Brent Butkow — email, GitHub, LinkedIn, and more.',
  },
  [routePaths.admin]: {
    title: 'Admin — Brent Butkow',
    description: 'Private admin dashboard.',
    noindex: true,
  },
  [routePaths.notFound]: {
    title: 'Page not found — Brent Butkow',
    description: 'The page you are looking for does not exist.',
  },
}

/**
 * Every page a visitor can actually reach and browse: indexable, real, and static. Derived from the meta
 * table rather than listed by hand, because three places wanted the same list and a hand-kept copy is a
 * list somebody forgets — the home terminal's filesystem shipped without the pixel world for exactly that
 * reason. Excludes pages held out of search (email landings, admin), the 404 catch-all, and routes with a
 * dynamic segment, which are a page per record rather than a page you can navigate to.
 *
 * The order is the order of the table above, so the terminal's tree and the sitemap read in the same order
 * the routes are declared in.
 */
export const browsableRoutePaths: readonly string[] = Object.entries(routesMeta)
  .filter(([path, meta]) => !meta.noindex && path !== routePaths.notFound && !path.includes(':'))
  .map(([path]) => path)
