import { useRef } from 'react'
import type { GameUIState } from '../../useNullSpace'
import styles from './BossHpBar.module.scss'

type BossHpBarProps = {
  boss: GameUIState['boss']
}

export function BossHpBar({ boss }: BossHpBarProps) {
  // Retain the last boss snapshot so the bar can fade OUT after the boss dies
  // (uiState.boss flips to null) instead of vanishing instantly. The retained
  // data only ever renders while fading at opacity 0.
  const lastBoss = useRef(boss)
  if (boss) lastBoss.current = boss
  const shown = lastBoss.current
  if (!shown) return null

  const ratio = Math.max(0, shown.hp / shown.maxHp)
  return (
    <div className={`${styles.bossBar} ${boss !== null ? styles.visible : ''}`}>
      <span className={styles.label}>{shown.label}</span>
      <div className={styles.track}>
        <div className={styles.fill} style={{ width: `${ratio * 100}%` }} />
      </div>
      <span className={styles.hp}>
        {Math.ceil(shown.hp)} / {shown.maxHp}
      </span>
    </div>
  )
}
