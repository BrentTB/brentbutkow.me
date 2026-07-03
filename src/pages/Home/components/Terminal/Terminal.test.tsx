import { describe, it, expect } from 'vitest'
import { render, fireEvent } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { FunModeProvider } from '../../../../contexts/FunModeProvider'
import { Terminal } from './Terminal'

function renderTerminal() {
  return render(
    <MemoryRouter>
      <FunModeProvider>
        <Terminal />
      </FunModeProvider>
    </MemoryRouter>
  )
}

const frameMode = (container: HTMLElement) =>
  container.querySelector('[aria-label="Site terminal"] > div')?.getAttribute('data-mode')

function enterMatrix(container: HTMLElement) {
  const input = container.querySelector('input[aria-label="Type a command"]') as HTMLInputElement
  fireEvent.focus(input)
  fireEvent.change(input, { target: { value: 'cmatrix' } })
  fireEvent.keyDown(input, { key: 'Enter' })
}

describe('Terminal — matrix mode', () => {
  // Regression: a held Enter fires repeat keydowns. Without arming, the command's own Enter
  // exited matrix the instant it entered — so this must stay in matrix through the repeat.
  it('ignores repeats of the still-held launching key', () => {
    const { container } = renderTerminal()
    enterMatrix(container)
    expect(frameMode(container)).toBe('matrix')

    fireEvent.keyDown(document, { key: 'Enter', repeat: true })
    expect(frameMode(container)).toBe('matrix')
  })

  it('exits once the launching key is released and a fresh key is pressed', () => {
    const { container } = renderTerminal()
    enterMatrix(container)
    expect(frameMode(container)).toBe('matrix')

    fireEvent.keyUp(document, { key: 'Enter' }) // release arms the exit
    fireEvent.keyDown(document, { key: 'j' })
    expect(frameMode(container)).toBe('inline')
  })
})
