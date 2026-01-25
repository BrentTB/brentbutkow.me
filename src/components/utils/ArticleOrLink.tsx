import { ReactNode } from 'react'
import { SafeLink } from './SafeLink'

interface ArticleOrLinkProps {
  className: string
  href?: string
  children?: ReactNode
  target?: string
  rel?: string
}

export const ArticleOrLink = (articleOrLinkProps: ArticleOrLinkProps) => {
  if (articleOrLinkProps.href) {
    return <SafeLink {...articleOrLinkProps}>{articleOrLinkProps.children}</SafeLink>
  }
  return <article className={articleOrLinkProps.className}>{articleOrLinkProps.children}</article>
}
