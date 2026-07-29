/** The environment, reached through `globalThis` because the browser tsconfig carries no node types. */
const env = (globalThis as unknown as { process?: { env?: Record<string, string | undefined> } })
  .process?.env

/**
 * Whether to skip the heavy deterministic soaks — the preset tests that run thousands of ticks on a full-size
 * world. They are worth keeping and too slow to run on every keystroke of a commit.
 *
 * Two reasons to skip. On CI (which sets `CI`) the shared runners are slow enough to blow the per-test timeout.
 * In the pre-commit hook (which sets `QUICK_TESTS`) they were essentially the entire cost of committing:
 * measured, eight soaks accounted for 66 of the 68 seconds `presets.test.ts` took, against 1.9 seconds for the
 * hook's typecheck, eslint and prettier put together. All of it is simulation — the tests' own scanning of the
 * grid measured free — so there is nothing in them to make cheaper, only somewhere better to run them.
 *
 * `npm test` sets neither, so a full local run still covers them.
 */
export const skipSoaks = Boolean(env?.CI) || Boolean(env?.QUICK_TESTS)
