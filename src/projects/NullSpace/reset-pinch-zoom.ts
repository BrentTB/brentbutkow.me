// Browsers expose no direct API to undo a user's pinch-zoom. Momentarily adding
// `maximum-scale=1` to the viewport meta makes the browser clamp the current
// zoom back to normal; we restore the original content shortly after so the
// user can still pinch-zoom later — it's never permanently disabled (that would
// hurt accessibility). Used when entering fullscreen, where the game canvas's
// `touch-action: none` would otherwise leave a mid-play zoom stuck until pause.
const RESTORE_DELAY_MS = 400

export function resetPinchZoom(): void {
  const meta = document.querySelector<HTMLMetaElement>('meta[name="viewport"]')
  if (!meta) return
  const original = meta.getAttribute('content') ?? ''
  // If the page already pins a maximum-scale, respect that choice and bail.
  if (original.includes('maximum-scale')) return
  meta.setAttribute('content', `${original}, maximum-scale=1`)
  window.setTimeout(() => meta.setAttribute('content', original), RESTORE_DELAY_MS)
}
