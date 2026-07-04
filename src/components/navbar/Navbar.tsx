import { Link, NavLink, useLocation } from 'react-router-dom'
import { routes } from '../../routes/routes.config'
import { routePaths } from '../../routes/routes.paths'
import styles from './Navbar.module.scss'
import { ModeToggle } from '../ModeToggle'
import { useFunMode } from '../../contexts/useFunMode'
import { useLayoutEffect, useRef, useState } from 'react'
import { useFocusTrap } from './useFocusTrap'
import { useStickyHeader } from './useStickyHeader'
import { useDockMagnify } from './useDockMagnify'

export function Navbar() {
  const { isFunMode, setIsFunMode } = useFunMode()
  const navRoutes = routes.filter((route) => !route.dontShowInNavbar)
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false)
  const navbarRef = useRef<HTMLElement>(null)
  const toggleRef = useRef<HTMLButtonElement>(null)
  const { navHidden } = useStickyHeader()
  const { pathname } = useLocation()

  // Auto-hide is scoped to Recall Radar: that page has its own minimal sticky bar that takes over as
  // you scroll into the data, so the site navbar steps out of the way (and slides back at the top).
  // Every other page keeps the navbar permanently in view. Never retract while the mobile menu is
  // open — it's full-height, and yanking it shut mid-interaction would be hostile.
  const autoHides = pathname.startsWith(routePaths.recallRadar)
  const retracted = autoHides && navHidden && !isMobileMenuOpen

  // Publish the bar's height so Recall Radar's sticky bar can sit exactly beneath it — and slide up
  // to fill the gap when it retracts. Measured after layout, re-measured on resize (the bar's height
  // shifts across breakpoints). offsetHeight is 0 without layout (jsdom), so the guard keeps the CSS
  // fallback in tests.
  useLayoutEffect(() => {
    const publish = () => {
      const height = navbarRef.current?.offsetHeight
      if (height) document.documentElement.style.setProperty('--site-nav-height', `${height}px`)
    }
    publish()
    window.addEventListener('resize', publish)
    return () => window.removeEventListener('resize', publish)
  }, [])

  const closeMobileMenu = () => setIsMobileMenuOpen(false)

  // While the mobile menu is open, trap Tab focus within the navbar and let
  // Escape close it (returning focus to the toggle that opened it).
  useFocusTrap(navbarRef, isMobileMenuOpen, () => {
    setIsMobileMenuOpen(false)
    toggleRef.current?.focus()
  })

  // Fun-mode-only: dock-style magnification of the nav links as the pointer sweeps across them.
  useDockMagnify(navbarRef, isFunMode)

  const openStyle = isMobileMenuOpen ? styles.open : ''

  return (
    <>
      <header
        ref={navbarRef}
        className={`${styles.navbar} ${openStyle} ${retracted ? styles.retracted : ''}`}
      >
        <Link to={routePaths.home} className={styles.brand} onClick={closeMobileMenu}>
          <span className={styles.prompt} aria-hidden="true">
            &gt;
          </span>
          <span>Brent Butkow</span>
        </Link>
        <button
          ref={toggleRef}
          className={`${styles.mobileMenuToggle} ${openStyle}`}
          onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
          aria-label={isMobileMenuOpen ? 'Close menu' : 'Open menu'}
          aria-expanded={isMobileMenuOpen}
        >
          <span className={styles.menuIcon}></span>
        </button>
        <nav aria-label="Primary" className={`${styles.nav} ${openStyle}`}>
          <ul className={styles.links}>
            {navRoutes.map((route) => (
              <li key={route.path}>
                <NavLink
                  className={({ isActive }) => `${styles.link} ${isActive ? styles.active : ''}`}
                  to={route.path}
                  onClick={closeMobileMenu}
                  data-dock-item
                >
                  {route.label}
                </NavLink>
              </li>
            ))}
            <ModeToggle
              isEnabled={isFunMode}
              onToggle={setIsFunMode}
              label1="Professional"
              label2="Fun"
              className={styles.end}
            />
          </ul>
        </nav>
      </header>
      {isMobileMenuOpen && (
        <button
          type="button"
          className={`${styles.backdrop} ${openStyle}`}
          aria-label="Close navbar menu"
          onClick={closeMobileMenu}
        />
      )}
    </>
  )
}
