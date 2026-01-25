import { Link, NavLink } from 'react-router-dom'
import { routePaths, routes } from '../../routes/routes.config'
import styles from './Navbar.module.scss'
import ModeToggle from '../ModeToggle'
import { useFunMode } from '../../contexts/FunMode'
import { useState } from 'react'

function Navbar() {
  const { isFunMode, setIsFunMode } = useFunMode()
  const navRoutes = routes.filter((route) => !route.dontShowInNavbar)
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false)

  const closeMobileMenu = () => setIsMobileMenuOpen(false)

  const openStyle = isMobileMenuOpen ? styles.open : ''

  return (
    <header className={`${styles.navbar} ${openStyle}`}>
      <Link to={routePaths.home} className={styles.brand} onClick={closeMobileMenu}>
        <span className={styles.dot} aria-hidden="true" />
        <span>Brent Butkow</span>
      </Link>
      <button
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
              <NavLink className={styles.link} to={route.path} onClick={closeMobileMenu}>
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
  )
}

export default Navbar
