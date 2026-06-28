import { Link } from 'react-router-dom'
import { routePaths } from '../../../routes/routes.paths'
import styles from './CurrentWork.module.scss'

type CurrentWorkProps = {
  role: string
  company: string
}

export function CurrentWork({ role, company }: CurrentWorkProps) {
  return (
    <Link
      to={routePaths.experience}
      className={styles.current}
      aria-label={`Currently ${role} at ${company}, view experience`}
    >
      <span className={styles.label}>Currently</span>
      <span className={styles.detail}>
        {role} <span className={styles.at}>at</span>{' '}
        <span className={styles.company}>{company}</span>
      </span>
    </Link>
  )
}
