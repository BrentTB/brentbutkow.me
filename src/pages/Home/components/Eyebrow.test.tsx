import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { render, screen, act } from '@testing-library/react'
import { Eyebrow } from './Eyebrow'
import { queueEyebrowText, takeQueuedEyebrowText } from '../eyebrow-queue'

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

  it('types a terminal-queued line, path-styled, as the next alternate', () => {
    takeQueuedEyebrowText()
    queueEyebrowText('hi there')
    render(<Eyebrow label="ab" typed alternates={['cd']} />)
    const text = () => screen.getByLabelText('ab').textContent
    // Defaults: 4 chars × 55ms type + 6500ms hold + 2 erase × 35ms + 8 chars × 55ms type.
    act(() => vi.advanceTimersByTime(4 * 55 + 6500 + 2 * 35 + 8 * 55))
    expect(text()).toBe('~/hi-there')
    expect(takeQueuedEyebrowText()).toBeNull()
  })
})
