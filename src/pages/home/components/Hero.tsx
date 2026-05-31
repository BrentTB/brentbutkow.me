import { Link } from 'react-router-dom'
import { HeroContent } from '../../../data/data.types'
import styles from './Hero.module.scss'
import { useMemo } from 'react'

type HeroProps = {
  content: HeroContent
  isFunMode?: boolean
}

function Hero({ content, isFunMode }: HeroProps) {
  const filteredActions = useMemo(
    () => content.actions.filter((action) => (isFunMode ? true : !action.onlyShowInFunMode)),
    [content.actions, isFunMode]
  )

  return (
    <div className={styles.hero}>
      <p className={styles.eyebrow}>{content.eyebrow}</p>
      <h1 className={styles.title}>{content.title}</h1>
      <p className={styles.subtitle}>{isFunMode ? content.subtitleFun : content.subtitle}</p>
      <div className={styles.actions}>
        {filteredActions.map((action) => {
          const className = `${styles.button} ${action.variant === 'ghost' ? styles.ghost : styles.primary}`
          return action.external ? (
            <a
              key={action.href}
              className={className}
              href={action.href}
              target="_blank"
              rel="noopener noreferrer"
            >
              {action.label}
            </a>
          ) : (
            <Link key={action.href} className={className} to={action.href}>
              {action.label}
            </Link>
          )
        })}
      </div>
    </div>
  )
}

export default Hero
