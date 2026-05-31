/** The glyph that marks a link: `→` for internal routes, `↗` for external (new-tab) links. */
export function getLinkArrow(internal?: boolean): string {
  return internal ? '→' : '↗'
}
