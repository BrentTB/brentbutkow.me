import { afterEach, describe, expect, it, vi } from 'vitest'
import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { useRovingRadio } from './useRovingRadio'

afterEach(cleanup)

const SIZES = ['small', 'medium', 'large'] as const
type Size = (typeof SIZES)[number]

function Group({
  value,
  onChange,
  isDisabled,
}: {
  value: Size
  onChange: (next: Size) => void
  isDisabled?: (option: Size) => boolean
}) {
  const roving = useRovingRadio(SIZES, value, onChange, isDisabled)
  return (
    <div role="radiogroup" aria-label="Size">
      {SIZES.map((size, index) => (
        <button
          key={size}
          type="button"
          role="radio"
          aria-checked={size === value}
          disabled={isDisabled?.(size)}
          {...roving(index)}
        >
          {size}
        </button>
      ))}
    </div>
  )
}

const option = (name: Size) => screen.getByRole('radio', { name })

describe('useRovingRadio', () => {
  /** One tab stop for the whole group, on whichever option is selected. */
  it('puts the only tab stop on the selected option', () => {
    render(<Group value="medium" onChange={vi.fn()} />)

    expect(option('small').tabIndex).toBe(-1)
    expect(option('medium').tabIndex).toBe(0)
    expect(option('large').tabIndex).toBe(-1)
  })

  /** A group with nothing selected still has to be reachable by tab. */
  it('falls back to the first option when the value matches none of them', () => {
    render(<Group value={'huge' as Size} onChange={vi.fn()} />)
    expect(option('small').tabIndex).toBe(0)
  })

  it('moves the selection with the arrow keys', () => {
    const onChange = vi.fn()
    render(<Group value="medium" onChange={onChange} />)

    fireEvent.keyDown(option('medium'), { key: 'ArrowRight' })
    expect(onChange).toHaveBeenLastCalledWith('large')

    fireEvent.keyDown(option('medium'), { key: 'ArrowLeft' })
    expect(onChange).toHaveBeenLastCalledWith('small')
  })

  /** Vertical keys as well: a group laid out in a column reads the same way. */
  it('treats up and down like left and right', () => {
    const onChange = vi.fn()
    render(<Group value="medium" onChange={onChange} />)

    fireEvent.keyDown(option('medium'), { key: 'ArrowDown' })
    expect(onChange).toHaveBeenLastCalledWith('large')

    fireEvent.keyDown(option('medium'), { key: 'ArrowUp' })
    expect(onChange).toHaveBeenLastCalledWith('small')
  })

  it('wraps around at both ends', () => {
    const onChange = vi.fn()
    render(<Group value="large" onChange={onChange} />)

    fireEvent.keyDown(option('large'), { key: 'ArrowRight' })
    expect(onChange).toHaveBeenLastCalledWith('small')

    cleanup()
    render(<Group value="small" onChange={onChange} />)
    fireEvent.keyDown(option('small'), { key: 'ArrowLeft' })
    expect(onChange).toHaveBeenLastCalledWith('large')
  })

  it('jumps to the ends with Home and End', () => {
    const onChange = vi.fn()
    render(<Group value="medium" onChange={onChange} />)

    fireEvent.keyDown(option('medium'), { key: 'Home' })
    expect(onChange).toHaveBeenLastCalledWith('small')

    fireEvent.keyDown(option('medium'), { key: 'End' })
    expect(onChange).toHaveBeenLastCalledWith('large')
  })

  it('moves focus along with the selection', () => {
    render(<Group value="medium" onChange={vi.fn()} />)

    fireEvent.keyDown(option('medium'), { key: 'ArrowRight' })
    expect(document.activeElement).toBe(option('large'))
  })

  /**
   * Regression: the arrow keys used to select whatever they landed on, disabled or not — so a group whose
   * other options were locked could be talked into taking an action the mouse was refused. In the game's
   * online mode that switched away from a live room and forfeited it.
   */
  it('steps over a disabled option instead of selecting it', () => {
    const onChange = vi.fn()
    render(<Group value="small" onChange={onChange} isDisabled={(size) => size === 'medium'} />)

    fireEvent.keyDown(option('small'), { key: 'ArrowRight' })

    expect(onChange).toHaveBeenCalledTimes(1)
    expect(onChange).toHaveBeenCalledWith('large')
  })

  it('selects nothing when every other option is disabled', () => {
    const onChange = vi.fn()
    render(<Group value="large" onChange={onChange} isDisabled={(size) => size !== 'large'} />)

    fireEvent.keyDown(option('large'), { key: 'ArrowLeft' })
    fireEvent.keyDown(option('large'), { key: 'Home' })

    expect(onChange).not.toHaveBeenCalled()
  })

  /** Home and End mean the first and last option that can actually be taken. */
  it('lands Home and End on the nearest enabled option', () => {
    const onChange = vi.fn()
    render(<Group value="medium" onChange={onChange} isDisabled={(size) => size === 'small'} />)

    // Home is already as far left as it can go, so it stays put rather than reaching the locked option.
    fireEvent.keyDown(option('medium'), { key: 'Home' })
    expect(onChange).not.toHaveBeenCalled()
    expect(document.activeElement).toBe(option('medium'))

    fireEvent.keyDown(option('medium'), { key: 'End' })
    expect(onChange).toHaveBeenLastCalledWith('large')
  })

  /** The tab stop cannot sit on a locked option, or the group opens on a control that refuses to work. */
  it('keeps the fallback tab stop off a disabled option', () => {
    render(
      <Group value={'huge' as Size} onChange={vi.fn()} isDisabled={(size) => size === 'small'} />
    )

    expect(option('small').tabIndex).toBe(-1)
    expect(option('medium').tabIndex).toBe(0)
  })

  /** Anything else belongs to the page: swallowing it would break typing and shortcuts. */
  it('leaves other keys alone', () => {
    const onChange = vi.fn()
    render(<Group value="medium" onChange={onChange} />)

    fireEvent.keyDown(option('medium'), { key: 'Tab' })
    fireEvent.keyDown(option('medium'), { key: 'a' })

    expect(onChange).not.toHaveBeenCalled()
  })
})
