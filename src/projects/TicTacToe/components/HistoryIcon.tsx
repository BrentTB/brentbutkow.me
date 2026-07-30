interface HistoryIconProps {
  /** Which way the arrow curls: back for undo, forward for redo. */
  direction: 'back' | 'forward'
}

/** A curled arrow for the undo and redo buttons. Decorative — the button carries the name. */
export function HistoryIcon({ direction }: HistoryIconProps) {
  return (
    <svg
      viewBox="0 0 16 16"
      width="14"
      height="14"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.6"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      focusable="false"
      style={direction === 'forward' ? { transform: 'scaleX(-1)' } : undefined}
    >
      <path d="M3 7.5h6.5a3.5 3.5 0 0 1 0 7H7" />
      <path d="M5.5 4.5 2.5 7.5l3 3" />
    </svg>
  )
}
