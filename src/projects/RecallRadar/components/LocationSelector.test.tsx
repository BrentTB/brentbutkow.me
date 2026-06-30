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
      // The menu is closed until the trigger is pressed — its options aren't in the DOM yet.
      expect(screen.queryByRole('button', { name: 'United Kingdom' })).toBeNull()
      fireEvent.click(screen.getByRole('button', { name: 'Location: United States' }))
      expect(screen.getByRole('button', { name: 'United Kingdom' })).toBeTruthy()
    })

    // The sticky control bar clips its overflow on phones, so the menu must portal out to the body
    // rather than nest under the trigger — otherwise it's cut off behind the section rail.
    it('portals the open menu to the document body, not inside the dropdown', () => {
      const { container } = render(<LocationSelector value="us" collapsed onChange={() => {}} />)
      fireEvent.click(screen.getByRole('button', { name: 'Location: United States' }))
      const option = screen.getByRole('button', { name: 'United Kingdom' })
      expect(container.contains(option)).toBe(false)
      expect(document.body.contains(option)).toBe(true)
    })

    it('reports the chosen location and closes the menu', () => {
      const onChange = vi.fn()
      render(<LocationSelector value="us" collapsed onChange={onChange} />)
      fireEvent.click(screen.getByRole('button', { name: 'Location: United States' }))
      fireEvent.click(screen.getByRole('button', { name: 'United Kingdom' }))
      expect(onChange).toHaveBeenCalledWith('uk')
      expect(screen.queryByRole('button', { name: 'United Kingdom' })).toBeNull()
    })
  })
})
