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

  it('the first tap selects the rain; a second tap closes it (the mobile path)', () => {
    const { container } = renderTerminal()
    runCmd(container, 'cmatrix')
    const rain = matrixEl(container)
    fireEvent.click(rain)
    expect(modeOf(container)).toBe('matrix') // first tap only selects
    fireEvent.click(rain)
    expect(modeOf(container)).toBe('inline') // second tap closes
  })

  it('a tap outside the rain resets the two-tap counter', () => {
    const { container } = renderTerminal()
    runCmd(container, 'cmatrix')
    const rain = matrixEl(container)
    fireEvent.click(rain) // select
    fireEvent.pointerDown(document.body) // tap away — resets the counter
    fireEvent.click(rain) // counts as a first tap again, so it selects, not closes
    expect(modeOf(container)).toBe('matrix')
    fireEvent.click(rain) // now the second tap closes
    expect(modeOf(container)).toBe('inline')
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

  it('"/" highlights the rain without ending it; a following key ends it', () => {
    const { container } = renderTerminal()
    runCmd(container, 'cmatrix')
    fireEvent.keyUp(document, { key: 'Enter' }) // release arms the exit
    ;(document.activeElement as HTMLElement | null)?.blur?.() // move focus off the rain

    // First press only brings focus (highlight) back to the rain — it keeps running.
    fireEvent.keyDown(document, { key: '/' })
    expect(modeOf(container)).toBe('matrix')
    expect(document.activeElement).toBe(matrixEl(container))

    // The next key actually dismisses it.
    fireEvent.keyDown(matrixEl(container), { key: 'j' })
    expect(modeOf(container)).toBe('inline')
  })

  it('"/" pressed on the already-focused rain does not dismiss it', () => {
    const { container } = renderTerminal()
    runCmd(container, 'cmatrix')
    fireEvent.keyUp(document, { key: 'Enter' })
    fireEvent.keyDown(matrixEl(container), { key: '/' })
    expect(modeOf(container)).toBe('matrix')
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

describe('Terminal — tap the ghost to complete (Tab stand-in)', () => {
  const inputOf = (container: HTMLElement) =>
    container.querySelector('input[aria-label="Type a command"]') as HTMLInputElement

  it('tapping the greyed suffix fills in the completion', () => {
    const { container } = renderTerminal()
    const input = inputOf(container)
    fireEvent.focus(input)
    fireEvent.change(input, { target: { value: 'hel' } })
    const suffix = container.querySelector('[data-ghost-suffix]') as HTMLElement
    expect(suffix).not.toBeNull()
    fireEvent.click(suffix)
    expect(input.value).toBe('help ') // same result Tab produces
  })

  it('renders no ghost suffix when the input has no completion', () => {
    const { container } = renderTerminal()
    const input = inputOf(container)
    fireEvent.focus(input)
    fireEvent.change(input, { target: { value: 'zzz' } })
    expect(container.querySelector('[data-ghost-suffix]')).toBeNull()
  })
})

describe('Terminal — the prompt and the command are one line', () => {
  /**
   * jsdom reports every box as zero, so the widths that drive the line have to be stood in for: a row with room
   * for 200px, a prompt taking 120px of it, and a command as wide as the caller asks. The component measures an
   * unseen mirror of the line rather than the input's own box, which is the only way the arithmetic can be
   * independent of the shift it has already applied.
   */
  function measured(container: HTMLElement, stripWidth: number) {
    const input = container.querySelector('input[aria-label="Type a command"]') as HTMLInputElement
    const wrap = input.parentElement as HTMLElement
    const row = wrap.parentElement as HTMLElement
    const prompt = row.firstElementChild as HTMLElement
    const mirror = container.querySelector('[class*=mirror]') as HTMLElement

    Object.defineProperty(mirror, 'offsetWidth', { configurable: true, value: stripWidth })
    Object.defineProperty(row, 'clientWidth', { configurable: true, value: 200 })
    Object.defineProperty(prompt, 'offsetWidth', { configurable: true, value: 120 })
    return { input, prompt, mirror }
  }

  function type(input: HTMLInputElement, value: string) {
    fireEvent.focus(input)
    fireEvent.change(input, { target: { value } })
  }

  it('slides the prompt out first, and leaves the text where it is', () => {
    // 120 of prompt plus 140 of line against 200 of room: 62 to travel, all of it out of the prompt.
    const { container } = renderTerminal()
    const { input, prompt } = measured(container, 140)

    type(input, 'cd fun-stuff')

    expect(prompt.style.transform).toBe('translateX(-62px)')
    expect(input.scrollLeft).toBe(0)
  })

  it('only scrolls the text once the prompt has run out', () => {
    // 120 plus 300 against 200: the prompt absorbs its full 120 and the text takes the remaining 102.
    const { container } = renderTerminal()
    const { input, prompt } = measured(container, 300)

    type(input, 'cd fun-stuff/games/pixel-world')

    expect(prompt.style.transform).toBe('translateX(-120px)')
    expect(input.scrollLeft).toBe(102)
  })

  it('recovers completely when the line is deleted again', () => {
    // The bug this measurement exists for. Reading the input's own box fed the arithmetic its own output, so any
    // shift held itself in place: you could backspace to an empty line and the prompt stayed clipped.
    const { container } = renderTerminal()
    const { input, prompt, mirror } = measured(container, 300)
    type(input, 'cd fun-stuff/games/pixel-world')
    expect(prompt.style.transform).toBe('translateX(-120px)')

    Object.defineProperty(mirror, 'offsetWidth', { configurable: true, value: 0 })
    type(input, '')

    expect(prompt.style.transform).toBe('translateX(0px)')
    expect(input.scrollLeft).toBe(0)
  })

  it('keeps scroll room for the completion, and none without one', () => {
    // The completion is drawn past the end of the text, and an input cannot scroll past its own text — so the
    // room has to be there for the suffix to be reachable at the end of a long line. Sized to the suffix, so it
    // never costs the start of the command for nothing.
    const { container } = renderTerminal()
    const { input } = measured(container, 300)
    const mirrorGhost = container.querySelector('[class*=mirror] span') as HTMLElement
    Object.defineProperty(mirrorGhost, 'offsetWidth', { configurable: true, value: 40 })

    type(input, 'hel')

    expect(input.style.paddingRight).toBe('42px')
  })
})
