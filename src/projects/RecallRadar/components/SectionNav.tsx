import { useEffect, useRef, useState } from 'react'
import styles from './SectionNav.module.scss'

export type NavSection = { id: string; label: string }

// Sticky rail that jump-links to the page's sections. Clicking a link sets the URL hash (so a
// section is shareable / openable directly, e.g. …/recall-radar#trends), and a scroll-spy highlights
// whichever section is currently under the navbar.
export function SectionNav({ sections }: { sections: NavSection[] }) {
  const [active, setActive] = useState('')
  const didInitialScroll = useRef(false)
  const railRef = useRef<HTMLElement>(null)

  // Scroll-spy. Guarded for environments without IntersectionObserver (jsdom) — the rail still works
  // there, it just doesn't highlight.
  useEffect(() => {
    if (typeof IntersectionObserver === 'undefined') return
    const els = sections
      .map((s) => document.getElementById(s.id))
      .filter((el): el is HTMLElement => el !== null)
    if (els.length === 0) return
    const observer = new IntersectionObserver(
      (entries) => {
        const onscreen = entries.filter((e) => e.isIntersecting)
        if (onscreen.length === 0) return
        // The topmost section within the detection band wins.
        const top = onscreen.reduce((a, b) =>
          a.boundingClientRect.top <= b.boundingClientRect.top ? a : b
        )
        setActive(top.target.id)
      },
      // Band runs from just below the sticky navbar to ~35% down the viewport.
      { rootMargin: '-100px 0px -65% 0px', threshold: 0 }
    )
    els.forEach((el) => observer.observe(el))
    return () => observer.disconnect()
  }, [sections])

  // Open-to-section: if the URL carries a hash, scroll there once that section is in the DOM. Runs
  // once (sections appear as data loads, so this may fire on a later render than the first).
  useEffect(() => {
    if (didInitialScroll.current) return
    const id = decodeURIComponent(window.location.hash.replace('#', ''))
    const el = id ? document.getElementById(id) : null
    if (el) {
      el.scrollIntoView({ behavior: 'smooth', block: 'start' })
      setActive(id)
      didInitialScroll.current = true
    }
  }, [sections])

  // On mobile the rail is a horizontal strip; keep the active chip centred in view as the scroll-spy
  // moves through sections. A no-op on desktop, where the rail is a vertical column with no
  // horizontal overflow (scrollWidth === clientWidth), so we bail before touching scroll position.
  useEffect(() => {
    const rail = railRef.current
    if (!rail || !active || rail.scrollWidth <= rail.clientWidth) return
    const link = rail.querySelector<HTMLElement>(`[data-section="${active}"]`)
    if (!link) return
    rail.scrollTo({
      left: link.offsetLeft - (rail.clientWidth - link.clientWidth) / 2,
      behavior: 'smooth',
    })
  }, [active])

  return (
    <nav ref={railRef} className={styles.rail} aria-label="Page sections">
      {sections.map((s) => (
        <a
          key={s.id}
          href={`#${s.id}`}
          data-section={s.id}
          className={`${styles.link} ${active === s.id ? styles.on : ''}`}
          aria-current={active === s.id ? 'true' : undefined}
          onClick={() => setActive(s.id)}
        >
          {s.label}
        </a>
      ))}
    </nav>
  )
}
