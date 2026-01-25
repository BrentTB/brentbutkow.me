import { Link } from 'react-router-dom'
import { HeroContent } from '../../../data/data.types'
import styles from './Hero.module.scss'

type HeroProps = {
  content: HeroContent
  isFunMode?: boolean
}

function Hero({ content, isFunMode }: HeroProps) {
  return (
    <div className={styles.hero}>
      <p className={styles.eyebrow}>{content.eyebrow}</p>
      <h1 className={styles.title}>{content.title}</h1>
      <p className={styles.subtitle}>{isFunMode ? content.subtitleFun : content.subtitle}</p>
      <div className={styles.actions}>
        {content.actions
          .filter((action) => (isFunMode ? true : !action.onlyShowInFunMode))
          .map((action) => (
            <Link
              key={action.href}
              className={`${styles.button} ${action.variant === 'ghost' ? styles.ghost : styles.primary}`}
              to={action.href}
            >
              {action.label}
            </Link>
          ))}
      </div>
    </div>
  )
}

export default Hero
