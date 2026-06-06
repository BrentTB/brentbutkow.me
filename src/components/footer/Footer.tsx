import styles from './Footer.module.scss'
import { SafeLink } from '../utils/SafeLink'
import { contactPlatforms } from '../../pages/ContactMe/data'

function Footer() {
  const currentYear = new Date().getFullYear()

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
    </footer>
  )
}

export default Footer
