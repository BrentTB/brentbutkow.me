import { describe, it, expect, afterEach, vi } from 'vitest'
import { render, screen, cleanup, fireEvent } from '@testing-library/react'
import { MaterialId } from '../../pixel-world.types'
import { CENSUS_TRACK_COLOURS, simCopy } from '../../data'
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
      screen
        .getByRole('button', { name: new RegExp(simCopy.census.title) })
        .getAttribute('aria-expanded')
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

  it('keeps a tracked row on screen at zero, and drops it once untracked', () => {
    const view = render(
      <Census counts={tally({ [MaterialId.stone]: 3, [MaterialId.ant]: 1 })} onWatch={vi.fn()} />
    )
    fireEvent.click(screen.getByRole('button', { name: new RegExp(simCopy.census.title) }))

    // Track the ant, then let the world run out of ants.
    fireEvent.click(screen.getByRole('button', { name: /Ant/ }))
    view.rerender(<Census counts={tally({ [MaterialId.stone]: 3 })} onWatch={vi.fn()} />)

    // A count you are watching cannot slip off the list the moment its last cell goes.
    const tracked = screen.getByRole('button', { name: /Ant/ })
    expect(tracked.textContent).toContain('0')
    expect(tracked.getAttribute('aria-pressed')).toBe('true')

    // Untracked, it is gone: the row was only being held open for the sake of tracking it.
    fireEvent.click(tracked)
    expect(screen.queryByRole('button', { name: /Ant/ })).toBeNull()
  })

  it('gives each tracked row its own colour, so two can be told apart', () => {
    render(
      <Census
        counts={tally({ [MaterialId.stone]: 3, [MaterialId.sand]: 2, [MaterialId.ant]: 1 })}
        onWatch={vi.fn()}
      />
    )
    fireEvent.click(screen.getByRole('button', { name: new RegExp(simCopy.census.title) }))

    fireEvent.click(screen.getByRole('button', { name: /Stone/ }))
    fireEvent.click(screen.getByRole('button', { name: /Sand/ }))

    const first = screen.getByRole('button', { name: /Stone/ }).getAttribute('style')
    const second = screen.getByRole('button', { name: /Sand/ }).getAttribute('style')
    expect(first).toContain(CENSUS_TRACK_COLOURS[0])
    expect(second).toContain(CENSUS_TRACK_COLOURS[1])
    expect(first).not.toEqual(second)
  })

  it('tracks more than one row at a time', () => {
    render(
      <Census counts={tally({ [MaterialId.stone]: 3, [MaterialId.sand]: 2 })} onWatch={vi.fn()} />
    )
    fireEvent.click(screen.getByRole('button', { name: new RegExp(simCopy.census.title) }))

    fireEvent.click(screen.getByRole('button', { name: /Stone/ }))
    fireEvent.click(screen.getByRole('button', { name: /Sand/ }))

    expect(screen.getByRole('button', { name: /Stone/ }).getAttribute('aria-pressed')).toBe('true')
    expect(screen.getByRole('button', { name: /Sand/ }).getAttribute('aria-pressed')).toBe('true')
  })

  it('says so when there is nothing drawn yet', () => {
    render(<Census counts={new Uint32Array(MATERIALS.length)} onWatch={vi.fn()} />)
    fireEvent.click(screen.getByRole('button', { name: new RegExp(simCopy.census.title) }))

    expect(screen.getByText(simCopy.census.empty)).toBeTruthy()
    expect(screen.queryAllByRole('listitem')).toHaveLength(0)
  })
})
