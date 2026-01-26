import { useMemo, useState, ReactNode } from 'react'
import styles from './DetailCard.module.scss'

type DetailCardProps = {
  title: string
  subtitle: string
  period: string
  descriptions: string[]
  pills?: string[]
  /** How many pills to show before collapsing; if undefined, all pills are shown. */
  pillsLimit?: number
  className?: string
  children?: ReactNode
}

function DetailCard({
  title,
  subtitle,
  period,
  descriptions,
  pills,
  pillsLimit,
  className = '',
  children,
}: DetailCardProps) {
  const [expanded, setExpanded] = useState(false)

  const { visiblePills, isCollapsible } = useMemo(() => {
    if (!pills || pills.length === 0) {
      return { visiblePills: undefined, isCollapsible: false }
    }

    if (pillsLimit === undefined || pills.length <= pillsLimit + 1) {
      return { visiblePills: pills, isCollapsible: false }
    }

    const visible = expanded ? pills : pills.slice(0, pillsLimit).concat('...')
    return { visiblePills: visible, isCollapsible: true }
  }, [expanded, pills, pillsLimit])

  const handleToggle = () => {
    if (isCollapsible) {
      setExpanded((prev) => !prev)
    }
  }

  const cardClass = `${styles.card} ${className}`.trim()
  const pillClass = isCollapsible ? `${styles.pill} ${styles.clickable}` : styles.pill

  return (
    <article className={cardClass}>
      <header className={styles.header}>
        <div>
          <h3 className={styles.title}>{title}</h3>
          {subtitle && <p className={styles.subtitle}>{subtitle}</p>}
        </div>
        <span className={styles.period}>{period}</span>
      </header>

      {descriptions &&
        descriptions.map((description, index) => (
          <p key={`${title}-description-${index}`} className={styles.description}>
            {description}
          </p>
        ))}

      {visiblePills && visiblePills.length > 0 && (
        <ul className={styles.pills}>
          {visiblePills.map((pill) => (
            <li key={pill} className={pillClass} onClick={handleToggle}>
              {pill}
            </li>
          ))}
        </ul>
      )}
      {children}
    </article>
  )
}

export default DetailCard
