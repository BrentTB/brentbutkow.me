import { Link, NavLink } from 'react-router-dom'
import { routePaths, routes } from '../../routes/routes.config'
import styles from './Navbar.module.scss'
import ModeToggle from '../ModeToggle'
import { useFunMode } from '../../contexts/useFunMode'
import { useEffect, useRef, useState } from 'react'

function Navbar() {
  const { isFunMode, setIsFunMode } = useFunMode()
  const navRoutes = routes.filter((route) => !route.dontShowInNavbar)
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false)
  const navbarRef = useRef<HTMLElement>(null)
  const toggleRef = useRef<HTMLButtonElement>(null)

  const closeMobileMenu = () => setIsMobileMenuOpen(false)

  // While the mobile menu is open: Escape closes it (and returns focus to the
  // toggle), and Tab is trapped within the navbar.
  useEffect(() => {
    if (!isMobileMenuOpen) return

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setIsMobileMenuOpen(false)
        toggleRef.current?.focus()
        return
      }
      if (event.key !== 'Tab' || !navbarRef.current) return

      const focusable = Array.from(
        navbarRef.current.querySelectorAll<HTMLElement>(
          'a[href], button:not([disabled]), [tabindex]:not([tabindex="-1"])'
        )
      ).filter((el) => el.offsetParent !== null)
      if (focusable.length === 0) return

      const first = focusable[0]
      const last = focusable[focusable.length - 1]
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault()
        last.focus()
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault()
        first.focus()
      }
    }

    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [isMobileMenuOpen])

  const openStyle = isMobileMenuOpen ? styles.open : ''

  return (
    <>
      <header ref={navbarRef} className={`${styles.navbar} ${openStyle}`}>
        <Link to={routePaths.home} className={styles.brand} onClick={closeMobileMenu}>
          <span className={styles.dot} aria-hidden="true" />
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

export default Navbar
