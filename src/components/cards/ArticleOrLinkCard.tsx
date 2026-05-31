import { ReactNode } from 'react'
import { SafeLink } from '../utils/SafeLink'
import styles from './ArticleOrLinkCard.module.scss'

interface ArticleOrLinkCardProps {
  className?: string
  href?: string
  children?: ReactNode
  target?: string
  rel?: string
  internal?: boolean
}

export const ArticleOrLinkCard = ({
  children,
  href,
  className,
  target,
  rel,
  internal,
}: ArticleOrLinkCardProps) => {
  const isLink = !!href
  const articleOrLinkClass =
    styles.card + (className ? ` ${className}` : '') + (isLink ? ` ${styles.link}` : '')

  if (isLink) {
    return (
      <SafeLink
        href={href}
        target={target}
        rel={rel}
        className={articleOrLinkClass}
        internal={internal}
      >
        {children}
        <span className={styles.linkIcon} aria-hidden="true">
          {internal ? '→' : '↗'}
        </span>
      </SafeLink>
    )
  }
  return <article className={articleOrLinkClass}>{children}</article>
}
