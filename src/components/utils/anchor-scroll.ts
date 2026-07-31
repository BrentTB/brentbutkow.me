/**
 * Where the page has to be scrolled to for `element` to sit `clearance` pixels below the top of the view.
 *
 * An absolute position rather than `scrollIntoView`, which declines to move an element that is already
 * visible — and "visible but in the wrong place" is the case worth handling. Never negative, so a target
 * near the top of a short page does not ask the page to scroll above itself.
 */
export function anchorScrollTop(element: Element, clearance = 0): number {
  const top = element.getBoundingClientRect().top + window.scrollY
  return Math.max(0, top - clearance)
}
