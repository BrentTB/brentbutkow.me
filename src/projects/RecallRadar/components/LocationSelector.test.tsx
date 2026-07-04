import { afterEach, describe, expect, it, vi } from 'vitest'
import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { LocationSelector } from './LocationSelector'
import { RecallCountry } from '../recall.types'
import styles from './LocationSelector.module.scss'

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

  // The collapse is a CSS morph on one persistent element — if either form remounted (or the
  // inactive tabs unmounted), the fold animation could never run and the swap would snap again.
  describe('tabs ↔ dropdown morph', () => {
    it('keeps the active button mounted across the collapse so the morph can animate', () => {
      const { rerender } = render(
        <LocationSelector value="us" collapsed={false} onChange={() => {}} />
      )
      const tab = screen.getByRole('button', { name: 'United States' })
      rerender(<LocationSelector value="us" collapsed onChange={() => {}} />)
      expect(screen.getByRole('button', { name: 'Location: United States' })).toBe(tab)
    })

    it('folds inactive tabs out of the a11y tree and tab order instead of unmounting them', () => {
      const { container } = render(<LocationSelector value="us" collapsed onChange={() => {}} />)
      const folded = Array.from(container.querySelectorAll('button[aria-hidden="true"]'))
      // Every location except the active one folds; none may keep keyboard focus.
      expect(folded.length).toBe(Object.values(RecallCountry).length - 1)
      expect(folded.every((tab) => tab.getAttribute('tabindex') === '-1')).toBe(true)
      expect(folded.some((tab) => tab.textContent?.includes('United States'))).toBe(false)
    })

    // Changing the country while collapsed hops the trigger role to another tab. Without the
    // one-frame `snap` class the old tab folds while the new one unfolds, and the control visibly
    // balloons then shrinks.
    it('suppresses transitions while the trigger hops tabs on a collapsed country change', async () => {
      const { container, rerender } = render(
        <LocationSelector value="us" collapsed onChange={() => {}} />
      )
      const selector = container.firstElementChild as HTMLElement
      expect(selector.classList.contains(styles.snap)).toBe(false)

      rerender(<LocationSelector value="uk" collapsed onChange={() => {}} />)
      expect(selector.classList.contains(styles.snap)).toBe(true)

      // The class lifts again a frame later, so the next collapse/expand still animates.
      await new Promise((resolve) => requestAnimationFrame(() => resolve(undefined)))
      expect(selector.classList.contains(styles.snap)).toBe(false)
    })

    it('keeps transitions live when the collapse itself toggles (the morph must animate)', () => {
      const { container, rerender } = render(
        <LocationSelector value="us" collapsed={false} onChange={() => {}} />
      )
      rerender(<LocationSelector value="us" collapsed onChange={() => {}} />)
      const selector = container.firstElementChild as HTMLElement
      expect(selector.classList.contains(styles.snap)).toBe(false)
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
