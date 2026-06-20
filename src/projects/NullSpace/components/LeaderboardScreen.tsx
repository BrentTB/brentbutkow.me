import { useLeaderboard } from '../leaderboard/useLeaderboard'
import sharedStyles from './OverlayShared.module.scss'
import styles from './LeaderboardScreen.module.scss'

type LeaderboardScreenProps = {
  onClose: () => void
}

export function LeaderboardScreen({ onClose }: LeaderboardScreenProps) {
  const { data, loading, error } = useLeaderboard()
  const entries = data ?? []

  return (
    // One scaled panel (not separate scaled children): GameOverlay scales each
    // `.content > *` by --hud-scale via transform, which doesn't reserve layout
    // space — with the tall table as its own child the Back button overlapped it
    // in fullscreen. Wrapping makes the whole board scale as a unit and flow inside.
    <div className={styles.panel}>
      <h2 className={sharedStyles.title}>Leaderboard</h2>
      {loading && <p className={sharedStyles.stat}>Loading…</p>}
      {!loading && error && (
        <p className={sharedStyles.errorText}>Couldn’t load the leaderboard.</p>
      )}
      {!loading && !error && entries.length === 0 && (
        <p className={sharedStyles.stat}>No scores yet — be the first!</p>
      )}
      {!loading && !error && entries.length > 0 && (
        <div className={styles.tableWrap}>
          <table className={styles.table}>
            <thead>
              <tr>
                <th className={styles.rankCol}>#</th>
                <th className={styles.nameCol}>Name</th>
                <th className={styles.numCol}>Wave</th>
                <th className={styles.numCol}>Score</th>
              </tr>
            </thead>
            <tbody>
              {entries.map((entry, i) => (
                <tr key={entry.id}>
                  <td className={styles.rankCol}>{i + 1}</td>
                  <td className={styles.nameCol}>{entry.name}</td>
                  <td className={styles.numCol}>{entry.wave}</td>
                  <td className={styles.numCol}>{entry.score.toLocaleString()}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      <button className={sharedStyles.secondaryBtn} onClick={onClose}>
        Back
      </button>
    </div>
  )
}
