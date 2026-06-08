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

// Changelog filter persistence. Keys mirror the ChangelogEntry.changes shape so
// each toggle maps 1:1 to a category. Architecture defaults to false so the
// noisy internal entries are hidden until the player opts in.
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
    return parsed
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
