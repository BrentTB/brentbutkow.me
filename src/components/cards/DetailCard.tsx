import { useState, ReactNode } from 'react'
import styles from './DetailCard.module.scss'
import { SafeLink } from '../utils/SafeLink'
import { getLinkArrow } from '../utils/link-arrow'

type DetailCardProps = {
  title: string
  subtitle: string
  subtitleLink?: string
  period: string
  descriptions: string[]
  pills?: string[]
  /** How many pills to show before collapsing; if undefined, all pills are shown. */
  pillsLimit?: number
  className?: string
  /** Renders as a sub-item (no top divider, tighter spacing) — used for nested projects. */
  nested?: boolean
  children?: ReactNode
}

function DetailCard({
  title,
  subtitle,
  subtitleLink,
  period,
  descriptions,
  pills,
  pillsLimit,
  className = '',
  nested = false,
  children,
}: DetailCardProps) {
  const [expanded, setExpanded] = useState(false)

  const isCollapsible = !!pills && pillsLimit !== undefined && pills.length > pillsLimit + 1
  const visiblePills =
    pills && isCollapsible && !expanded ? pills.slice(0, pillsLimit) : (pills ?? [])

  const toggle = () => setExpanded((prev) => !prev)

  const cardClass = [styles.card, nested ? styles.nested : '', className].filter(Boolean).join(' ')

  return (
    <article className={cardClass}>
      <span className={styles.period}>{period}</span>
      <div className={styles.body}>
        <header className={styles.header}>
          <h3 className={styles.title}>{title}</h3>
          {subtitle && (
            <p className={styles.subtitle}>
              {subtitleLink ? (
                <SafeLink href={subtitleLink}>
                  {subtitle}
                  <span className={styles.subtitleArrow} aria-hidden="true">
                    {getLinkArrow(false)}
                  </span>
                </SafeLink>
              ) : (
                subtitle
              )}
            </p>
          )}
        </header>

        {descriptions &&
          descriptions.map((description, index) => (
            <p key={`${title}-description-${index}`} className={styles.description}>
              {description}
            </p>
          ))}

        {pills && pills.length > 0 && (
          <ul className={styles.pills}>
            {visiblePills.map((pill) => (
              <li key={pill} className={styles.pill}>
                {pill}
              </li>
            ))}
            {isCollapsible && (
              <li
                className={styles.pillToggle}
                role="button"
                tabIndex={0}
                aria-expanded={expanded}
                onClick={toggle}
                onKeyDown={(event) => {
                  if (event.key === 'Enter' || event.key === ' ') {
                    event.preventDefault()
                    toggle()
                  }
                }}
              >
                {expanded ? 'Show less' : `+${pills.length - (pillsLimit ?? 0)}`}
              </li>
            )}
          </ul>
        )}
        {children}
      </div>
    </article>
  )
}

export default DetailCard
