import { describe, it, expect, afterEach, vi } from 'vitest'
import { render, screen, cleanup } from '@testing-library/react'
import { Tool } from '../../pixel-world.types'
import { TOOLS } from '../../data'
import { ToolRow } from './ToolRow'

afterEach(cleanup)

describe('ToolRow', () => {
  it('offers every tool', () => {
    render(<ToolRow selected={Tool.paint} onSelect={vi.fn()} />)

    for (const { label } of TOOLS) {
      expect(screen.getByRole('button', { name: label })).toBeTruthy()
    }
  })

  it('marks the tool in use and only that one', () => {
    render(<ToolRow selected={Tool.blast} onSelect={vi.fn()} />)

    const pressed = TOOLS.filter(
      ({ label }) =>
        screen.getByRole('button', { name: label }).getAttribute('aria-pressed') === 'true'
    )

    expect(pressed).toHaveLength(1)
    expect(pressed[0].tool).toBe(Tool.blast)
  })

  it('reports the tool that was picked', () => {
    const onSelect = vi.fn()
    render(<ToolRow selected={Tool.paint} onSelect={onSelect} />)

    const wind = TOOLS.find(({ tool }) => tool === Tool.wind)
    screen.getByRole('button', { name: wind?.label ?? '' }).click()

    expect(onSelect).toHaveBeenCalledWith(Tool.wind)
  })
})
