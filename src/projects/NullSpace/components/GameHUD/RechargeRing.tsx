import styles from './RechargeRing.module.scss'

type RechargeRingProps = {
  // 0 → freshly cast (no ring), 1 → fully recharged (almost ready). The ring
  // fills as the ability becomes ready, so callers should pass
  // `1 - cooldownRemaining / cooldown`.
  readyPercent: number
}

export function RechargeRing({ readyPercent }: RechargeRingProps) {
  const clamped = Math.max(0, Math.min(1, readyPercent))
  const deg = Math.round(clamped * 360)
  return (
    <span
      className={styles.ring}
      aria-hidden="true"
      style={{
        background: `conic-gradient(var(--accent) ${deg}deg, rgba(255, 255, 255, 0.15) ${deg}deg 360deg)`,
      }}
    />
  )
}
