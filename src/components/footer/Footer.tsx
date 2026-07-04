import { useEffect, useState } from 'react'
import { useLocation } from 'react-router-dom'
import styles from './Footer.module.scss'
import { SafeLink } from '../utils/SafeLink'
import { useFunMode } from '../../contexts/useFunMode'
import { createShuffledCycle } from '../../utils/shuffled-cycle'
import { contactPlatforms } from '../../pages/ContactMe/data'

// Fun-mode sign-off. Each page swap "loads" one of these, then settles on the completed line —
// a wink at the real work a page does. Round-robin (not random) so it never repeats back-to-back.
const LOADING_TARGETS = [
  'assets',
  'themes',
  'memes',
  'context',
  'easter eggs',
  'vibes',
  'hot takes',
  'side quests',
  'dad jokes',
  'good intentions',
]
const loadingCycle = createShuffledCycle(LOADING_TARGETS)
const PROCESS_DONE = '[process completed - exit code 0]'
const LOADING_MS = 2400
const DOT_MS = 300

export function Footer() {
  const currentYear = new Date().getFullYear()
  const { isFunMode } = useFunMode()
  const { pathname } = useLocation()
  // The label being "loaded" (null once it settles) and the animated ellipsis length (0–3).
  const [target, setTarget] = useState<string | null>(null)
  const [dots, setDots] = useState(0)

  // On each navigation (fun mode only), flash a "loading …" line whose ellipsis cycles 0→3 dots,
  // then settle on the completed line. Reduced motion keeps the dots static (no cycling).
  useEffect(() => {
    if (!isFunMode) return
    setTarget(loadingCycle.next() ?? LOADING_TARGETS[0])
    const reduce = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches
    setDots(reduce ? 3 : 0)
    const dotTimer = reduce ? undefined : setInterval(() => setDots((d) => (d + 1) % 4), DOT_MS)
    const doneTimer = setTimeout(() => {
      if (dotTimer) clearInterval(dotTimer)
      setTarget(null)
    }, LOADING_MS)
    return () => {
      if (dotTimer) clearInterval(dotTimer)
      clearTimeout(doneTimer)
    }
  }, [pathname, isFunMode])

  const status = target === null ? PROCESS_DONE : `loading ${target}${'.'.repeat(dots)}`

  return (
    <footer className={styles.footer}>
      <div className={styles.content}>
        <div className={styles.brand}>
          <span className={styles.name}>Brent Butkow</span>
          <span className={styles.role}>Full-stack engineer</span>
        </div>
        <nav className={styles.links} aria-label="Social links">
          {contactPlatforms.map((platform) => (
            <SafeLink key={platform.platform} href={platform.url} className={styles.link}>
              {platform.platform}
            </SafeLink>
          ))}
        </nav>
        <p className={styles.copyright}>© {currentYear} Brent Butkow</p>
      </div>
      {isFunMode && (
        <p className={styles.exit} aria-hidden="true">
          {status}
        </p>
      )}
    </footer>
  )
}
