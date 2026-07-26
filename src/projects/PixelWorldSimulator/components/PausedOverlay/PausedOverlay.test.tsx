import { describe, it, expect, afterEach, vi } from 'vitest'
import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { simCopy } from '../../data'
import { PausedOverlay } from './PausedOverlay'

afterEach(cleanup)

describe('PausedOverlay', () => {
  it('is one button covering the world, named for what pressing it does', () => {
    // The whole world is the target: a still picture with a play button on it is the arrangement nobody has
    // to be told about, and asking somebody to find the transport strip instead is how a link reads as broken.
    render(<PausedOverlay onStart={vi.fn()} />)

    const button = screen.getByRole('button')
    expect(button.textContent).toContain(simCopy.paused.hint)
  })

  it('starts the world when pressed', () => {
    const onStart = vi.fn()
    render(<PausedOverlay onStart={onStart} />)

    fireEvent.click(screen.getByRole('button'))

    expect(onStart).toHaveBeenCalledTimes(1)
  })

  it('says it is paused in words as well as in a glyph', () => {
    render(<PausedOverlay onStart={vi.fn()} />)

    expect(screen.getByText(simCopy.paused.title)).toBeTruthy()
  })

  it('keeps its play glyph out of the accessible name', () => {
    render(<PausedOverlay onStart={vi.fn()} />)

    const svg = screen.getByRole('button').querySelector('svg')
    expect(svg?.getAttribute('aria-hidden')).toBe('true')
  })
})
