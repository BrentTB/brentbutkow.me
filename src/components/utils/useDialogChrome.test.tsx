import { describe, it, expect, afterEach, vi } from 'vitest'
import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { useRef } from 'react'
import { useDialogChrome } from './useDialogChrome'

/** A stand-in dialog, so the hook is tested through the thing it is for. */
function Dialog({ onClose, landOnLast = false }: { onClose(): void; landOnLast?: boolean }) {
  const lastRef = useRef<HTMLButtonElement>(null)
  const { panelRef } = useDialogChrome(onClose, landOnLast ? lastRef : undefined)

  return (
    <div ref={panelRef} role="dialog" aria-modal="true" aria-label="Test">
      <button type="button">first</button>
      <input aria-label="middle" />
      <button ref={lastRef} type="button">
        last
      </button>
    </div>
  )
}

/** A dialog whose last control is a link, which the Tab trap has to count as one. */
function LinkDialog() {
  const { panelRef } = useDialogChrome(() => undefined)

  return (
    <div ref={panelRef} role="dialog" aria-modal="true" aria-label="Links">
      <button type="button">first</button>
      <a href="#footnote">link</a>
    </div>
  )
}

afterEach(cleanup)

describe('useDialogChrome', () => {
  it('lands focus on the first control in the panel', () => {
    render(<Dialog onClose={vi.fn()} />)

    expect(document.activeElement?.textContent).toBe('first')
  })

  it('lands focus where the caller asks instead', () => {
    render(<Dialog onClose={vi.fn()} landOnLast />)

    expect(document.activeElement?.textContent).toBe('last')
  })

  it('closes on Escape', () => {
    const onClose = vi.fn()
    render(<Dialog onClose={onClose} />)

    fireEvent.keyDown(window, { key: 'Escape' })

    expect(onClose).toHaveBeenCalled()
  })

  it('wraps Tab at both ends, so focus cannot reach the page behind', () => {
    render(<Dialog onClose={vi.fn()} />)
    const first = screen.getByRole('button', { name: 'first' })
    const last = screen.getByRole('button', { name: 'last' })

    last.focus()
    fireEvent.keyDown(window, { key: 'Tab' })
    expect(document.activeElement).toBe(first)

    fireEvent.keyDown(window, { key: 'Tab', shiftKey: true })
    expect(document.activeElement).toBe(last)
  })

  /**
   * Regression: a link is a tab stop like any other control. Left out of the set the trap reads, a dialog
   * ending in one had its cycle stop at the control above and Tab walked off onto the page behind.
   */
  it('wraps Tab off a link at the end of the panel', () => {
    render(<LinkDialog />)
    const first = screen.getByRole('button', { name: 'first' })
    const link = screen.getByRole('link', { name: 'link' })

    link.focus()
    fireEvent.keyDown(window, { key: 'Tab' })

    expect(document.activeElement).toBe(first)
  })

  it('leaves Tab alone in the middle of the panel', () => {
    render(<Dialog onClose={vi.fn()} />)
    const middle = screen.getByLabelText('middle')
    middle.focus()

    fireEvent.keyDown(window, { key: 'Tab' })

    // The browser's own tab order handles the inside; only the edges need catching.
    expect(document.activeElement).toBe(middle)
  })

  it('gives focus back to whatever opened it', () => {
    const opener = document.createElement('button')
    document.body.append(opener)
    opener.focus()

    const view = render(<Dialog onClose={vi.fn()} />)
    expect(document.activeElement).not.toBe(opener)

    view.unmount()

    expect(document.activeElement).toBe(opener)
    opener.remove()
  })

  it('does not move focus when the parent re-renders with a fresh onClose', () => {
    // A page behind a dialog can hand down a new callback many times a second. An effect that depended
    // on it would drag focus back to the first control while somebody was mid-interaction.
    const view = render(<Dialog onClose={vi.fn()} />)
    const middle = screen.getByLabelText('middle')
    middle.focus()

    view.rerender(<Dialog onClose={vi.fn()} />)

    expect(document.activeElement).toBe(middle)
  })

  it('closes through the latest onClose after a re-render', () => {
    const stale = vi.fn()
    const fresh = vi.fn()
    const view = render(<Dialog onClose={stale} />)
    view.rerender(<Dialog onClose={fresh} />)

    fireEvent.keyDown(window, { key: 'Escape' })

    expect(fresh).toHaveBeenCalled()
    expect(stale).not.toHaveBeenCalled()
  })

  it('stops listening once the dialog has gone', () => {
    const onClose = vi.fn()
    const view = render(<Dialog onClose={onClose} />)

    view.unmount()
    fireEvent.keyDown(window, { key: 'Escape' })

    expect(onClose).not.toHaveBeenCalled()
  })
})
