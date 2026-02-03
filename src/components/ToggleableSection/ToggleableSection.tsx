import { useState, ReactNode } from 'react'
import styles from './ToggleableSection.module.scss'

interface ToggleableSectionProps {
  title: string
  children: ReactNode
}

function ToggleableSection({ title, children }: ToggleableSectionProps) {
  const [isOpen, setIsOpen] = useState(false)

  return (
    <div className={styles.section}>
      <button
        className={`${styles.header} ${isOpen ? styles.open : ''}`}
        onClick={() => setIsOpen(!isOpen)}
      >
        <span className={styles.title}>{title}</span>
        <span className={styles.icon}>▶</span>
      </button>
      {isOpen && <div className={styles.content}>{children}</div>}
    </div>
  )
}

export default ToggleableSection
