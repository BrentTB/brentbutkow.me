export type Project = {
  name: string
  href: string
  blurb: string
}

// Substantial builds. Room to grow as more ship.
export const projects: Project[] = [
  {
    name: 'Recall Radar',
    href: '/recall-radar',
    blurb:
      'A live US & UK food-recall dashboard. Full-stack — a Python/FastAPI service ingests FDA, USDA FSIS, and UK FSA data daily, classifies each recall with an ML model, and serves it to this React + TypeScript frontend.',
  },
]
