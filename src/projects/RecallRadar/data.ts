import {
  EntityType,
  RecallCategory,
  RecallClass,
  RecallCountry,
  RecallSource,
  TrendGroup,
  isRecallCategory,
  isRecallSource,
} from './recall.types'

export const recallRadarCopy = {
  title: 'Recall Radar',
  intro:
    'A live view of US & UK food-safety recalls. Each day this pulls the latest reports from the US (FDA, USDA FSIS) and the UK (FSA), sorts them by likely cause, and tracks the trend over time.',
  introFun:
    "Because nothing says 'fun side project' like undeclared peanuts and the occasional rogue metal fragment. Live US & UK food recalls, sorted and plotted.",
  methodology:
    'Sources: US openFDA + USDA FSIS, and UK Food Standards Agency alerts. Categories are assigned by a TF-IDF + logistic-regression classifier trained on the recall text; the % on each recall is the model confidence.',
  about:
    'A full-stack side project. A Python/FastAPI service ingests food-recall data from the US (FDA openFDA, USDA FSIS) and the UK (Food Standards Agency) every day, classifies each recall by likely cause, and stores it in Postgres. This React + TypeScript dashboard reads a documented JSON API to explore it. It is built to production standards: typed end to end, tested, migrated with Alembic, rate-limited, and deployed behind a daily ingest job.',
  techStackPrompt: 'Interested in the tech stack? ↓',
  stateMapTitle: 'US recalls by state',
}

export const techStack: { area: string; items: string[] }[] = [
  {
    area: 'Frontend',
    items: ['React 18', 'TypeScript', 'Vite', 'SCSS Modules', 'Hand-rolled SVG charts'],
  },
  {
    area: 'Backend',
    items: ['FastAPI', 'Python 3.11', 'SQLAlchemy 2.0', 'Pydantic v2', 'Alembic'],
  },
  {
    area: 'Data & infra',
    items: [
      'PostgreSQL (Neon)',
      'openFDA + USDA FSIS + UK FSA APIs',
      'GitHub Actions (daily ingest)',
      'Render',
      'Docker',
    ],
  },
]

export const methodologyPoints: string[] = [
  'Data comes from the US (FDA openFDA + USDA FSIS) and the UK (Food Standards Agency), re-ingested daily via a GitHub Actions cron.',
  "Each recall's cause is predicted by a TF-IDF + logistic-regression classifier trained on its reason text; the % shown is the model's confidence.",
  'The model is weakly supervised by a keyword baseline (no human-labelled gold set), so it generalises that taxonomy rather than beating an independent ground truth.',
  'Allergens, pathogens, and physical hazards are pulled from each reason with a curated gazetteer (the FDA/UK regulated allergen lists and named pathogens) — deterministic and fully explainable.',
  'Trend callouts come from a robust z-score (median + MAD) over the monthly counts — a flag means a month is unusual versus its own recent history, never a forecast. We surface the most significant from the last ~2 years, newest first. A statsmodels STL decomposition validates the detector offline against seasonality.',
  'The dashboard flags when the last successful ingest is more than two days old.',
]

export const categoryLabels: Record<RecallCategory, string> = {
  [RecallCategory.allergen]: 'Undeclared allergen',
  [RecallCategory.pathogen]: 'Pathogen',
  [RecallCategory.foreignMaterial]: 'Foreign material',
  [RecallCategory.mislabeling]: 'Mislabeling',
  [RecallCategory.contaminant]: 'Contaminant',
  [RecallCategory.other]: 'Other',
}

export const sourceLabels: Record<RecallSource, string> = {
  [RecallSource.fda]: 'FDA',
  [RecallSource.usda]: 'USDA FSIS',
  [RecallSource.uk]: 'UK FSA',
}

export const countryLabels: Record<RecallCountry, string> = {
  [RecallCountry.us]: 'United States',
  [RecallCountry.uk]: 'United Kingdom',
}

export const entityTypeLabels: Record<EntityType, string> = {
  [EntityType.allergen]: 'Allergen',
  [EntityType.pathogen]: 'Pathogen',
  [EntityType.hazard]: 'Foreign material',
  [EntityType.contaminant]: 'Contaminant',
}

export const trendGroupLabels: Record<TrendGroup, string> = {
  [TrendGroup.total]: 'Total',
  [TrendGroup.category]: 'By cause',
  [TrendGroup.source]: 'By source',
}

// Muted, warm-leaning palette for stacked trend segments — harmonises with the amber/dark theme.
const TREND_PALETTE = ['#e9b872', '#e57373', '#8fb0c9', '#9fbf9f', '#c2a0b8', '#8d8a82']
const CATEGORY_COLORS: Record<RecallCategory, string> = {
  [RecallCategory.allergen]: '#e9b872',
  [RecallCategory.pathogen]: '#e57373',
  [RecallCategory.foreignMaterial]: '#8fb0c9',
  [RecallCategory.mislabeling]: '#9fbf9f',
  [RecallCategory.contaminant]: '#c2a0b8',
  [RecallCategory.other]: '#8d8a82',
}
const SOURCE_COLORS: Record<RecallSource, string> = {
  [RecallSource.fda]: '#e9b872',
  [RecallSource.usda]: '#8fb0c9',
  [RecallSource.uk]: '#9fbf9f',
}

export function trendColor(group: TrendGroup, key: string): string {
  if (group === TrendGroup.category && isRecallCategory(key)) return CATEGORY_COLORS[key]
  if (group === TrendGroup.source && isRecallSource(key)) return SOURCE_COLORS[key]
  if (group === TrendGroup.total) return '#e9b872'
  // Stable per-key fallback for any unrecognised key — hashed so the color never shifts with order.
  let hash = 0
  for (const ch of key) hash = (hash + ch.charCodeAt(0)) % TREND_PALETTE.length
  return TREND_PALETTE[hash]
}

// Which classifications / sources belong to each country — drives the country-specific filters
// (US and UK are shown separately, so their dropdowns must not bleed into each other).
export const classesByCountry: Record<RecallCountry, RecallClass[]> = {
  [RecallCountry.us]: [
    RecallClass.classI,
    RecallClass.classII,
    RecallClass.classIII,
    RecallClass.publicHealthAlert,
  ],
  [RecallCountry.uk]: [
    RecallClass.productRecall,
    RecallClass.allergyAlert,
    RecallClass.foodAlertForAction,
  ],
}

export const sourcesByCountry: Record<RecallCountry, RecallSource[]> = {
  [RecallCountry.us]: [RecallSource.fda, RecallSource.usda],
  [RecallCountry.uk]: [RecallSource.uk],
}

export const recallRadarLinks = [
  { label: 'openFDA food enforcement API', href: 'https://open.fda.gov/apis/food/enforcement/' },
  {
    label: 'USDA FSIS recall API',
    href: 'https://www.fsis.usda.gov/science-data/developer-resources/recall-api',
  },
  { label: 'UK FSA food alerts API', href: 'https://data.food.gov.uk/food-alerts/ui/reference' },
  { label: 'Source on GitHub', href: 'https://github.com/BrentTB/brentbutkow.me-backend' },
]
