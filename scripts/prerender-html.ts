// Pure HTML composition for the prerender step: drops rendered app markup into a route's index.html
// and links the stylesheets that markup needs. Kept free of fs so the build script stays a thin shell.

export type Stylesheet = { href: string; css: string }

/** CSS-module class → the stylesheets that define it. */
export type StylesheetIndex = Map<string, Set<string>>

const ROOT = '<div id="root"></div>'

// Vite's production CSS-module names: `_<local>_<5-char hash>_<line>`. Only these are traced to a
// stylesheet — a global class name could match unrelated rules in another route's CSS.
const MODULE_CLASS = /^_[\w-]+_[A-Za-z0-9]{5}_\d+$/
const MODULE_CLASS_SELECTOR = /\.(_[\w-]+?_[A-Za-z0-9]{5}_\d+)(?![\w-])/g
const CLASS_ATTRIBUTE = /\sclass="([^"]*)"/g
const STYLESHEET_HREF = /<link\s[^>]*rel="stylesheet"[^>]*href="([^"]+)"/g

export function buildStylesheetIndex(stylesheets: readonly Stylesheet[]): StylesheetIndex {
  const index: StylesheetIndex = new Map()
  for (const { href, css } of stylesheets) {
    for (const [, className] of css.matchAll(MODULE_CLASS_SELECTOR)) {
      const hrefs = index.get(className) ?? new Set()
      hrefs.add(href)
      index.set(className, hrefs)
    }
  }
  return index
}

/**
 * Stylesheets the rendered markup uses that the template doesn't already link. Lazy routes' CSS only
 * loads with their JS chunk, so without these the prerendered page paints unstyled until then.
 */
export function stylesheetsFor(
  template: string,
  content: string,
  index: StylesheetIndex
): string[] {
  const linked = new Set([...template.matchAll(STYLESHEET_HREF)].map(([, href]) => href))
  const needed = new Set<string>()
  for (const [, classList] of content.matchAll(CLASS_ATTRIBUTE)) {
    for (const className of classList.split(/\s+/)) {
      if (!MODULE_CLASS.test(className)) continue
      const hrefs = [...(index.get(className) ?? [])]
      if (hrefs.some((href) => linked.has(href))) continue
      for (const href of hrefs) needed.add(href)
    }
  }
  return [...needed].sort()
}

/** Fills the empty root with `content` and links any stylesheets it needs before `</head>`. */
export function composePage(template: string, content: string, stylesheets: readonly string[]) {
  if (!template.includes(ROOT)) throw new Error('prerender: empty root element not found')
  // Same shape as Vite's own tags; its lazy-chunk loader skips any stylesheet already linked by href.
  const links = stylesheets.map((href) => `<link rel="stylesheet" crossorigin href="${href}">`)
  const head = links.length > 0 ? `    ${links.join('\n    ')}\n  </head>` : '</head>'
  // Function replacers: rendered text can contain `$&`-style patterns (prices, code samples).
  return template
    .replace('</head>', () => head)
    .replace(ROOT, () => `<div id="root">${content}</div>`)
}
