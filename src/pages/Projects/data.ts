export type Project = {
  name: string
  /** The domain the project works in, for the row's left rail. Shown uppercased. */
  label: string
  href: string
  blurb: string
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
]
