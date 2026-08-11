import { cleanup, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it } from 'vitest'
import { MemoryRouter } from 'react-router-dom'
import { FunItem } from '../../../data/data.types'
import { FunCard } from './FunCard'
import { funStuff } from '../data'
import { games } from '../subpages/Games/data'
import { pluralize } from '../../../utils/pluralize'

afterEach(cleanup)

const leaf: FunItem = {
  title: 'Gulag Sort',
  label: 'Algorithm',
  description: 'A sorting algorithm that deletes whatever is out of order',
  link: '/gulag-sort',
}

const renderCard = (item: FunItem) =>
  render(
    <MemoryRouter initialEntries={['/fun-stuff']}>
      <FunCard item={item} />
    </MemoryRouter>
  )

describe('FunCard', () => {
  it('puts the kind label in the rail, in the reading order before the title', () => {
    renderCard(leaf)
    const text = screen.getByRole('link').textContent ?? ''
    expect(text.indexOf(leaf.label)).toBeGreaterThanOrEqual(0)
    expect(text.indexOf(leaf.label)).toBeLessThan(text.indexOf(leaf.title))
  })

  it('prefixes an internal link with the current path and leaves an external one alone', () => {
    renderCard(leaf)
    expect(screen.getByRole('link').getAttribute('href')).toBe('/fun-stuff/gulag-sort')

    cleanup()
    renderCard({ ...leaf, link: 'https://github.com/BrentTB/brentbutkow.me' })
    expect(screen.getByRole('link').getAttribute('href')).toBe(
      'https://github.com/BrentTB/brentbutkow.me'
    )
  })

  it('shows the count on a hub row and nothing extra on a leaf row', () => {
    renderCard({ ...leaf, hub: '4 games' })
    expect(screen.getByRole('link').textContent).toContain('4 games')

    cleanup()
    renderCard(leaf)
    expect(screen.getByRole('link').textContent).not.toContain('4 games')
  })

  it('counts the games the Games row actually leads to', () => {
    // Reads the shipped copy against the shipped list, so adding a game has to move the count with it.
    const count = pluralize(games.length, 'game', 'games')
    const gamesRow = funStuff.find((item) => item.title === 'Games')
    expect(gamesRow?.hub).toBe(count)

    renderCard(gamesRow as FunItem)
    expect(screen.getByRole('link').textContent).toContain(count)
  })
})
