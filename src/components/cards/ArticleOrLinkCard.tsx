import { ReactNode } from 'react'
import { SafeLink } from '../utils/SafeLink'
import styles from './ArticleOrLinkCard.module.scss'

interface ArticleOrLinkCardProps {
  id?: string
  className?: string
  href?: string
  children?: ReactNode
  target?: string
  rel?: string
}

export const ArticleOrLinkCard = ({
  id,
  children,
  href,
  className,
  target,
  rel,
}: ArticleOrLinkCardProps) => {
  const isLink = !!href
  const articleOrLinkClass =
    styles.card + (className ? ` ${className}` : '') + (isLink ? ` ${styles.link}` : '')

  if (isLink) {
    return (
      <SafeLink id={id} href={href} target={target} rel={rel} className={articleOrLinkClass}>
        <span className={styles.linkIcon}>↗</span>
        {children}
      </SafeLink>
    )
  }
  return (
    <article id={id} className={articleOrLinkClass}>
      {children}
    </article>
  )
}
