import { ReactNode } from 'react'

interface SafeLinkProps {
  className?: string
  target?: string
  rel?: string
  href?: string
  children?: ReactNode
}

export const SafeLink = (safeLinkProps: SafeLinkProps) => {
  return (
    <a target="_blank" rel="noopener noreferrer" {...safeLinkProps}>
      {safeLinkProps.children}
    </a>
  )
}
