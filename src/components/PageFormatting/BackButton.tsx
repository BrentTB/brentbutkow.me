import { useNavigate } from 'react-router-dom'
import styles from './BackButton.module.scss'

export function BackButton() {
  const navigate = useNavigate()

  return (
    <button className={styles.back} onClick={() => navigate(-1)} aria-label="Go back">
      <span className={styles.arrow}>&larr;</span>
      Back
    </button>
  )
}
