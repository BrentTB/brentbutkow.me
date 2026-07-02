import { ReactNode } from 'react'
import { Link } from 'react-router-dom'

interface SafeLinkProps {
  className?: string
  target?: string
  rel?: string
  href?: string
  internal?: boolean
  /** Download the target (with this filename) instead of navigating — same-origin files only. */
  download?: string
  children?: ReactNode
}

export const SafeLink = ({
  className,
  target,
  rel,
  href,
  internal,
  download,
  children,
}: SafeLinkProps) => {
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
      download={download}
      // A download shouldn't also spawn a blank tab; navigation links keep the new-tab default.
      target={target || (download ? undefined : '_blank')}
      rel={rel || 'noopener noreferrer'}
    >
      {children}
    </a>
  )
}
