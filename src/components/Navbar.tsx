import { Link, NavLink } from 'react-router-dom'
import { routePaths, routes } from '../routes/routes.config'
import styles from './Navbar.module.scss'
import ModeToggle from './ModeToggle'
import { useFunMode } from '../contexts/FunModeContext'

function Navbar() {
  const { isFunMode, setIsFunMode } = useFunMode()
  const navRoutes = routes.filter((route) => !route.dontShowInNavbar)

  return (
    <header className={styles.navbar}>
      <Link to={routePaths.home} className={styles.brand}>
        <span className={styles.dot} aria-hidden="true" />
        <span>Brent Butkow</span>
      </Link>
      <nav aria-label="Primary">
        <ul className={styles.links}>
          {navRoutes.map((route) => (
            <li key={route.path}>
              <NavLink className={styles.link} to={route.path}>
                {route.label}
              </NavLink>
            </li>
          ))}
          <ModeToggle
            isEnabled={isFunMode}
            onToggle={setIsFunMode}
            label1="Professional"
            label2="Fun"
          />
        </ul>
      </nav>
    </header>
  )
}

export default Navbar
