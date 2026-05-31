import { ReactNode } from 'react'
import { Link } from 'react-router-dom'

interface SafeLinkProps {
  className?: string
  target?: string
  rel?: string
  href?: string
  internal?: boolean
  children?: ReactNode
}

export const SafeLink = ({ className, target, rel, href, internal, children }: SafeLinkProps) => {
  if (internal) {
    return (
      <Link to={href || ''} className={className}>
        {children}
      </Link>
    )
  }
  return (
    <a
      className={className}
      href={href}
      target={target || '_blank'}
      rel={rel || 'noopener noreferrer'}
    >
      {children}
    </a>
  )
}
