import { afterEach, describe, expect, it, vi } from 'vitest'
import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { MorphTabs, MorphTabOption } from './MorphTabs'
import styles from './MorphTabs.module.scss'

const OPTIONS: MorphTabOption<'day' | 'week' | 'month'>[] = [
  { value: 'day', label: 'Day' },
  { value: 'week', label: 'Week' },
  { value: 'month', label: 'Month' },
]

describe('MorphTabs', () => {
  afterEach(cleanup)

  describe('expanded (tabs)', () => {
    it('renders a tab per option and marks the active one pressed', () => {
      render(
        <MorphTabs
          options={OPTIONS}
          value="day"
          collapsed={false}
          onChange={() => {}}
          ariaLabel="Range"
        />
      )
      expect(screen.getByRole('button', { name: 'Day' }).getAttribute('aria-pressed')).toBe('true')
      expect(screen.getByRole('button', { name: 'Week' }).getAttribute('aria-pressed')).toBe(
        'false'
      )
    })

    it('reports the chosen value', () => {
      const onChange = vi.fn()
      render(
        <MorphTabs
          options={OPTIONS}
          value="day"
          collapsed={false}
          onChange={onChange}
          ariaLabel="Range"
        />
      )
      fireEvent.click(screen.getByRole('button', { name: 'Week' }))
      expect(onChange).toHaveBeenCalledWith('week')
    })
  })

  // The collapse is a CSS morph on one persistent element — if either form remounted (or the
  // inactive tabs unmounted), the fold animation could never run and the swap would snap again.
  describe('tabs ↔ dropdown morph', () => {
    it('keeps the active button mounted across the collapse so the morph can animate', () => {
      const { rerender } = render(
        <MorphTabs
          options={OPTIONS}
          value="day"
          collapsed={false}
          onChange={() => {}}
          ariaLabel="Range"
        />
      )
      const tab = screen.getByRole('button', { name: 'Day' })
      rerender(
        <MorphTabs options={OPTIONS} value="day" collapsed onChange={() => {}} ariaLabel="Range" />
      )
      expect(screen.getByRole('button', { name: 'Range: Day' })).toBe(tab)
    })

    it('folds inactive tabs out of the a11y tree and tab order instead of unmounting them', () => {
      const { container } = render(
        <MorphTabs options={OPTIONS} value="day" collapsed onChange={() => {}} ariaLabel="Range" />
      )
      const folded = Array.from(container.querySelectorAll('button[aria-hidden="true"]'))
      // Every option except the active one folds; none may keep keyboard focus.
      expect(folded.length).toBe(OPTIONS.length - 1)
      expect(folded.every((tab) => tab.getAttribute('tabindex') === '-1')).toBe(true)
      expect(folded.some((tab) => tab.textContent === 'Day')).toBe(false)
    })

    // Changing the value while collapsed hops the trigger role to another tab. Without the
    // one-frame `snap` class the old tab folds while the new one unfolds, and the control visibly
    // balloons then shrinks.
    it('suppresses transitions while the trigger hops tabs on a collapsed value change', async () => {
      const { container, rerender } = render(
        <MorphTabs options={OPTIONS} value="day" collapsed onChange={() => {}} ariaLabel="Range" />
      )
      const selector = container.firstElementChild as HTMLElement
      expect(selector.classList.contains(styles.snap)).toBe(false)

      rerender(
        <MorphTabs options={OPTIONS} value="week" collapsed onChange={() => {}} ariaLabel="Range" />
      )
      expect(selector.classList.contains(styles.snap)).toBe(true)

      // The class lifts again a frame later, so the next collapse/expand still animates.
      await new Promise((resolve) => requestAnimationFrame(() => resolve(undefined)))
      expect(selector.classList.contains(styles.snap)).toBe(false)
    })

    it('keeps transitions live when the collapse itself toggles (the morph must animate)', () => {
      const { container, rerender } = render(
        <MorphTabs
          options={OPTIONS}
          value="day"
          collapsed={false}
          onChange={() => {}}
          ariaLabel="Range"
        />
      )
      rerender(
        <MorphTabs options={OPTIONS} value="day" collapsed onChange={() => {}} ariaLabel="Range" />
      )
      const selector = container.firstElementChild as HTMLElement
      expect(selector.classList.contains(styles.snap)).toBe(false)
    })
  })

  describe('collapsed (dropdown)', () => {
    it('shows the active option as a trigger and opens the list on click', () => {
      render(
        <MorphTabs options={OPTIONS} value="day" collapsed onChange={() => {}} ariaLabel="Range" />
      )
      // The menu is closed until the trigger is pressed — its options aren't in the DOM yet.
      expect(screen.queryByRole('button', { name: 'Week' })).toBeNull()
      fireEvent.click(screen.getByRole('button', { name: 'Range: Day' }))
      expect(screen.getByRole('button', { name: 'Week' })).toBeTruthy()
    })

    it('uses the triggerLabel prop for the collapsed trigger accessible name', () => {
      render(
        <MorphTabs
          options={OPTIONS}
          value="day"
          collapsed
          onChange={() => {}}
          ariaLabel="Range"
          triggerLabel={(label) => `Showing ${label}`}
        />
      )
      expect(screen.getByRole('button', { name: 'Showing Day' })).toBeTruthy()
    })

    // A collapsed parent can clip its overflow, so the menu must portal out to the body rather than
    // nest under the trigger — otherwise it's cut off.
    it('portals the open menu to the document body, not inside the control', () => {
      const { container } = render(
        <MorphTabs options={OPTIONS} value="day" collapsed onChange={() => {}} ariaLabel="Range" />
      )
      fireEvent.click(screen.getByRole('button', { name: 'Range: Day' }))
      const option = screen.getByRole('button', { name: 'Week' })
      expect(container.contains(option)).toBe(false)
      expect(document.body.contains(option)).toBe(true)
    })

    // A left-docked trigger used to push a right-anchored menu off the left edge; the menu is now
    // clamped to stay fully within the viewport.
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

      render(
        <MorphTabs options={OPTIONS} value="day" collapsed onChange={() => {}} ariaLabel="Range" />
      )
      fireEvent.click(screen.getByRole('button', { name: 'Range: Day' }))
      const menu = screen.getByRole('group', { name: 'Range' })
      const left = parseFloat(menu.style.left)

      expect(left).toBeGreaterThanOrEqual(8)
      expect(left + 180).toBeLessThanOrEqual(360)

      rectSpy.mockRestore()
      Object.defineProperty(window, 'innerWidth', { configurable: true, value: originalWidth })
    })

    it('reports the chosen value and closes the menu', () => {
      const onChange = vi.fn()
      render(
        <MorphTabs options={OPTIONS} value="day" collapsed onChange={onChange} ariaLabel="Range" />
      )
      fireEvent.click(screen.getByRole('button', { name: 'Range: Day' }))
      fireEvent.click(screen.getByRole('button', { name: 'Week' }))
      expect(onChange).toHaveBeenCalledWith('week')
      expect(screen.queryByRole('button', { name: 'Week' })).toBeNull()
    })
  })
})
