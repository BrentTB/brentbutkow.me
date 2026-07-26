/**
 * Where a floating menu should be portaled to.
 *
 * Normally the document body, which puts the menu outside any ancestor whose overflow or backdrop filter
 * would clip it. While something is full screen, the body is not being painted at all: the browser shows only
 * the full-screen element and its descendants, so a menu portaled to the body opens into nothing and the
 * control looks broken. Inside a full-screen element it goes there instead.
 */
export function portalTarget(): HTMLElement {
  const fullscreen = document.fullscreenElement
  return fullscreen instanceof HTMLElement ? fullscreen : document.body
}
