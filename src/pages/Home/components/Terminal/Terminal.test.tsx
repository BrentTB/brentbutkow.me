import { describe, it, expect, beforeAll, beforeEach, vi } from 'vitest'
import { render, fireEvent } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { FunModeProvider } from '../../../../contexts/FunModeProvider'
import { Terminal } from './Terminal'

// jsdom doesn't implement scrollIntoView; the fullscreen effect calls it.
beforeAll(() => {
  Element.prototype.scrollIntoView = vi.fn()
})

function renderTerminal() {
  return render(
    <MemoryRouter>
      <FunModeProvider>
        <Terminal />
      </FunModeProvider>
    </MemoryRouter>
  )
}

const modeOf = (container: HTMLElement) =>
  container.querySelector('[aria-label="Site terminal"]')?.getAttribute('data-mode')

const matrixEl = (container: HTMLElement) =>
  container.querySelector('canvas')?.parentElement as HTMLElement

function runCmd(container: HTMLElement, command: string) {
  const input = container.querySelector('input[aria-label="Type a command"]') as HTMLInputElement
  fireEvent.focus(input)
  fireEvent.change(input, { target: { value: command } })
  fireEvent.keyDown(input, { key: 'Enter' })
}

describe('Terminal — fullscreen and matrix', () => {
  it('fullscreen grows the terminal in place', () => {
    const { container } = renderTerminal()
    runCmd(container, 'fullscreen')
    expect(modeOf(container)).toBe('expanded')
  })

  // Regression: a held Enter fires repeat keydowns. Without arming, the command's own Enter
  // exited matrix the instant it entered.
  it('ignores repeats of the still-held launching key', () => {
    const { container } = renderTerminal()
    runCmd(container, 'cmatrix')
    expect(modeOf(container)).toBe('matrix')

    fireEvent.keyDown(matrixEl(container), { key: 'Enter', repeat: true })
    expect(modeOf(container)).toBe('matrix')
  })

  it('a key pressed off the rain does not dismiss it', () => {
    const { container } = renderTerminal()
    runCmd(container, 'cmatrix')
    fireEvent.keyUp(document, { key: 'Enter' }) // release arms the exit

    fireEvent.keyDown(document.body, { key: 'x' }) // elsewhere on the page
    expect(modeOf(container)).toBe('matrix')
  })

  it('a key pressed on the focused rain returns to the mode before matrix', () => {
    const { container } = renderTerminal()
    runCmd(container, 'cmatrix') // from inline
    fireEvent.keyUp(document, { key: 'Enter' })
    fireEvent.keyDown(matrixEl(container), { key: 'j' })
    expect(modeOf(container)).toBe('inline')
  })

  it('a click on the rain does not dismiss it — only a key does', () => {
    const { container } = renderTerminal()
    runCmd(container, 'cmatrix')
    fireEvent.keyUp(document, { key: 'Enter' }) // release arms the exit
    fireEvent.click(matrixEl(container))
    expect(modeOf(container)).toBe('matrix')
  })

  it('refocuses the command input when the rain is dismissed', () => {
    const { container } = renderTerminal()
    runCmd(container, 'cmatrix')
    fireEvent.keyUp(document, { key: 'Enter' })
    fireEvent.keyDown(matrixEl(container), { key: 'j' })
    expect(document.activeElement).toBe(
      container.querySelector('input[aria-label="Type a command"]')
    )
  })

  it('matrix launched from fullscreen returns to fullscreen, not inline', () => {
    const { container } = renderTerminal()
    runCmd(container, 'fullscreen')
    expect(modeOf(container)).toBe('expanded')
    runCmd(container, 'cmatrix')
    expect(modeOf(container)).toBe('matrix')

    fireEvent.keyUp(document, { key: 'Enter' })
    fireEvent.keyDown(matrixEl(container), { key: 'j' })
    expect(modeOf(container)).toBe('expanded')
  })
})

describe('Terminal — autocomplete cascade', () => {
  // Fun mode persists to localStorage; reset so each test starts professional and `fun` reliably
  // toggles it on.
  beforeEach(() => localStorage.clear())

  const inputOf = (container: HTMLElement) =>
    container.querySelector('input[aria-label="Type a command"]') as HTMLInputElement
  const cascadeChars = (container: HTMLElement) => container.querySelectorAll('[data-cascade-char]')

  it('professional mode accepts the completion with no reveal', () => {
    const { container } = renderTerminal()
    const input = inputOf(container)
    fireEvent.focus(input)
    fireEvent.change(input, { target: { value: 'hel' } })
    fireEvent.keyDown(input, { key: 'Tab' })
    expect(input.value).toBe('help ') // completion (with its trailing arg space) applied
    expect(cascadeChars(container)).toHaveLength(0)
  })

  it('fun mode reveals the accepted suffix letter-by-letter', () => {
    const { container } = renderTerminal()
    runCmd(container, 'fun') // toggle fun mode on
    const input = inputOf(container)
    fireEvent.focus(input)
    fireEvent.change(input, { target: { value: 'hel' } })
    fireEvent.keyDown(input, { key: 'Tab' })
    expect(input.value).toBe('help ') // completion still applied immediately
    expect(cascadeChars(container)).toHaveLength(2) // the revealed 'p' and trailing space
  })

  it('a keystroke cancels an in-flight reveal', () => {
    const { container } = renderTerminal()
    runCmd(container, 'fun')
    const input = inputOf(container)
    fireEvent.focus(input)
    fireEvent.change(input, { target: { value: 'hel' } })
    fireEvent.keyDown(input, { key: 'Tab' })
    expect(cascadeChars(container)).toHaveLength(2)
    fireEvent.keyDown(input, { key: 'x' })
    expect(cascadeChars(container)).toHaveLength(0)
  })
})
