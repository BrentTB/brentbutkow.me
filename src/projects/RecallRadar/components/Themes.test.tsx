import { afterEach, describe, expect, it, vi } from 'vitest'
import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { Themes } from './Themes'

const topics = [
  {
    id: 0,
    slug: 'listeria-deli-meat',
    label: 'listeria · deli · meat',
    topTerms: ['listeria', 'deli', 'meat'],
    size: 9,
  },
  {
    id: 1,
    slug: 'undeclared-milk-wheat',
    label: 'undeclared · milk · wheat',
    topTerms: ['undeclared', 'milk', 'wheat'],
    size: 5,
  },
]

describe('Themes', () => {
  afterEach(cleanup)

  it('renders a row per theme and reports the chosen topic slug on click', () => {
    const onSelect = vi.fn()
    render(<Themes topics={topics} activeTopic="" onSelect={onSelect} />)
    expect(screen.getByText('listeria · deli · meat')).toBeTruthy()
    fireEvent.click(screen.getByText('undeclared · milk · wheat'))
    expect(onSelect).toHaveBeenCalledWith('undeclared-milk-wheat')
  })

  it('clears the filter when the active theme is clicked again', () => {
    const onSelect = vi.fn()
    render(<Themes topics={topics} activeTopic="listeria-deli-meat" onSelect={onSelect} />)
    fireEvent.click(screen.getByText('listeria · deli · meat'))
    expect(onSelect).toHaveBeenCalledWith('')
  })
})
