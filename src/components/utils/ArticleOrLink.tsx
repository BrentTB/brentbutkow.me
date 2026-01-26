import { ReactNode } from 'react'
import { SafeLink } from './SafeLink'
import styles from './ArticleOrLink.module.scss'

interface ArticleOrLinkProps {
  className?: string
  href?: string
  children?: ReactNode
  target?: string
  rel?: string
}

export const ArticleOrLink = (articleOrLinkProps: ArticleOrLinkProps) => {
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
