import { describe, it, expect, afterEach } from 'vitest'
import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { HOW_IT_WORKS, simCopy } from '../../data'
import { MATERIALS } from '../../engine/materials'
import { HowItWorks } from './HowItWorks'

afterEach(cleanup)

/** The toggle, found by its title. Its accessible name carries the caret glyph too, hence the substring. */
function toggle() {
  return screen.getByRole('button', { name: new RegExp(simCopy.howItWorks.title) })
}

function open() {
  render(<HowItWorks />)
  fireEvent.click(toggle())
}

describe('HowItWorks', () => {
  it('starts closed, so it never pushes the world down the page', () => {
    render(<HowItWorks />)

    expect(toggle()).toBeTruthy()
    expect(screen.queryByText(HOW_IT_WORKS[0].heading)).toBeNull()
  })

  it('shows every section once opened', () => {
    open()

    for (const { heading, body } of HOW_IT_WORKS) {
      expect(screen.getByText(heading)).toBeTruthy()
      for (const paragraph of body) expect(screen.getByText(paragraph)).toBeTruthy()
    }
  })

  it('orders the density figure lightest first, whatever order it is listed in', () => {
    // The figure is a claim about what sinks through what, so it has to be sorted from the table rather than
    // trusted to be written in order. A retuned density then reorders the picture instead of making it a lie.
    const listed = HOW_IT_WORKS.flatMap(({ ladder }) => ladder ?? [])
    expect(listed.length).toBeGreaterThan(2)

    open()

    const shown = listed.map((material) => MATERIALS[material].label)
    const rendered = screen
      .getAllByRole('listitem')
      .map((row) => row.textContent ?? '')
      .filter((text) => shown.some((label) => text.startsWith(label)))

    const densities = rendered.map((text) => {
      const label = shown.find((name) => text.startsWith(name))!
      return MATERIALS[listed.find((m) => MATERIALS[m].label === label)!].density
    })

    expect(densities).toHaveLength(listed.length)
    expect([...densities]).toEqual([...densities].sort((a, b) => a - b))
  })

  it('prints the density the sim actually runs on', () => {
    open()

    for (const material of HOW_IT_WORKS.flatMap(({ ladder }) => ladder ?? [])) {
      const row = screen
        .getAllByRole('listitem')
        .find((item) => (item.textContent ?? '').startsWith(MATERIALS[material].label))
      expect(row?.textContent).toContain(String(MATERIALS[material].density))
    }
  })
})
