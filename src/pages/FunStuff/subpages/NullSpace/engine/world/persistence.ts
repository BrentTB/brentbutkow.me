const STORAGE_KEY = 'null-space-high-score'

export function loadHighScore(): number {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (raw === null) return 0
    const parsed = Number(raw)
    if (!Number.isFinite(parsed) || parsed < 0) return 0
    return Math.floor(parsed)
  } catch {
    return 0
  }
}

export function saveHighScore(score: number): void {
  try {
    const current = loadHighScore()
    if (score > current) {
      localStorage.setItem(STORAGE_KEY, String(Math.floor(score)))
    }
  } catch {
    // localStorage unavailable
  }
}

// Architecture defaults to false to hide the noisy internal entries until the
// player opts in.
const CHANGELOG_FILTERS_KEY = 'null-space-changelog-filters'

export const ChangelogCategory = {
  breaking: 'breaking',
  features: 'features',
  balance: 'balance',
  fixes: 'fixes',
  ui: 'ui',
  architecture: 'architecture',
} as const
export type ChangelogCategory = (typeof ChangelogCategory)[keyof typeof ChangelogCategory]

export type ChangelogFilters = Record<ChangelogCategory, boolean>

export const DEFAULT_CHANGELOG_FILTERS: ChangelogFilters = {
  breaking: true,
  features: true,
  balance: true,
  fixes: true,
  ui: true,
  architecture: false,
}

// Display order + labels for changelog categories — single source of truth for
// the filter dropdown and the changelog render.
export const CHANGELOG_CATEGORIES: { key: ChangelogCategory; label: string }[] = [
  { key: ChangelogCategory.breaking, label: 'Breaking' },
  { key: ChangelogCategory.features, label: 'Features' },
  { key: ChangelogCategory.balance, label: 'Balance' },
  { key: ChangelogCategory.fixes, label: 'Fixes' },
  { key: ChangelogCategory.ui, label: 'User Interface' },
  { key: ChangelogCategory.architecture, label: 'Internal Architecture' },
]

function isChangelogFilters(value: unknown): value is ChangelogFilters {
  if (!value || typeof value !== 'object') return false
  const obj = value as Record<string, unknown>
  return Object.values(ChangelogCategory).every((key) => typeof obj[key] === 'boolean')
}

export function loadChangelogFilters(): ChangelogFilters {
  try {
    const raw = localStorage.getItem(CHANGELOG_FILTERS_KEY)
    if (raw === null) return { ...DEFAULT_CHANGELOG_FILTERS }
    const parsed: unknown = JSON.parse(raw)
    if (!isChangelogFilters(parsed)) return { ...DEFAULT_CHANGELOG_FILTERS }
    // Rebuild from known categories so a renamed/removed key in an old blob is dropped.
    const result = { ...DEFAULT_CHANGELOG_FILTERS }
    for (const key of Object.values(ChangelogCategory)) {
      result[key] = parsed[key]
    }
    return result
  } catch {
    return { ...DEFAULT_CHANGELOG_FILTERS }
  }
}

export function saveChangelogFilters(filters: ChangelogFilters): void {
  try {
    localStorage.setItem(CHANGELOG_FILTERS_KEY, JSON.stringify(filters))
  } catch {
    // localStorage unavailable
  }
}
