import { formatNumber } from '../chart-format'
import styles from './RecallJumpButton.module.scss'

type RecallJumpButtonProps = {
  count: number
  onClick: () => void
}

// Floating dashboard shortcut: jumps to the Recalls tab for the filters you've just set, so a theme
// or outbreak click doesn't send you back up to the tab bar. Rendered by RecallRadar only when a
// filter is active and the filtered set is non-empty.
export function RecallJumpButton({ count, onClick }: RecallJumpButtonProps) {
  return (
    <button type="button" className={styles.jump} onClick={onClick}>
      See {formatNumber(count)} {count === 1 ? 'recall' : 'recalls'}
      <span className={styles.arrow} aria-hidden="true">
        →
      </span>
    </button>
  )
}
