import { RecallCategory } from './recall.types'

export const recallRadarCopy = {
  title: 'Recall Radar',
  intro:
    'A live view of US food-safety recalls. Each day this pulls the latest enforcement reports from the FDA, sorts them by likely cause, and tracks the trend over time.',
  introFun:
    "Because nothing says 'fun side project' like undeclared peanuts and the occasional rogue metal fragment — live FDA food recalls, sorted and plotted.",
  methodology:
    'Source: openFDA food enforcement reports. Categories come from a keyword baseline (v1); a trained classifier with calibrated confidence is the next step.',
}

export const categoryLabels: Record<RecallCategory, string> = {
  [RecallCategory.allergen]: 'Undeclared allergen',
  [RecallCategory.pathogen]: 'Pathogen',
  [RecallCategory.foreignMaterial]: 'Foreign material',
  [RecallCategory.mislabeling]: 'Mislabeling',
  [RecallCategory.other]: 'Other',
}

export const recallRadarLinks = [
  { label: 'openFDA food enforcement API', href: 'https://open.fda.gov/apis/food/enforcement/' },
  { label: 'Source on GitHub', href: 'https://github.com/BrentTB/brentbutkow.me-backend' },
]
