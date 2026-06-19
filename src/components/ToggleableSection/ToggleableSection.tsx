import { useState, ReactNode } from 'react'
import styles from './ToggleableSection.module.scss'

interface ToggleableSectionProps {
  title: string
  children: ReactNode
  // Lets the open content overflow the section bounds. Needed when children
  // render a downward popover (e.g. the changelog filter menu) that would
  // otherwise be clipped when the section is short.
  allowOverflow?: boolean
}

export function ToggleableSection({ title, children, allowOverflow }: ToggleableSectionProps) {
  const [isOpen, setIsOpen] = useState(false)

  return (
    <div className={`${styles.section} ${allowOverflow ? styles.allowOverflow : ''}`}>
      <button
        className={`${styles.header} ${isOpen ? styles.open : ''}`}
        onClick={() => setIsOpen(!isOpen)}
        aria-expanded={isOpen}
      >
        <span className={styles.title}>{title}</span>
        <span className={styles.icon}>▶</span>
      </button>
      {isOpen && <div className={styles.content}>{children}</div>}
    </div>
  )
}
