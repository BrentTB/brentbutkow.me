import { describe, it, expect, vi, beforeEach } from 'vitest'
import { renderHook, act } from '@testing-library/react'
import { ReactNode } from 'react'
import { MemoryRouter, useLocation } from 'react-router-dom'
import { FunModeProvider } from '../../../../contexts/FunModeProvider'
import { useFunMode } from '../../../../contexts/useFunMode'
import { routePaths } from '../../../../routes/routes.paths'
import { jokes } from '../../../../data/jokes'
import { takeQueuedEyebrowText } from '../../eyebrow-queue'
import { TerminalLineKind, TerminalMode, useTerminal } from './useTerminal'

const wrapper = ({ children }: { children: ReactNode }) => (
  <MemoryRouter initialEntries={[routePaths.home]}>
    <FunModeProvider>{children}</FunModeProvider>
  </MemoryRouter>
)

const onExit = vi.fn()

// Location and fun-mode ride along so tests can observe the hook's side effects.
function renderTerminal() {
  return renderHook(
    () => ({
      terminal: useTerminal({ onExit }),
      location: useLocation(),
      funMode: useFunMode(),
    }),
    { wrapper }
  )
}

function runCommand(
  result: { current: { terminal: ReturnType<typeof useTerminal> } },
  raw: string
) {
  act(() => result.current.terminal.run(raw))
}

describe('useTerminal', () => {
  beforeEach(() => {
    onExit.mockClear()
    localStorage.clear()
    document.documentElement.classList.remove('fun-mode')
    takeQueuedEyebrowText()
  })

  it('echoes the command and its output into the log', () => {
    const { result } = renderTerminal()
    runCommand(result, 'pwd')
    expect(result.current.terminal.lines).toEqual([
      { kind: TerminalLineKind.command, text: 'pwd' },
      { kind: TerminalLineKind.output, text: '~ - the home page' },
    ])
  })

  it('cd navigates the router', () => {
    const { result } = renderTerminal()
    runCommand(result, 'cd experience')
    expect(result.current.location.pathname).toBe(routePaths.experience)
  })

  it('rm -rf / shows its output before navigating away', () => {
    vi.useFakeTimers()
    const { result } = renderTerminal()
    runCommand(result, 'rm -rf /')
    expect(result.current.location.pathname).toBe(routePaths.home)
    act(() => vi.runAllTimers())
    expect(result.current.location.pathname).not.toBe(routePaths.home)
    vi.useRealTimers()
  })

  it('fun flips the global fun mode', () => {
    const { result } = renderTerminal()
    expect(result.current.funMode.isFunMode).toBe(false)
    runCommand(result, 'fun')
    expect(result.current.funMode.isFunMode).toBe(true)
    runCommand(result, 'fun')
    expect(result.current.funMode.isFunMode).toBe(false)
  })

  it('echo > .eyebrow hands the text to the eyebrow queue', () => {
    const { result } = renderTerminal()
    runCommand(result, 'echo gouda gouda gouda > .eyebrow')
    expect(takeQueuedEyebrowText()).toBe('gouda gouda gouda')
  })

  it('cat .homework opens the video in a new tab via an anchor click (not window.open)', () => {
    // Capture the anchor the handler builds and clicks — window.open would be popup-blocked on a
    // deployed origin, so a real anchor navigation is used instead.
    let href = ''
    let target = ''
    let rel = ''
    const clickSpy = vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(function (
      this: HTMLAnchorElement
    ) {
      href = this.href
      target = this.target
      rel = this.rel
    })
    const { result } = renderTerminal()
    runCommand(result, 'cat .homework')
    expect(clickSpy).toHaveBeenCalled()
    expect(href).toContain('youtube.com')
    expect(target).toBe('_blank')
    expect(rel).toBe('noopener noreferrer')
    clickSpy.mockRestore()
  })

  it('cowsay commits a single art line', () => {
    const { result } = renderTerminal()
    runCommand(result, 'cowsay hello')
    const artLines = result.current.terminal.lines.filter(
      (line) => line.kind === TerminalLineKind.art
    )
    expect(artLines).toHaveLength(1)
    expect(artLines[0].text).toContain('< hello >')
    expect(artLines[0].text).toContain('^__^')
  })

  it('sl plays the train, then clears it after the duration', () => {
    vi.useFakeTimers()
    const { result } = renderTerminal()
    runCommand(result, 'sl')
    expect(result.current.terminal.animation).toContain('====')
    act(() => vi.advanceTimersByTime(4000))
    expect(result.current.terminal.animation).toBeNull()
    vi.useRealTimers()
  })

  it('a new command cancels a train still playing', () => {
    vi.useFakeTimers()
    const { result } = renderTerminal()
    runCommand(result, 'sl')
    expect(result.current.terminal.animation).not.toBeNull()
    runCommand(result, 'help')
    expect(result.current.terminal.animation).toBeNull()
    vi.useRealTimers()
  })

  it('fullscreen toggles between inline and expanded', () => {
    const { result } = renderTerminal()
    expect(result.current.terminal.mode).toBe(TerminalMode.inline)
    runCommand(result, 'fullscreen')
    expect(result.current.terminal.mode).toBe(TerminalMode.expanded)
    runCommand(result, 'fullscreen')
    expect(result.current.terminal.mode).toBe(TerminalMode.inline)
  })

  it('cmatrix enters matrix mode', () => {
    const { result } = renderTerminal()
    runCommand(result, 'cmatrix')
    expect(result.current.terminal.mode).toBe(TerminalMode.matrix)
  })

  it('exitMatrix restores the mode from before the rain', () => {
    const { result } = renderTerminal()
    // From inline → back to inline.
    runCommand(result, 'cmatrix')
    act(() => result.current.terminal.exitMatrix())
    expect(result.current.terminal.mode).toBe(TerminalMode.inline)
    // From expanded → back to expanded, not inline.
    runCommand(result, 'fullscreen')
    expect(result.current.terminal.mode).toBe(TerminalMode.expanded)
    runCommand(result, 'cmatrix')
    expect(result.current.terminal.mode).toBe(TerminalMode.matrix)
    act(() => result.current.terminal.exitMatrix())
    expect(result.current.terminal.mode).toBe(TerminalMode.expanded)
  })

  it('clear empties the log', () => {
    const { result } = renderTerminal()
    runCommand(result, 'help')
    expect(result.current.terminal.lines.length).toBeGreaterThan(0)
    runCommand(result, 'clear')
    expect(result.current.terminal.lines).toEqual([])
  })

  it('exit calls onExit', () => {
    const { result } = renderTerminal()
    runCommand(result, 'exit')
    expect(onExit).toHaveBeenCalledOnce()
  })

  it('recalls history upward and returns to a blank line', () => {
    const { result } = renderTerminal()
    runCommand(result, 'pwd')
    runCommand(result, 'help')
    act(() => result.current.terminal.recallHistory(-1))
    expect(result.current.terminal.input).toBe('help')
    act(() => result.current.terminal.recallHistory(-1))
    expect(result.current.terminal.input).toBe('pwd')
    act(() => result.current.terminal.recallHistory(1))
    act(() => result.current.terminal.recallHistory(1))
    expect(result.current.terminal.input).toBe('')
  })

  it('restores the in-progress line after browsing history and back', () => {
    const { result } = renderTerminal()
    runCommand(result, 'pwd')
    act(() => result.current.terminal.setInput('hel'))
    act(() => result.current.terminal.recallHistory(-1))
    expect(result.current.terminal.input).toBe('pwd')
    act(() => result.current.terminal.recallHistory(1))
    expect(result.current.terminal.input).toBe('hel')
  })

  it('exposes the ghost remainder and accepts it on Tab', () => {
    const { result } = renderTerminal()
    act(() => result.current.terminal.setInput('cd exp'))
    expect(result.current.terminal.ghost).toBe('erience')
    act(() => result.current.terminal.acceptCompletion())
    expect(result.current.terminal.input).toBe('cd experience')
  })

  it('ignores empty input', () => {
    const { result } = renderTerminal()
    runCommand(result, '   ')
    expect(result.current.terminal.lines).toEqual([])
  })

  // Guards the professional-mode joke pool — without the isJokeAllowed filter, a full wrap
  // of the cycle lands on fun-mode-only jokes and this fails.
  it('joke round-robins the whole professional pool with no repeats and no racy jokes', () => {
    const professionalJokes = jokes.filter((joke) => !joke.funMode).map((joke) => joke.joke)
    const { result } = renderTerminal()
    for (let i = 0; i < professionalJokes.length; i++) runCommand(result, 'joke')
    const outputs = result.current.terminal.lines
      .filter((line) => line.kind === TerminalLineKind.output)
      .map((line) => line.text)
    expect([...outputs].sort()).toEqual([...professionalJokes].sort())
  })

  it('toggling fun mode mid-session widens the joke pool, and narrows it back', () => {
    const funOnlyJokes = new Set(jokes.filter((joke) => joke.funMode).map((joke) => joke.joke))
    const outputTexts = (result: ReturnType<typeof renderTerminal>['result']) =>
      result.current.terminal.lines
        .filter((line) => line.kind === TerminalLineKind.output)
        .map((line) => line.text)

    const { result } = renderTerminal()
    runCommand(result, 'fun')
    for (let i = 0; i < jokes.length; i++) runCommand(result, 'joke')
    expect(outputTexts(result).some((text) => funOnlyJokes.has(text))).toBe(true)

    runCommand(result, 'clear')
    runCommand(result, 'fun')
    for (let i = 0; i < jokes.length; i++) runCommand(result, 'joke')
    expect(outputTexts(result).filter((text) => funOnlyJokes.has(text))).toEqual([])
  })
})
