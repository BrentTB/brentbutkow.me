import { Link } from 'react-router-dom'
import { routePaths, routes } from '../routes/routes.config'
import styles from './Navbar.module.css'

function Navbar() {
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
              <Link className={styles.link} to={route.path}>
                {route.label}
              </Link>
            </li>
          ))}
        </ul>
      </nav>
    </header>
  )
}

export default Navbar
