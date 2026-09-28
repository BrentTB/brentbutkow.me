import { cleanup, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it } from 'vitest'
import { ArticleOrLinkCard } from './ArticleOrLinkCard'

afterEach(cleanup)

describe('ArticleOrLinkCard', () => {
  it('gives a link card only defined class names (no stray "undefined")', () => {
    render(<ArticleOrLinkCard href="https://example.com">Example</ArticleOrLinkCard>)
    const classes = screen.getByRole('link').className.split(' ')
    expect(classes).not.toContain('undefined')
    expect(classes.every(Boolean)).toBe(true)
  })

  it('appends a caller class after its own', () => {
    render(
      <ArticleOrLinkCard href="https://example.com" className="extra">
        Example
      </ArticleOrLinkCard>
    )
    expect(screen.getByRole('link').className.split(' ')).toHaveLength(2)
    expect(screen.getByRole('link').classList.contains('extra')).toBe(true)
  })
})
