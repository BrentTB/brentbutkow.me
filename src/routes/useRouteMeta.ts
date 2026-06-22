import { useEffect } from 'react'
import { matchPath, useLocation } from 'react-router-dom'
import { routes } from './routes.config'

const SITE_URL = 'https://brentbutkow.me'
const DEFAULT_TITLE = 'Brent Butkow'
const DEFAULT_DESCRIPTION =
  'Full-stack engineer at Foodcomply. Building cloud infrastructure and web apps, with a side of wacky projects and dad jokes.'

/** Upserts a head tag identified by `keyAttr=keyValue`, setting `valueAttr` to `value`. */
function upsertHeadTag(
  tag: 'meta' | 'link',
  keyAttr: string,
  keyValue: string,
  valueAttr: string,
  value: string
) {
  let el = document.head.querySelector<HTMLElement>(`${tag}[${keyAttr}="${keyValue}"]`)
  if (!el) {
    el = document.createElement(tag)
    el.setAttribute(keyAttr, keyValue)
    document.head.appendChild(el)
  }
  el.setAttribute(valueAttr, value)
}

/**
 * Syncs the document head (title, description, canonical, Open Graph, Twitter)
 * to the current route, driven by the `title`/`description` fields in
 * routes.config. The canonical and og:url are self-referencing per path so each
 * page is indexed on its own URL instead of being folded into the home page.
 * Dynamic routes are matched by pattern; unmatched paths fall back to the
 * catch-all (404) route.
 */
export function useRouteMeta() {
  const { pathname } = useLocation()

  useEffect(() => {
    const match = routes.find((route) => route.path !== '*' && matchPath(route.path, pathname))
    const notFound = routes.find((route) => route.path === '*')
    const meta = match ?? notFound

    const title = meta?.title ?? DEFAULT_TITLE
    const description = meta?.description ?? DEFAULT_DESCRIPTION
    const canonical = `${SITE_URL}${pathname}`

    document.title = title
    upsertHeadTag('meta', 'name', 'description', 'content', description)
    upsertHeadTag('link', 'rel', 'canonical', 'href', canonical)
    upsertHeadTag('meta', 'property', 'og:title', 'content', title)
    upsertHeadTag('meta', 'property', 'og:description', 'content', description)
    upsertHeadTag('meta', 'property', 'og:url', 'content', canonical)
    upsertHeadTag('meta', 'name', 'twitter:title', 'content', title)
    upsertHeadTag('meta', 'name', 'twitter:description', 'content', description)
  }, [pathname])
}
