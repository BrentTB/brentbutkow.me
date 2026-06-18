import styles from './ChartTooltip.module.scss'

// Cursor-following tooltip shown instantly on hover (native SVG <title> waits ~1s before appearing).
export type TooltipState = { text: string; x: number; y: number } | null

export function ChartTooltip({ tip }: { tip: TooltipState }) {
  if (!tip) return null
  return (
    <div className={styles.tooltip} style={{ left: `${tip.x}px`, top: `${tip.y}px` }} role="status">
      {tip.text}
    </div>
  )
}
