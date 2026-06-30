import { afterEach, describe, expect, it, vi } from 'vitest'
import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { Outbreaks } from './Outbreaks'
import { EventSort } from '../recall.types'
import type { EventOut } from '../recall.types'

const event = (over: Partial<EventOut>): EventOut => ({
  id: 0,
  slug: 'listeria-2026-03',
  label: 'Listeria · 7 recalls',
  isOutbreak: true,
  dominantEntity: 'Listeria',
  recallCount: 7,
  companyCount: 3,
  stateCount: 4,
  firstDate: '2026-03-01',
  lastDate: '2026-03-18',
  severityMax: 92,
  ...over,
})

describe('Outbreaks', () => {
  afterEach(cleanup)

  it('renders a card per outbreak and reports its slug on click', () => {
    const onSelect = vi.fn()
    render(
      <Outbreaks
        events={[
          event({ slug: 'listeria-2026-03', dominantEntity: 'Listeria' }),
          event({ slug: 'milk-2026-05', dominantEntity: 'milk', isOutbreak: false }),
        ]}
        activeEvent=""
        onSelect={onSelect}
        sort={EventSort.recent}
        onSortChange={vi.fn()}
      />
    )
    expect(screen.getByText('Listeria')).toBeTruthy()
    expect(screen.getByText('7 recalls')).toBeTruthy()
    expect(screen.queryByText('milk')).toBeNull() // non-outbreaks are hidden
    fireEvent.click(screen.getByRole('button', { name: 'Filter to the Listeria outbreak' }))
    expect(onSelect).toHaveBeenCalledWith('listeria-2026-03')
  })

  it('clears the filter when the active outbreak is clicked again', () => {
    const onSelect = vi.fn()
    render(
      <Outbreaks
        events={[event({ slug: 'listeria-2026-03' })]}
        activeEvent="listeria-2026-03"
        onSelect={onSelect}
        sort={EventSort.recent}
        onSortChange={vi.fn()}
      />
    )
    fireEvent.click(screen.getByRole('button', { name: 'Filter to the Listeria outbreak' }))
    expect(onSelect).toHaveBeenCalledWith('')
  })

  it('renders nothing when there are no outbreaks', () => {
    const { container } = render(
      <Outbreaks
        events={[event({ isOutbreak: false })]}
        activeEvent=""
        onSelect={vi.fn()}
        sort={EventSort.recent}
        onSortChange={vi.fn()}
      />
    )
    expect(container.firstChild).toBeNull()
  })

  it('omits a zero company/state count instead of showing "0" (Canada has neither)', () => {
    render(
      <Outbreaks
        events={[event({ companyCount: 0, stateCount: 0 })]}
        activeEvent=""
        onSelect={vi.fn()}
        sort={EventSort.recent}
        onSortChange={vi.fn()}
      />
    )
    expect(screen.queryByText(/0 companies/)).toBeNull()
    expect(screen.queryByText(/companies|states/)).toBeNull()
  })

  it('still shows the company count when present', () => {
    render(
      <Outbreaks
        events={[event({ companyCount: 3, stateCount: 0 })]}
        activeEvent=""
        onSelect={vi.fn()}
        sort={EventSort.recent}
        onSortChange={vi.fn()}
      />
    )
    expect(screen.getByText(/3 companies/)).toBeTruthy()
  })

  it('orders by the sort prop and reports a sort change on toggle', () => {
    const recent = event({
      slug: 'a',
      dominantEntity: 'Listeria',
      recallCount: 3,
      lastDate: '2026-06-01',
    })
    const biggest = event({
      slug: 'b',
      dominantEntity: 'Salmonella',
      recallCount: 9,
      lastDate: '2026-01-01',
    })
    const onSortChange = vi.fn()

    // sort='recent' → Listeria (June) leads despite Salmonella having more recalls.
    const { rerender } = render(
      <Outbreaks
        events={[biggest, recent]}
        activeEvent=""
        onSelect={vi.fn()}
        sort={EventSort.recent}
        onSortChange={onSortChange}
      />
    )
    expect(screen.getAllByRole('button', { name: /Filter to the/i })[0].textContent).toContain(
      'Listeria'
    )

    // The page owns the order as a URL param, so toggling just reports the change (no internal re-sort).
    fireEvent.click(screen.getByRole('button', { name: 'Biggest' }))
    expect(onSortChange).toHaveBeenCalledWith(EventSort.biggest)

    // sort='biggest' → the 9-recall Salmonella cluster leads.
    rerender(
      <Outbreaks
        events={[biggest, recent]}
        activeEvent=""
        onSelect={vi.fn()}
        sort={EventSort.biggest}
        onSortChange={onSortChange}
      />
    )
    expect(screen.getAllByRole('button', { name: /Filter to the/i })[0].textContent).toContain(
      'Salmonella'
    )
  })
})
