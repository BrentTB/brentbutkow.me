import { describe, it, expect, afterEach, vi } from 'vitest'
import { render, screen, cleanup, fireEvent } from '@testing-library/react'
import { Tool } from '../../pixel-world.types'
import { TOOLS, simCopy } from '../../data'
import { ToolButtons } from './ToolButtons'

afterEach(cleanup)

function renderButtons(selected: Tool = Tool.paint) {
  const onSelect = vi.fn()
  render(<ToolButtons selected={selected} onSelect={onSelect} />)
  return onSelect
}

describe('ToolButtons', () => {
  it('offers the forces and nothing standing in for the brush', () => {
    // Picking a material is what paints, so a Paint button could only restate what the palette had done.
    renderButtons()

    expect(screen.getByRole('group', { name: simCopy.tools.label })).toBeTruthy()
    expect(screen.queryByRole('button', { name: 'Paint' })).toBeNull()
    for (const { label } of TOOLS) {
      expect(screen.getByRole('button', { name: label })).toBeTruthy()
    }
  })

  it('drops Attract, which only ever nudged', () => {
    renderButtons()
    expect(screen.queryByRole('button', { name: 'Attract' })).toBeNull()
  })

  it('marks nothing while a material is being laid', () => {
    renderButtons(Tool.paint)

    for (const { label } of TOOLS) {
      expect(screen.getByRole('button', { name: label }).getAttribute('aria-pressed')).toBe('false')
    }
  })

  it('puts a force down when it is pressed a second time', () => {
    // The way back to laying material from inside the row, now that nothing in it means "none".
    const onSelect = renderButtons(Tool.blast)

    fireEvent.click(screen.getByRole('button', { name: 'Blast' }))

    expect(onSelect).toHaveBeenCalledWith(Tool.paint)
  })

  it('selects a force when a different one is pressed', () => {
    const onSelect = renderButtons(Tool.paint)

    fireEvent.click(screen.getByRole('button', { name: 'Blast' }))

    expect(onSelect).toHaveBeenCalledWith(Tool.blast)
  })

  it('marks the force in hand as pressed', () => {
    renderButtons(Tool.blast)

    expect(screen.getByRole('button', { name: 'Blast' }).getAttribute('aria-pressed')).toBe('true')
  })
})
