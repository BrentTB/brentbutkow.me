import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import { Eyebrow } from './Eyebrow'

describe('Eyebrow', () => {
  beforeEach(() => {
    // Real motion preferences, so typing would run if (wrongly) enabled.
    vi.stubGlobal('matchMedia', vi.fn().mockReturnValue({ matches: false } as MediaQueryList))
    vi.useFakeTimers()
  })

  afterEach(() => {
    vi.useRealTimers()
    vi.unstubAllGlobals()
  })

  it('renders the label as a terminal path', () => {
    render(<Eyebrow label="Full-stack engineer" />)
    expect(screen.getByLabelText('Full-stack engineer').textContent).toBe('~/full-stack-engineer')
  })

  it('non-typed eyebrows show the full path immediately — no typewriter', () => {
    // Guards a regression where `enabled: undefined` fell back to the default and every eyebrow typed.
    render(<Eyebrow label="Currently" />)
    expect(screen.getByLabelText('Currently').textContent).toBe('~/currently')
  })
})
