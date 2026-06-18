import { afterEach, describe, expect, it, vi } from 'vitest'
import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { Pagination } from './Pagination'
import { pageWindow } from './page-window'

describe('pageWindow', () => {
  it('shows every page when there are few', () => {
    expect(pageWindow(1, 5)).toEqual([1, 2, 3, 4, 5])
  })

  it('windows around the current page with gaps', () => {
    expect(pageWindow(15, 1360)).toEqual([1, 'gap', 14, 15, 16, 'gap', 1360])
  })

  it('shows a single hidden page instead of an orphan ellipsis', () => {
    expect(pageWindow(2, 20)).toEqual([1, 2, 3, 'gap', 20])
    expect(pageWindow(19, 20)).toEqual([1, 'gap', 18, 19, 20])
  })
})

describe('Pagination', () => {
  afterEach(cleanup)

  it('renders nothing when everything fits on one page', () => {
    const { container } = render(
      <Pagination page={1} pageSize={20} total={20} onChange={vi.fn()} />
    )
    expect(container.firstChild).toBeNull()
  })

  it('jumps to a clicked page number', () => {
    const onChange = vi.fn()
    // 27,200 items / 20 = 1,360 pages.
    render(<Pagination page={1} pageSize={20} total={27200} onChange={onChange} />)
    fireEvent.click(screen.getByRole('button', { name: 'Page 1360' }))
    expect(onChange).toHaveBeenCalledWith(1360)
  })

  it('disables Previous on the first page and marks the current page', () => {
    render(<Pagination page={1} pageSize={20} total={100} onChange={vi.fn()} />)
    expect(screen.getByRole('button', { name: 'Previous page' })).toHaveProperty('disabled', true)
    expect(screen.getByRole('button', { name: 'Page 1' }).getAttribute('aria-current')).toBe('page')
  })
})
