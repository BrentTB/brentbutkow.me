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
