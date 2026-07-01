import type { CSSProperties } from 'react'
import styles from './Skeleton.module.scss'

type SkeletonProps = {
  width?: string
  height?: string | number
  radius?: string | number
  className?: string
}

// A shimmering placeholder block that reserves a data region's space while it loads, so the section
// doesn't pop in and shove the page around when the fetch resolves.
export function Skeleton({ width, height, radius, className }: SkeletonProps) {
  const style: CSSProperties = { width, height, borderRadius: radius }
  return (
    <span className={`${styles.skeleton} ${className ?? ''}`} style={style} aria-hidden="true" />
  )
}
