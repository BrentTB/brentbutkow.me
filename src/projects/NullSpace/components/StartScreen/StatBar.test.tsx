import { describe, it, expect, afterEach } from 'vitest'
import { render, cleanup } from '@testing-library/react'
import { StatBar } from './StatBar'

// The fill width is the only inline-styled element in the bar.
function fillWidth(value: number, max: number): string {
  const { container } = render(<StatBar label="HP" value={value} max={max} color="#fff" />)
  const fill = container.querySelector('[style*="width"]') as HTMLElement
  return fill.style.width
}

describe('StatBar', () => {
  afterEach(cleanup)

  it('maps a value to its proportion of max', () => {
    expect(fillWidth(80, 160)).toBe('50%')
  })

  it('clamps over-max values to 100%', () => {
    expect(fillWidth(200, 160)).toBe('100%')
  })

  it('clamps negative values to 0%', () => {
    expect(fillWidth(-20, 160)).toBe('0%')
  })

  it('renders 0% instead of NaN/Infinity when max is 0', () => {
    expect(fillWidth(50, 0)).toBe('0%')
  })
})
