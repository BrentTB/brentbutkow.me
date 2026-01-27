import styles from './Footer.module.scss'

function Footer() {
  const currentYear = new Date().getFullYear()

  return (
    <footer className={styles.footer}>
      <div className={styles.content}>
        <p className={styles.copyright}>© {currentYear} Brent Butkow. All rights reserved.</p>
      </div>
    </footer>
  )
}

export default Footer
