import { describe, it, expect, vi, beforeEach } from 'vitest'
import { renderHook, act } from '@testing-library/react'
import { ReactNode } from 'react'
import { MemoryRouter, useLocation } from 'react-router-dom'
import { FunModeProvider } from '../../../../contexts/FunModeProvider'
import { useFunMode } from '../../../../contexts/useFunMode'
import { routePaths } from '../../../../routes/routes.paths'
import { TerminalLineKind, useTerminal } from './useTerminal'

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
})
