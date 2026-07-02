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

    // A left-docked trigger (the Recalls tab on phones) used to push a right-anchored menu off the
    // left edge; the menu is now clamped to stay fully within the viewport.
    it('keeps the open menu on screen when the trigger is docked at the left edge', () => {
      const originalWidth = window.innerWidth
      Object.defineProperty(window, 'innerWidth', { configurable: true, value: 360 })
      const rectSpy = vi.spyOn(HTMLElement.prototype, 'getBoundingClientRect').mockReturnValue({
        top: 40,
        bottom: 60,
        left: 12,
        right: 120,
        width: 108,
        height: 20,
        x: 12,
        y: 40,
        toJSON: () => ({}),
      } as DOMRect)

      render(<LocationSelector value="us" collapsed onChange={() => {}} />)
      fireEvent.click(screen.getByRole('button', { name: 'Location: United States' }))
      const menu = screen.getByRole('group', { name: 'Location' })
      const left = parseFloat(menu.style.left)

      expect(left).toBeGreaterThanOrEqual(8)
      expect(left + 180).toBeLessThanOrEqual(360)

      rectSpy.mockRestore()
      Object.defineProperty(window, 'innerWidth', { configurable: true, value: originalWidth })
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
