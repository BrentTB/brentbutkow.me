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

export const ArticleOrLinkCard = (articleOrLinkProps: ArticleOrLinkCardProps) => {
  const isLink = !!articleOrLinkProps.href
  const articleOrLinkClass =
    styles.card +
    (articleOrLinkProps.className ? ` ${articleOrLinkProps.className}` : '') +
    (isLink ? ` ${styles.link}` : '')

  console.log(articleOrLinkClass)
  if (isLink) {
    return (
      <SafeLink {...articleOrLinkProps} className={articleOrLinkClass}>
        <span className={styles.linkIcon}>↗</span>
        {articleOrLinkProps.children}
      </SafeLink>
    )
  }
  return <article className={articleOrLinkClass}>{articleOrLinkProps.children}</article>
}
