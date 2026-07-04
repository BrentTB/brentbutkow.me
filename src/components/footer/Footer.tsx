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
const LOADING_MS = 2500

export function Footer() {
  const currentYear = new Date().getFullYear()
  const { isFunMode } = useFunMode()
  const { pathname } = useLocation()
  const [status, setStatus] = useState(PROCESS_DONE)

  // On each navigation (fun mode only), flash a "loading …" line, then settle back to done.
  useEffect(() => {
    if (!isFunMode) return
    setStatus(`loading ${loadingCycle.next() ?? LOADING_TARGETS[0]}...`)
    const timer = setTimeout(() => setStatus(PROCESS_DONE), LOADING_MS)
    return () => clearTimeout(timer)
  }, [pathname, isFunMode])

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
