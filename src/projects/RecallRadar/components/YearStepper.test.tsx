import { afterEach, describe, expect, it, vi } from 'vitest'
import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { YearStepper } from './YearStepper'

describe('YearStepper', () => {
  afterEach(cleanup)

  const years = [2021, 2022, 2023, 2024]

  it('steps to the adjacent older / newer year', () => {
    const onChange = vi.fn()
    render(<YearStepper year={2022} years={years} onChange={onChange} />)
    fireEvent.click(screen.getByRole('button', { name: 'Show 2021' }))
    fireEvent.click(screen.getByRole('button', { name: 'Show 2023' }))
    expect(onChange.mock.calls).toEqual([[2021], [2023]])
  })

  it('disables forward on the newest year and back on the oldest', () => {
    const { rerender } = render(<YearStepper year={2024} years={years} onChange={vi.fn()} />)
    expect(
      (screen.getByRole('button', { name: 'No later year' }) as HTMLButtonElement).disabled
    ).toBe(true)
    expect((screen.getByRole('button', { name: 'Show 2023' }) as HTMLButtonElement).disabled).toBe(
      false
    )
    rerender(<YearStepper year={2021} years={years} onChange={vi.fn()} />)
    expect(
      (screen.getByRole('button', { name: 'No earlier year' }) as HTMLButtonElement).disabled
    ).toBe(true)
  })

  it('skips a gap to the adjacent available year', () => {
    const onChange = vi.fn()
    render(<YearStepper year={2024} years={[2020, 2024]} onChange={onChange} />)
    fireEvent.click(screen.getByRole('button', { name: 'Show 2020' }))
    expect(onChange).toHaveBeenCalledWith(2020)
  })

  it('jumps to a year picked from the dropdown', () => {
    const onChange = vi.fn()
    render(<YearStepper year={2024} years={years} onChange={onChange} />)
    fireEvent.click(screen.getByRole('combobox', { name: 'Year' }))
    fireEvent.click(screen.getByRole('option', { name: '2022' }))
    expect(onChange).toHaveBeenCalledWith(2022)
  })

  it('greys years with no recalls under the filters (but not the current one)', () => {
    render(
      <YearStepper
        year={2024}
        years={years}
        counts={{ 2024: 0, 2023: 0, 2022: 3, 2021: 7 }}
        onChange={vi.fn()}
      />
    )
    fireEvent.click(screen.getByRole('combobox', { name: 'Year' }))
    // 2023 has no recalls → disabled; 2022 has some → enabled.
    expect(screen.getByRole('option', { name: /2023/ }).getAttribute('aria-disabled')).toBe('true')
    expect(screen.getByRole('option', { name: /2022/ }).getAttribute('aria-disabled')).toBeNull()
    // The selected year stays selectable even at zero, so it still reads as chosen.
    expect(screen.getByRole('option', { name: /2024/ }).getAttribute('aria-disabled')).toBeNull()
  })
})
