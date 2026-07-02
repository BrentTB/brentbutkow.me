import { HeroActionVariant, HeroContent } from '../../../data/data.types'
import { SafeLink } from '../../../components/utils/SafeLink'
import { Eyebrow } from './Eyebrow'
import styles from './Hero.module.scss'
import { useMemo } from 'react'

type HeroProps = {
  content: HeroContent
  isFunMode?: boolean
}

export function Hero({ content, isFunMode }: HeroProps) {
  const filteredActions = useMemo(
    () => content.actions.filter((action) => (isFunMode ? true : !action.onlyShowInFunMode)),
    [content.actions, isFunMode]
  )

  return (
    <div className={styles.hero}>
      <p className={styles.eyebrow}>
        <Eyebrow
          label={content.eyebrow}
          typed
          alternates={
            isFunMode
              ? [...(content.eyebrowAlternates ?? []), ...(content.eyebrowAlternatesFun ?? [])]
              : content.eyebrowAlternates
          }
        />
      </p>
      <h1 className={styles.title}>{content.title}</h1>
      <p className={styles.subtitle}>{isFunMode ? content.subtitleFun : content.subtitle}</p>
      <div className={styles.actions}>
        {filteredActions.map((action) => (
          <SafeLink
            key={action.href}
            className={action.variant === HeroActionVariant.primary ? styles.primary : styles.link}
            href={action.href}
            internal={!action.external}
          >
            {action.label}
          </SafeLink>
        ))}
      </div>
    </div>
  )
}
