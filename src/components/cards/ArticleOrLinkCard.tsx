import { ReactNode } from 'react'
import { SafeLink } from '../utils/SafeLink'
import styles from './ArticleOrLinkCard.module.scss'

interface ArticleOrLinkCardProps {
  className?: string
  href?: string
  children?: ReactNode
  target?: string
  rel?: string
}

export const ArticleOrLinkCard = ({
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
      <SafeLink href={href} target={target} rel={rel} className={articleOrLinkClass}>
        <span className={styles.linkIcon}>↗</span>
        {children}
      </SafeLink>
    )
  }
  return <article className={articleOrLinkClass}>{children}</article>
}
