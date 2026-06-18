import { describe, expect, it, vi } from 'vitest'
import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { Pagination } from './Pagination'

describe('Pagination', () => {
  it('renders nothing when everything fits on one page', () => {
    const { container } = render(
      <Pagination page={1} pageSize={20} total={20} onChange={vi.fn()} />
    )
    expect(container.firstChild).toBeNull()
    cleanup()
  })

  it('disables Previous on the first page and steps forward', () => {
    const onChange = vi.fn()
    render(<Pagination page={1} pageSize={20} total={50} onChange={onChange} />)
    expect(screen.getByText('1–20 of 50')).toBeTruthy()
    expect(screen.getByRole('button', { name: '← Previous' })).toHaveProperty('disabled', true)
    fireEvent.click(screen.getByRole('button', { name: 'Next →' }))
    expect(onChange).toHaveBeenCalledWith(2)
    cleanup()
  })

  it('disables Next on the last page and steps back', () => {
    const onChange = vi.fn()
    render(<Pagination page={3} pageSize={20} total={50} onChange={onChange} />)
    expect(screen.getByText('41–50 of 50')).toBeTruthy()
    expect(screen.getByRole('button', { name: 'Next →' })).toHaveProperty('disabled', true)
    fireEvent.click(screen.getByRole('button', { name: '← Previous' }))
    expect(onChange).toHaveBeenCalledWith(2)
  })
})
