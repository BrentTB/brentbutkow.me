export type Project = {
  name: string
  /** The domain the project works in, for the row's left rail. Shown uppercased. */
  label: string
  href: string
  blurb: string
  /** Opens in a new tab instead of routing, for projects that live on their own domain. */
  external?: boolean
}

// Substantial builds. Room to grow as more ship.
export const projects: Project[] = [
  {
    name: 'Recall Radar',
    label: 'Food safety',
    href: '/projects/recall-radar',
    blurb:
      'A live US, UK, EU, Canada and South Africa food-recall dashboard. Full-stack: a Python/FastAPI service ingests FDA, USDA, NCC, CFIA, FSA, and RASFF data daily, classifies each recall with an ML model, and serves it to this React + TypeScript frontend.',
  },
  {
    name: 'Nimble Toolbox',
    label: 'Web tools',
    href: 'https://nimbletoolbox.com',
    external: true,
    blurb:
      'Image, PDF, text and code utilities that all run inside your browser tab, so files never get uploaded anywhere. Astro static pages with React islands, hosted on Cloudflare Pages, with no server required. An experiment in whether search traffic alone can make a static site pay for itself.',
  },
]
