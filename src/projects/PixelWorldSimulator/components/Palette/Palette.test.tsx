import { describe, it, expect, afterEach, beforeEach, vi } from 'vitest'
import { render, screen, cleanup, fireEvent } from '@testing-library/react'
import { MaterialId } from '../../pixel-world.types'
import { MATERIAL_GROUPS, MATERIAL_SLOTS, MaterialGroup, simCopy } from '../../data'
import { MATERIALS } from '../../engine/materials'
import { Palette } from './Palette'

// The slots persist now, so a filled one would otherwise leak from one case into the next.
beforeEach(() => localStorage.clear())

function renderPalette(selected: MaterialId = MaterialId.sand) {
  const onSelect = vi.fn()
  render(<Palette selected={selected} onSelect={onSelect} />)
  return onSelect
}

function search(text: string) {
  fireEvent.change(screen.getByLabelText('Search materials'), { target: { value: text } })
}

afterEach(cleanup)

describe('Palette', () => {
  it('opens on the group holding the current brush, so the selection is on screen', () => {
    // Sand is a powder, and Powders is not the first group — opening on the first one left the
    // selected swatch hidden behind a tab on first load.
    renderPalette(MaterialId.sand)
    const powders = MATERIAL_GROUPS.find(({ group }) => group === MaterialGroup.powders)

    for (const material of powders?.materials ?? []) {
      expect(screen.getByRole('button', { name: MATERIALS[material].label })).toBeTruthy()
    }
    expect(screen.getByRole('button', { name: 'Sand' }).getAttribute('aria-pressed')).toBe('true')
    expect(screen.queryByRole('button', { name: 'Stone' })).toBeNull()
  })

  it('falls back to the first group for Erase, which lives outside them all', () => {
    renderPalette(MaterialId.empty)

    for (const material of MATERIAL_GROUPS[0].materials) {
      expect(screen.getByRole('button', { name: MATERIALS[material].label })).toBeTruthy()
    }
  })

  it('keeps Erase reachable from every group', () => {
    renderPalette()
    expect(screen.getByRole('button', { name: MATERIALS[MaterialId.empty].label })).toBeTruthy()

    fireEvent.click(screen.getByRole('button', { name: 'Gases' }))
    expect(screen.getByRole('button', { name: MATERIALS[MaterialId.empty].label })).toBeTruthy()
  })

  it('swaps the swatches when a different group is opened', () => {
    renderPalette()
    fireEvent.click(screen.getByRole('button', { name: 'Solids' }))

    expect(screen.getByRole('button', { name: 'Stone' })).toBeTruthy()
    expect(screen.queryByRole('button', { name: 'Gravel' })).toBeNull()
  })

  it('searches across every group, not just the open one', () => {
    renderPalette()
    // Chlorine is a gas and Powders is the group on screen.
    search('chlor')

    expect(screen.getByRole('button', { name: 'Chlorine' })).toBeTruthy()
    expect(screen.queryByRole('button', { name: 'Gravel' })).toBeNull()
  })

  it('matches partway through a name, and ignores case', () => {
    renderPalette()
    search('WAT')

    expect(screen.getByRole('button', { name: 'Water' })).toBeTruthy()
    expect(screen.getByRole('button', { name: 'Salt water' })).toBeTruthy()
  })

  it('says so when nothing matches', () => {
    renderPalette()
    search('zzz')

    expect(screen.getByText('Nothing by that name.')).toBeTruthy()
  })

  it('drops the search when a group is opened', () => {
    renderPalette()
    search('chlor')
    fireEvent.click(screen.getByRole('button', { name: 'Powders' }))

    expect(screen.getByRole('button', { name: 'Gravel' })).toBeTruthy()
    expect((screen.getByLabelText('Search materials') as HTMLInputElement).value).toBe('')
  })

  it('reports the material that was picked', () => {
    const onSelect = renderPalette()

    fireEvent.click(screen.getByRole('button', { name: 'Gravel' }))

    expect(onSelect).toHaveBeenCalledWith(MaterialId.gravel)
  })

  it('marks the selected material, wherever it lives', () => {
    renderPalette(MaterialId.chlorine)
    fireEvent.click(screen.getByRole('button', { name: 'Gases' }))

    expect(screen.getByRole('button', { name: 'Chlorine' }).getAttribute('aria-pressed')).toBe(
      'true'
    )
    expect(screen.getByRole('button', { name: 'Steam' }).getAttribute('aria-pressed')).toBe('false')
  })

  it('puts out as many quick slots as the palette is configured to hold', () => {
    renderPalette(MaterialId.sand)

    // Read off the constant rather than a number typed in here, so changing how many slots there are is a
    // one-line change and not a hunt through the tests.
    expect(screen.getAllByRole('button', { name: /Favourite/ })).toHaveLength(MATERIAL_SLOTS)
  })

  it('fills a quick slot with the next material picked, then draws with it on a press', () => {
    const onSelect = renderPalette(MaterialId.sand)

    // Ask the first slot to be filled, then pick something for it.
    fireEvent.click(screen.getByRole('button', { name: /Favourite 1, empty/ }))
    fireEvent.click(screen.getByRole('button', { name: /Gravel/ }))

    // Picking still moves the brush, and the slot now holds that material by name.
    expect(onSelect).toHaveBeenLastCalledWith(MaterialId.gravel)
    const slot = screen.getByRole('button', { name: /Favourite 1, Gravel/ })

    // Which is the whole point: it draws with gravel from anywhere, with no trip through the tabs.
    onSelect.mockClear()
    fireEvent.click(screen.getByRole('button', { name: 'Liquids' }))
    fireEvent.click(slot)
    expect(onSelect).toHaveBeenCalledWith(MaterialId.gravel)
  })

  it('leaves the slots alone when a material is picked with none of them waiting', () => {
    renderPalette(MaterialId.sand)

    fireEvent.click(screen.getByRole('button', { name: /Gravel/ }))

    // Picking a material is the ordinary case; a slot only fills when it has asked to.
    expect(screen.getByRole('button', { name: /Favourite 1, empty/ })).toBeTruthy()
  })

  it('swaps what a slot holds when it is pressed twice', () => {
    renderPalette(MaterialId.sand)
    fireEvent.click(screen.getByRole('button', { name: /Favourite 1, empty/ }))
    fireEvent.click(screen.getByRole('button', { name: /Gravel/ }))

    // A second press asks for something else, and the next pick replaces what was in there.
    fireEvent.click(screen.getByRole('button', { name: /Favourite 1, Gravel/ }), { detail: 2 })
    fireEvent.click(screen.getByRole('button', { name: /Dirt/ }))

    expect(screen.getByRole('button', { name: /Favourite 1, Dirt/ })).toBeTruthy()
    expect(screen.queryByRole('button', { name: /Favourite 1, Gravel/ })).toBeNull()
  })

  it('explains each material on its swatch', () => {
    render(<Palette selected={MaterialId.sand} onSelect={vi.fn()} />)

    // Source and void are the two nobody can guess by looking, but the same line helps everywhere.
    const sand = screen.getByRole('button', { name: /Sand/ })
    expect(sand.getAttribute('title')).toBe(MATERIALS[MaterialId.sand].blurb)
  })
})

describe('Palette on a phone', () => {
  /** Pins matchMedia so the palette takes its sheet form, the way it does under 640px. */
  function asPhone(matches = true) {
    vi.stubGlobal('matchMedia', (query: string) => ({
      matches,
      media: query,
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
    }))
  }

  afterEach(() => {
    vi.unstubAllGlobals()
    cleanup()
  })

  it('shows the material it holds instead of the whole grid', () => {
    asPhone()
    renderPalette(MaterialId.water)

    // 284px of swatches is more than the world itself gets on a phone.
    expect(screen.queryByLabelText('Material group')).toBeNull()
    expect(screen.getByRole('button', { name: /Water/ })).toBeTruthy()
  })

  it('opens the picker as a sheet, with the grid inside it', () => {
    asPhone()
    renderPalette()

    fireEvent.click(screen.getByRole('button', { name: /Change material/ }))

    const sheet = screen.getByRole('dialog')
    expect(sheet.getAttribute('aria-modal')).toBe('true')
    expect(screen.getByLabelText('Material group')).toBeTruthy()
  })

  it('picks a material and closes, since that is what you came for', () => {
    asPhone()
    const onSelect = renderPalette()
    fireEvent.click(screen.getByRole('button', { name: /Change material/ }))

    fireEvent.click(
      screen.getByRole('button', { name: new RegExp(MATERIALS[MaterialId.dirt].label) })
    )

    expect(onSelect).toHaveBeenCalledWith(MaterialId.dirt)
    expect(screen.queryByRole('dialog')).toBeNull()
  })

  it('opens the picker when a slot is set, since there is no grid to point at', () => {
    asPhone()
    renderPalette()

    fireEvent.click(screen.getByRole('button', { name: /Favourite 1/ }))

    expect(screen.getByRole('dialog')).toBeTruthy()
  })

  it('fills the slot with what was chosen in the sheet', () => {
    asPhone()
    renderPalette()
    fireEvent.click(screen.getByRole('button', { name: /Favourite 2/ }))

    // The sheet opens on the group holding the current brush, so the choice comes from Powders.
    fireEvent.click(
      screen.getByRole('button', { name: new RegExp(MATERIALS[MaterialId.ash].label) })
    )

    expect(
      screen.getByRole('button', { name: `Favourite 2, ${MATERIALS[MaterialId.ash].label}` })
    ).toBeTruthy()
  })

  it('lets go of a waiting slot when the sheet is dismissed without a pick', () => {
    asPhone()
    const onSelect = renderPalette()

    // Arm Favourite 1, then leave the sheet without choosing anything.
    fireEvent.click(screen.getByRole('button', { name: /Favourite 1/ }))
    fireEvent.click(screen.getByRole('button', { name: simCopy.picker.close }))

    // Reopen to change the brush alone and pick: the abandoned slot must not quietly take the pick.
    fireEvent.click(screen.getByRole('button', { name: /Change material/ }))
    fireEvent.click(
      screen.getByRole('button', { name: new RegExp(MATERIALS[MaterialId.dirt].label) })
    )

    expect(onSelect).toHaveBeenCalledWith(MaterialId.dirt)
    expect(
      screen.queryByRole('button', { name: `Favourite 1, ${MATERIALS[MaterialId.dirt].label}` })
    ).toBeNull()
  })

  it('keeps the grid inline where there is room for it', () => {
    asPhone(false)
    renderPalette()

    expect(screen.getByLabelText('Material group')).toBeTruthy()
    expect(screen.queryByRole('button', { name: /Change material/ })).toBeNull()
  })
})

describe('the material sheet holds its shape', () => {
  function asPhone() {
    vi.stubGlobal('matchMedia', (query: string) => ({
      matches: true,
      media: query,
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
    }))
  }

  afterEach(() => {
    vi.unstubAllGlobals()
    cleanup()
  })

  it('reserves room for the largest group whichever group is open', () => {
    // Sized to its contents, the sheet shrank when you switched from Solids to Grains and moved Done out
    // from under your thumb. The reserved class is what keeps one height across every group.
    asPhone()
    renderPalette()
    fireEvent.click(screen.getByRole('button', { name: /Change material/ }))
    const grid = screen.getByRole('dialog').querySelector('[class*=swatchRoom]')
    expect(grid).not.toBeNull()

    const smallest = MATERIAL_GROUPS.reduce((fewest, group) =>
      group.materials.length < fewest.materials.length ? group : fewest
    )
    fireEvent.click(screen.getByRole('button', { name: smallest.label }))

    // Same element, same reserved height — only its contents changed.
    expect(screen.getByRole('dialog').querySelector('[class*=swatchRoom]')).toBe(grid)
  })

  it('keeps the reserved room out of the inline palette, which has the page to grow into', () => {
    vi.stubGlobal('matchMedia', (query: string) => ({
      matches: false,
      media: query,
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
    }))
    const { container } = render(<Palette selected={MaterialId.sand} onSelect={vi.fn()} />)

    expect(container.querySelector('[class*=swatchRoom]')).toBeNull()
  })
})
