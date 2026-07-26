/**
 * True when running on CI (GitHub Actions and its peers set `CI`). Heavy deterministic soak tests use this
 * to skip on CI — where the shared runners are slow enough to blow the per-test timeout — while still running
 * locally under `npm test`. Reached through globalThis because the browser tsconfig carries no node types.
 */
export const onCI = Boolean(
  (globalThis as unknown as { process?: { env?: Record<string, string | undefined> } }).process?.env
    ?.CI
)
