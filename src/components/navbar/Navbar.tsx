import { Link, NavLink } from 'react-router-dom'
import { routePaths, routes } from '../../routes/routes.config'
import styles from './Navbar.module.scss'
import ModeToggle from '../ModeToggle'
import { useFunMode } from '../../contexts/useFunMode'
import { useRef, useState } from 'react'
import { useFocusTrap } from './useFocusTrap'

function Navbar() {
  const { isFunMode, setIsFunMode } = useFunMode()
  const navRoutes = routes.filter((route) => !route.dontShowInNavbar)
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false)
  const navbarRef = useRef<HTMLElement>(null)
  const toggleRef = useRef<HTMLButtonElement>(null)

  const closeMobileMenu = () => setIsMobileMenuOpen(false)

  // While the mobile menu is open, trap Tab focus within the navbar and let
  // Escape close it (returning focus to the toggle that opened it).
  useFocusTrap(navbarRef, isMobileMenuOpen, () => {
    setIsMobileMenuOpen(false)
    toggleRef.current?.focus()
  })

  const openStyle = isMobileMenuOpen ? styles.open : ''

  return (
    <>
      <header ref={navbarRef} className={`${styles.navbar} ${openStyle}`}>
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
