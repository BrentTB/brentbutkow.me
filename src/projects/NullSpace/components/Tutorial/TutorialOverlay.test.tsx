import { describe, it, expect, afterEach, vi } from 'vitest'
import { render, screen, cleanup, fireEvent } from '@testing-library/react'
import { TutorialOverlay } from './TutorialOverlay'
import type { TutorialUIState } from '../../useNullSpace'

function tutorial(over: Partial<TutorialUIState> = {}): TutorialUIState {
  return {
    copy: 'Tap the marked enemy to call down a meteorite.',
    awaitingAck: false,
    ackLabel: null,
    isFinal: false,
    stepNumber: 2,
    stepCount: 12,
    ...over,
  }
}

afterEach(cleanup)

describe('TutorialOverlay', () => {
  it('renders the copy as readable text (not buried in a control name)', () => {
    render(<TutorialOverlay tutorial={tutorial()} onAck={vi.fn()} onSkip={vi.fn()} />)
    expect(screen.getByText(/call down a meteorite/)).toBeTruthy()
  })

  it('exposes the beat position on the progress bar', () => {
    render(<TutorialOverlay tutorial={tutorial()} onAck={vi.fn()} onSkip={vi.fn()} />)
    const bar = screen.getByRole('progressbar')
    expect(bar.getAttribute('aria-valuenow')).toBe('2')
    expect(bar.getAttribute('aria-valuemax')).toBe('12')
  })

  // The whole card advances on a narration beat: the full-card button carries the
  // Next/Finish label and fires onAck. Absent on action beats (nothing to ack).
  it('shows a full-card advance button labelled by ackLabel when awaiting ack', () => {
    render(
      <TutorialOverlay
        tutorial={tutorial({ awaitingAck: true, ackLabel: 'Next' })}
        onAck={vi.fn()}
        onSkip={vi.fn()}
      />
    )
    expect(screen.getByRole('button', { name: 'Next' })).toBeTruthy()
  })

  it('has no advance button on an action beat (not awaiting ack)', () => {
    render(
      <TutorialOverlay
        tutorial={tutorial({ awaitingAck: false })}
        onAck={vi.fn()}
        onSkip={vi.fn()}
      />
    )
    expect(screen.queryByRole('button', { name: /Next|Finish/ })).toBeNull()
  })

  it('calls onAck when the advance button is pressed', () => {
    const onAck = vi.fn()
    render(
      <TutorialOverlay
        tutorial={tutorial({ awaitingAck: true, ackLabel: 'Finish' })}
        onAck={onAck}
        onSkip={vi.fn()}
      />
    )
    fireEvent.click(screen.getByRole('button', { name: 'Finish' }))
    expect(onAck).toHaveBeenCalledTimes(1)
  })

  it('calls only onSkip (never onAck) when Skip is pressed', () => {
    const onAck = vi.fn()
    const onSkip = vi.fn()
    render(
      <TutorialOverlay
        tutorial={tutorial({ awaitingAck: true, ackLabel: 'Next' })}
        onAck={onAck}
        onSkip={onSkip}
      />
    )
    fireEvent.click(screen.getByRole('button', { name: 'Skip tutorial' }))
    expect(onSkip).toHaveBeenCalledTimes(1)
    expect(onAck).not.toHaveBeenCalled()
  })

  it('hides Skip on the final beat (Finish already ends the tutorial)', () => {
    render(
      <TutorialOverlay
        tutorial={tutorial({ awaitingAck: true, ackLabel: 'Finish', isFinal: true })}
        onAck={vi.fn()}
        onSkip={vi.fn()}
      />
    )
    expect(screen.queryByRole('button', { name: 'Skip tutorial' })).toBeNull()
  })
})
