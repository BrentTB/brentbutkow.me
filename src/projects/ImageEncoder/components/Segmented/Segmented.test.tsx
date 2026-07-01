import { afterEach, describe, expect, it, vi } from 'vitest'
import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { Segmented } from './Segmented'

const options = [
  { value: 'a', label: 'A' },
  { value: 'b', label: 'B' },
  { value: 'c', label: 'C' },
]

const radios = () => screen.getAllByRole('radio') as HTMLButtonElement[]

afterEach(cleanup)

describe('Segmented — disabled', () => {
  // Native `disabled` is the mechanism: it blocks clicks and removes the button
  // from the tab order (and from focus, so keydown can't reach it in a browser).
  it('disables every button', () => {
    render(<Segmented ariaLabel="test" options={options} value="a" onChange={() => {}} disabled />)
    for (const button of radios()) {
      expect(button.disabled).toBe(true)
    }
  })

  it('does not fire onChange on click while disabled', () => {
    const onChange = vi.fn()
    render(<Segmented ariaLabel="test" options={options} value="a" onChange={onChange} disabled />)
    fireEvent.click(radios()[1])
    expect(onChange).not.toHaveBeenCalled()
  })
})

describe('Segmented — enabled', () => {
  it('keeps only the selected button in the tab order', () => {
    render(<Segmented ariaLabel="test" options={options} value="b" onChange={() => {}} />)
    const [a, b, c] = radios()
    expect(a.getAttribute('tabindex')).toBe('-1')
    expect(b.getAttribute('tabindex')).toBe('0')
    expect(c.getAttribute('tabindex')).toBe('-1')
  })

  it('fires onChange on click and arrow keys', () => {
    const onChange = vi.fn()
    render(<Segmented ariaLabel="test" options={options} value="a" onChange={onChange} />)
    const [a] = radios()
    fireEvent.click(screen.getByText('B'))
    expect(onChange).toHaveBeenCalledWith('b')
    fireEvent.keyDown(a, { key: 'ArrowRight' })
    expect(onChange).toHaveBeenCalledWith('b')
  })
})
