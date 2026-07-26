import { describe, it, expect, afterEach, vi } from 'vitest'
import { render, screen, cleanup, fireEvent } from '@testing-library/react'
import { MaterialId } from '../../pixel-world.types'
import { simCopy } from '../../data'
import { MATERIALS } from '../../engine/materials'
import { Census } from './Census'

/** A tally with a few materials in it, indexed by `MaterialId` the way the engine hands it over. */
function tally(entries: Partial<Record<MaterialId, number>>): Uint32Array {
  const counts = new Uint32Array(MATERIALS.length)
  for (const [material, count] of Object.entries(entries)) counts[Number(material)] = count
  return counts
}

afterEach(cleanup)

describe('Census', () => {
  it('starts collapsed, so it is there for the curious without shouting', () => {
    render(<Census counts={null} onWatch={vi.fn()} />)

    expect(
      screen.getByRole('button', { name: new RegExp(simCopy.census.title) }).getAttribute('aria-expanded')
    ).toBe('false')
  })

  it('only counts while it is open, so a closed panel costs nothing', () => {
    const onWatch = vi.fn()
    render(<Census counts={null} onWatch={onWatch} />)

    // Mounted closed: the count is off.
    expect(onWatch).toHaveBeenLastCalledWith(false)

    fireEvent.click(screen.getByRole('button', { name: new RegExp(simCopy.census.title) }))
    expect(onWatch).toHaveBeenLastCalledWith(true)

    fireEvent.click(screen.getByRole('button', { name: new RegExp(simCopy.census.title) }))
    expect(onWatch).toHaveBeenLastCalledWith(false)
  })

  it('stops counting when it goes away', () => {
    const onWatch = vi.fn()
    const view = render(<Census counts={null} onWatch={onWatch} />)
    fireEvent.click(screen.getByRole('button', { name: new RegExp(simCopy.census.title) }))

    view.unmount()

    expect(onWatch).toHaveBeenLastCalledWith(false)
  })

  it('lists what the world holds, biggest first', () => {
    render(
      <Census
        counts={tally({
          [MaterialId.stone]: 12,
          [MaterialId.sand]: 400,
          [MaterialId.ant]: 54,
        })}
        onWatch={vi.fn()}
      />
    )
    fireEvent.click(screen.getByRole('button', { name: new RegExp(simCopy.census.title) }))

    const rows = screen.getAllByRole('listitem').map((row) => row.textContent ?? '')
    expect(rows).toHaveLength(3)
    // Sand leads on 400, then the ant on 54, then stone on 12.
    expect(rows[0]).toContain(MATERIALS[MaterialId.sand].label)
    expect(rows[1]).toContain(MATERIALS[MaterialId.ant].label)
    expect(rows[2]).toContain(MATERIALS[MaterialId.stone].label)
    expect(rows[1]).toContain('54')
  })

  it('leaves out air and anything the world has none of', () => {
    render(
      <Census
        counts={tally({ [MaterialId.empty]: 5000, [MaterialId.stone]: 3 })}
        onWatch={vi.fn()}
      />
    )
    fireEvent.click(screen.getByRole('button', { name: new RegExp(simCopy.census.title) }))

    // Air is most of an empty world and says nothing; a material at zero is not in the world at all.
    const rows = screen.getAllByRole('listitem')
    expect(rows).toHaveLength(1)
    expect(rows[0].textContent).toContain(MATERIALS[MaterialId.stone].label)
    expect(screen.queryByText(MATERIALS[MaterialId.empty].label)).toBeNull()
  })

  it('says so when there is nothing drawn yet', () => {
    render(<Census counts={new Uint32Array(MATERIALS.length)} onWatch={vi.fn()} />)
    fireEvent.click(screen.getByRole('button', { name: new RegExp(simCopy.census.title) }))

    expect(screen.getByText(simCopy.census.empty)).toBeTruthy()
    expect(screen.queryAllByRole('listitem')).toHaveLength(0)
  })
})
