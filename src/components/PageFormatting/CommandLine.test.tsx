import { render } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { describe, expect, it } from 'vitest'
import { CommandLine } from './CommandLine'
import { FunModeContext } from '../../contexts/useFunMode'

function renderAt(pathname: string, isFunMode: boolean) {
  return render(
    <MemoryRouter initialEntries={[pathname]}>
      <FunModeContext.Provider value={{ isFunMode, setIsFunMode: () => {} }}>
        <CommandLine />
      </FunModeContext.Provider>
    </MemoryRouter>
  )
}

describe('CommandLine', () => {
  it('renders the ls line with the current route in fun mode', () => {
    const { container } = renderAt('/projects', true)
    expect(container.textContent).toContain('$ ls ~/projects')
  })

  it('renders nothing in professional mode', () => {
    const { container } = renderAt('/projects', false)
    expect(container.innerHTML).toBe('')
  })
})
