import { afterEach, describe, expect, it } from 'vitest'
import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { HelpHint } from './HelpHint'

describe('HelpHint', () => {
  afterEach(cleanup)

  it('exposes an accessible toggle and the hint content', () => {
    render(<HelpHint label="What is a theme?">A theme groups similar recalls.</HelpHint>)
    const button = screen.getByRole('button', { name: 'What is a theme?' })
    expect(button.getAttribute('aria-expanded')).toBe('false')
    // The hint lives in the DOM (CSS hides it until hover/focus/click), so it's always findable.
    expect(screen.getByRole('note').textContent).toContain('A theme groups similar recalls.')
  })

  it('toggles aria-expanded on click', () => {
    render(<HelpHint label="Help">Body</HelpHint>)
    const button = screen.getByRole('button', { name: 'Help' })
    fireEvent.click(button)
    expect(button.getAttribute('aria-expanded')).toBe('true')
    fireEvent.click(button)
    expect(button.getAttribute('aria-expanded')).toBe('false')
  })

  it('links the button to the hint via aria-controls and aria-describedby', () => {
    render(<HelpHint label="Help">Body</HelpHint>)
    const button = screen.getByRole('button', { name: 'Help' })
    const note = screen.getByRole('note')
    expect(note.id).toBeTruthy()
    expect(button.getAttribute('aria-controls')).toBe(note.id)
    expect(button.getAttribute('aria-describedby')).toBe(note.id)
  })

  it('closes on Escape once toggled open', () => {
    render(<HelpHint label="Help">Body</HelpHint>)
    const button = screen.getByRole('button', { name: 'Help' })
    fireEvent.click(button)
    expect(button.getAttribute('aria-expanded')).toBe('true')
    fireEvent.keyDown(document, { key: 'Escape' })
    expect(button.getAttribute('aria-expanded')).toBe('false')
  })
})
