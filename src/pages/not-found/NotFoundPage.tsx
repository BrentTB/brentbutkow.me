import { Link } from 'react-router-dom'
import styles from './NotFoundPage.module.scss'

function NotFoundPage() {
  return (
    <main className={styles.main}>
      <div className={styles.content}>
        <h1 className={styles.title}>404</h1>
        <p className={styles.subtitle}>Page not found</p>
        <p className={styles.description}>
          The page you're looking for doesn't exist or has been moved.
        </p>
        <Link to="/" className={styles.button}>
          Back to home
        </Link>
      </div>
    </main>
  )
}

export default NotFoundPage
