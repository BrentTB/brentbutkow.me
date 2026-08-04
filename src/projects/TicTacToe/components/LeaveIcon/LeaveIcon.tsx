/**
 * An arrow stepping out through an open side: leaving the room rather than closing or deleting it. Sized
 * in `em` so it tracks whatever text it sits beside.
 */
export function LeaveIcon() {
  return (
    <svg
      viewBox="0 0 16 16"
      width="1em"
      height="1em"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.6"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      focusable="false"
    >
      {/* Three sides of a room, open on the side the arrow leaves by. */}
      <path d="M9.5 2.5H3.5v11h6" />
      <path d="M7.5 8h6M11 5.5 13.5 8 11 10.5" />
    </svg>
  )
}
