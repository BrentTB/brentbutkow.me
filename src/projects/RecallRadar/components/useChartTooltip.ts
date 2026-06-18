import { useCallback, useRef, useState, type MouseEvent } from 'react'
import type { TooltipState } from './ChartTooltip'

// Cursor-following tooltip state for an SVG chart: track the hovered <figure> and translate pointer
// coordinates into figure-relative offsets. Shared by every RecallRadar chart.
export function useChartTooltip() {
  const figureRef = useRef<HTMLElement>(null)
  const [tip, setTip] = useState<TooltipState>(null)

  const showTip = useCallback(
    (text: string) => (event: MouseEvent) => {
      const rect = figureRef.current?.getBoundingClientRect()
      if (rect) setTip({ text, x: event.clientX - rect.left, y: event.clientY - rect.top })
    },
    []
  )

  const hideTip = useCallback(() => setTip(null), [])

  return { figureRef, tip, showTip, hideTip }
}
