import { afterEach, describe, expect, it, vi } from 'vitest'
import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { LocationSelector } from './LocationSelector'

describe('LocationSelector', () => {
  afterEach(cleanup)

  describe('expanded (tabs)', () => {
    it('renders a flagged tab per location and marks the active one', () => {
      render(<LocationSelector value="us" collapsed={false} onChange={() => {}} />)
      expect(
        screen.getByRole('button', { name: 'United States' }).getAttribute('aria-pressed')
      ).toBe('true')
      expect(
        screen.getByRole('button', { name: 'United Kingdom' }).getAttribute('aria-pressed')
      ).toBe('false')
    })

    it('reports the chosen location', () => {
      const onChange = vi.fn()
      render(<LocationSelector value="us" collapsed={false} onChange={onChange} />)
      fireEvent.click(screen.getByRole('button', { name: 'United Kingdom' }))
      expect(onChange).toHaveBeenCalledWith('uk')
    })
  })

  describe('collapsed (dropdown)', () => {
    it('shows the active location as a trigger and opens the list on click', () => {
      render(<LocationSelector value="us" collapsed onChange={() => {}} />)
      // The menu is closed until the trigger is pressed.
      expect(screen.queryByRole('listbox')).toBeNull()
      fireEvent.click(screen.getByRole('button', { name: 'Location: United States' }))
      expect(screen.getByRole('listbox')).toBeTruthy()
    })

    it('reports the chosen location and closes the menu', () => {
      const onChange = vi.fn()
      render(<LocationSelector value="us" collapsed onChange={onChange} />)
      fireEvent.click(screen.getByRole('button', { name: 'Location: United States' }))
      fireEvent.click(screen.getByRole('option', { name: 'United Kingdom' }))
      expect(onChange).toHaveBeenCalledWith('uk')
      expect(screen.queryByRole('listbox')).toBeNull()
    })
  })
})
