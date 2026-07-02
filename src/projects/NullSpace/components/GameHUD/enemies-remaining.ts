// The tally surfaces only in the home stretch of a wave, so it reads as "almost
// there" instead of a HUD number that's always on.
export const ENEMIES_LEFT_THRESHOLD = 5

// Enemies still standing between you and a cleared wave: the ones yet to spawn
// plus the ones on the field. (spawned − alive) is how many are already dead.
export function enemiesRemaining(total: number, spawned: number, alive: number): number {
  return Math.max(0, total - spawned + alive)
}

// Show the tally only once at least one enemy has died and few remain. Gating on a
// kill (not just the count) keeps a small wave — one already at or below the
// threshold — hidden until the player has actually thinned it. For waves larger
// than the threshold this is a no-op: dropping to the threshold already means a kill.
export function shouldShowEnemiesRemaining(total: number, spawned: number, alive: number): boolean {
  const remaining = enemiesRemaining(total, spawned, alive)
  const killed = spawned - alive
  return total > 0 && killed >= 1 && remaining > 0 && remaining <= ENEMIES_LEFT_THRESHOLD
}
