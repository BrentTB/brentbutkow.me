import { describe, it, expect, afterEach } from 'vitest'
import { render, cleanup } from '@testing-library/react'
import { Icon, IconName } from './Icon'

describe('Icon', () => {
  afterEach(cleanup)

  // Guards against adding an IconName without a matching SVG path — a missing
  // entry would render an empty <svg> (invisible icon) rather than fail to compile.
  it('renders a non-empty svg for every IconName', () => {
    for (const name of Object.values(IconName)) {
      const { container } = render(<Icon name={name} />)
      const svg = container.querySelector('svg')
      expect(svg, `no <svg> for ${name}`).not.toBeNull()
      expect(svg!.childElementCount, `empty icon for ${name}`).toBeGreaterThan(0)
      cleanup()
    }
  })

  it('inherits color via currentColor and is decorative', () => {
    const { container } = render(<Icon name={IconName.pause} />)
    const svg = container.querySelector('svg')!
    expect(svg.getAttribute('stroke')).toBe('currentColor')
    expect(svg.getAttribute('aria-hidden')).toBe('true')
  })
})
