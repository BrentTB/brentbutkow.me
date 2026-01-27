import { ReactNode } from 'react'

interface SafeLinkProps {
  className?: string
  target?: string
  rel?: string
  href?: string
  children?: ReactNode
}

export const SafeLink = (safeLinkProps: SafeLinkProps) => {
  const props = { ...safeLinkProps }
  props.target = props.target || '_blank'
  props.rel = props.rel || 'noopener noreferrer'
  return (
    <a target="_blank" rel="noopener noreferrer" {...props}>
      {props.children}
    </a>
  )
}
