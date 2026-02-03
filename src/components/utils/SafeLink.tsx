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

export const SafeLink = (safeLinkProps: SafeLinkProps) => {
  const props = { ...safeLinkProps }
  if (!props.internal) {
    props.target = props.target || '_blank'
    props.rel = props.rel || 'noopener noreferrer'
    return <a {...props}></a>
  } else {
    return (
      <Link to={props.href || ''} className={props.className}>
        {props.children}
      </Link>
    )
  }
}
