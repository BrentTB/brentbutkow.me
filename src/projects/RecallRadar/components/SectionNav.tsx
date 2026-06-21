import { useEffect, useRef, useState } from 'react'
import styles from './SectionNav.module.scss'

export type NavSection = { id: string; label: string }

// Sticky rail that jump-links to the page's sections. Clicking a link sets the URL hash (so a
// section is shareable / openable directly, e.g. …/recall-radar#trends), and a scroll-spy highlights
// whichever section is currently under the navbar.
export function SectionNav({ sections }: { sections: NavSection[] }) {
  const [active, setActive] = useState('')
  const didInitialScroll = useRef(false)

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

  return (
    <nav className={styles.rail} aria-label="Page sections">
      {sections.map((s) => (
        <a
          key={s.id}
          href={`#${s.id}`}
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
