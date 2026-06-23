import {
  EntityType,
  RecallCategory,
  RecallClass,
  RecallCountry,
  RecallSort,
  RecallSource,
  SeverityLabel,
  TrendGroup,
  isRecallCategory,
  isRecallSource,
  isSeverityLabel,
} from './recall.types'

export const recallRadarCopy = {
  title: 'Recall Radar',
  intro:
    'A live view of US, UK & South African food-safety recalls. Each day this pulls the latest reports from the US (FDA, USDA FSIS), the UK (FSA), and South Africa (NCC), sorts them by likely cause, and tracks the trend over time.',
  introFun:
    "Because nothing says 'fun side project' like undeclared peanuts and the occasional rogue metal fragment. Live US, UK & South African food recalls, sorted and plotted.",
  methodology:
    "Sources: US openFDA + USDA FSIS, UK Food Standards Agency alerts, and South Africa's National Consumer Commission notices. Categories are assigned by a TF-IDF + logistic-regression classifier trained on the recall text; the % on each recall is the model confidence.",
  about:
    'A full-stack side project. A Python/FastAPI service ingests food-recall data from the US (FDA openFDA, USDA FSIS), the UK (Food Standards Agency), and South Africa (National Consumer Commission) every day, classifies each recall by likely cause, and stores it in Postgres. This React + TypeScript dashboard reads a documented JSON API to explore it. It is built to production standards: typed end to end, tested, migrated with Alembic, rate-limited, and deployed behind a daily ingest job.',
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
      'openFDA + USDA FSIS + UK FSA + NCC (SA)',
      'GitHub Actions (daily ingest)',
      'Render',
      'Docker',
    ],
  },
]

export const methodologyPoints: string[] = [
  'Data comes from the US (FDA openFDA + USDA FSIS), the UK (Food Standards Agency), and South Africa (National Consumer Commission, plus a few curated Woolworths/Shoprite/NRCS recalls the NCC feed misses), re-ingested daily via a GitHub Actions cron.',
  "Each recall's cause is predicted by a TF-IDF + logistic-regression classifier trained on its reason text; the % shown is the model's confidence.",
  'The model is weakly supervised by a keyword baseline (no human-labelled gold set), so it generalises that taxonomy rather than beating an independent ground truth.',
  'Allergens, pathogens, and physical hazards are pulled from each reason with a curated gazetteer (the FDA/UK regulated allergen lists and named pathogens) — deterministic and fully explainable.',
  'Trend callouts come from a robust z-score (median + MAD) over the monthly counts — a flag means a month is unusual versus its own recent history, never a forecast. We surface the most significant from the last ~2 years, newest first. A statsmodels STL decomposition validates the detector offline against seasonality.',
  'The Outlook looks the other way: a short-horizon projection of overall monthly volume from a self-built multiplicative seasonal model (a 12-month seasonal index plus a linear trend, fit in log space so a seasonal swing scales with the level; pure numpy computed on read) with a ±band from recent forecast error — shown as the dashed bars on the chart. A statsmodels Holt-Winters backtest validates it offline. It is a projection, not a promise, and a short or sparse history shows no forecast at all.',
  'The dashboard flags when the last successful ingest is more than two days old.',
]

// Plain-language version of the above — no ML jargon — shown first under "How it works", with the
// technical points tucked behind a toggle.
export const methodologySimple: string[] = [
  'Every day we pull the latest food recalls from the US (FDA, USDA), the UK (FSA), and South Africa (NCC).',
  'Each recall is sorted automatically by its likely cause: an undeclared allergen, a pathogen, a foreign object, and so on.',
  'We score how serious each one is, from low to severe, and group recalls that look related or part of the same outbreak.',
  'We chart the monthly trend, point out unusually busy months, and project the months ahead.',
  "It's all built from the public recall notices, and the page shows when the data was last refreshed.",
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
  [RecallSource.ncc]: 'NCC',
  [RecallSource.woolworths]: 'Woolworths',
  [RecallSource.shoprite]: 'Shoprite/Checkers',
  [RecallSource.nrcs]: 'NRCS',
}

export const countryLabels: Record<RecallCountry, string> = {
  [RecallCountry.us]: 'United States',
  [RecallCountry.uk]: 'United Kingdom',
  [RecallCountry.za]: 'South Africa',
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
  [TrendGroup.severity]: 'By severity',
  [TrendGroup.classification]: 'By classification',
}

export const severityLabels: Record<SeverityLabel, string> = {
  [SeverityLabel.severe]: 'Severe',
  [SeverityLabel.high]: 'High',
  [SeverityLabel.moderate]: 'Moderate',
  [SeverityLabel.low]: 'Low',
}

// Worst → least: the order the distribution bar stacks and the legend reads.
export const severityOrder: SeverityLabel[] = [
  SeverityLabel.severe,
  SeverityLabel.high,
  SeverityLabel.moderate,
  SeverityLabel.low,
]

// Red → amber → muted gold → grey: hotter means more severe, harmonised with the dark/amber theme.
export const severityColors: Record<SeverityLabel, string> = {
  [SeverityLabel.severe]: '#e0675c',
  [SeverityLabel.high]: '#e0954a',
  [SeverityLabel.moderate]: '#d8c074',
  [SeverityLabel.low]: '#8d8a82',
}

export const sortLabels: Record<RecallSort, string> = {
  [RecallSort.recency]: 'Newest first',
  [RecallSort.severity]: 'Most severe',
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
  [RecallSource.ncc]: '#c2a0b8',
  [RecallSource.woolworths]: '#d98c6a',
  [RecallSource.shoprite]: '#6aa888',
  [RecallSource.nrcs]: '#b08fc7',
}

export function trendColor(group: TrendGroup, key: string): string {
  if (group === TrendGroup.category && isRecallCategory(key)) return CATEGORY_COLORS[key]
  if (group === TrendGroup.source && isRecallSource(key)) return SOURCE_COLORS[key]
  // Severity reuses its semantic band colors; classification falls to the hashed palette below.
  if (group === TrendGroup.severity && isSeverityLabel(key)) return severityColors[key]
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
  // South Africa's NCC issues no formal classification, so there's nothing to filter by.
  [RecallCountry.za]: [],
}

export const sourcesByCountry: Record<RecallCountry, RecallSource[]> = {
  [RecallCountry.us]: [RecallSource.fda, RecallSource.usda],
  [RecallCountry.uk]: [RecallSource.uk],
  [RecallCountry.za]: [
    RecallSource.ncc,
    RecallSource.woolworths,
    RecallSource.shoprite,
    RecallSource.nrcs,
  ],
}

export const recallRadarLinks = [
  { label: 'openFDA food enforcement API', href: 'https://open.fda.gov/apis/food/enforcement/' },
  {
    label: 'USDA FSIS recall API',
    href: 'https://www.fsis.usda.gov/science-data/developer-resources/recall-api',
  },
  { label: 'UK FSA food alerts API', href: 'https://data.food.gov.uk/food-alerts/ui/reference' },
  { label: 'South Africa NCC recalls', href: 'https://thencc.org.za/product-recalls/' },
  { label: 'Source on GitHub', href: 'https://github.com/BrentTB/brentbutkow.me-backend' },
]
