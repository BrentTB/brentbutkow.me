import { HeroContent } from '../../../data/data.types'
import styles from './Hero.module.scss'

type HeroProps = {
  content: HeroContent
}

function Hero({ content }: HeroProps) {
  return (
    <div className={styles.hero}>
      <p className={styles.eyebrow}>{content.eyebrow}</p>
      <h1 className={styles.title}>{content.title}</h1>
      <p className={styles.subtitle}>{content.subtitle}</p>
      <div className={styles.actions}>
        {content.actions.map((action) => (
          <a
            key={action.href}
            className={`${styles.button} ${action.variant === 'ghost' ? styles.ghost : styles.primary}`}
            href={action.href}
          >
            {action.label}
          </a>
        ))}
      </div>
    </div>
  )
}

export default Hero
