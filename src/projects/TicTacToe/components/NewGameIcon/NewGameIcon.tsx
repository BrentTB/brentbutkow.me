/**
 * An empty 2×2 grid: the board cleared, rather than the usual circular arrow, which on a page that already
 * has two curled history arrows would read as a third kind of undo.
 */
export function NewGameIcon() {
  return (
    <svg
      viewBox="0 0 16 16"
      width="14"
      height="14"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.6"
      strokeLinecap="round"
      aria-hidden="true"
      focusable="false"
    >
      <rect x="2.5" y="2.5" width="11" height="11" rx="2" />
      <path d="M8 3v10M3 8h10" />
    </svg>
  )
}
