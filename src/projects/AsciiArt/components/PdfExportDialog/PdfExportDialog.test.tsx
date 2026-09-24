import { describe, it, expect, vi } from 'vitest'
import { fireEvent, render, screen } from '@testing-library/react'
import { PdfExportDialog } from './PdfExportDialog'

const props = () => ({
  clipDuration: 30,
  estimate: () => null,
  onConfirm: vi.fn(),
  onClose: vi.fn(),
})

describe('PdfExportDialog', () => {
  // Guards the length slider dropping its drag: the parent re-renders every
  // playback tick with a fresh onClose, which re-ran the focus-on-open effect.
  it('keeps focus on the slider when the parent re-renders with a new onClose', () => {
    const { rerender } = render(<PdfExportDialog {...props()} />)
    const slider = screen.getByRole('slider')
    slider.focus()
    rerender(<PdfExportDialog {...props()} />)
    expect(document.activeElement).toBe(slider)
  })

  it('closes on Escape with the latest onClose', () => {
    const { rerender } = render(<PdfExportDialog {...props()} />)
    const latest = props()
    rerender(<PdfExportDialog {...latest} />)
    fireEvent.keyDown(window, { key: 'Escape' })
    expect(latest.onClose).toHaveBeenCalledTimes(1)
  })
})
