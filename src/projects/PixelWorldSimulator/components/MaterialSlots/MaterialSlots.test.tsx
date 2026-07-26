import { describe, it, expect, afterEach, vi } from 'vitest'
import { render, screen, cleanup, fireEvent } from '@testing-library/react'
import { MaterialId } from '../../pixel-world.types'
import { simCopy } from '../../data'
import { MATERIALS } from '../../engine/materials'
import { MaterialSlots } from './MaterialSlots'

function renderSlots(overrides: Partial<Parameters<typeof MaterialSlots>[0]> = {}) {
  const props = {
    slots: [null, null] as readonly (MaterialId | null)[],
    waiting: null,
    selected: MaterialId.sand,
    onUse: vi.fn(),
    onAssign: vi.fn(),
    ...overrides,
  }
  render(<MaterialSlots {...props} />)
  return props
}

afterEach(cleanup)

describe('MaterialSlots', () => {
  it('shows a slot for each material it can hold', () => {
    renderSlots()

    expect(screen.getAllByRole('button')).toHaveLength(2)
    expect(screen.getByRole('button', { name: /Favourite 1, empty/ })).toBeTruthy()
    expect(screen.getByRole('button', { name: /Favourite 2, empty/ })).toBeTruthy()
  })

  it('names what a filled slot holds, so the row can be told apart at a glance', () => {
    renderSlots({ slots: [MaterialId.stone, null] })

    const filled = screen.getByRole('button', {
      name: new RegExp(MATERIALS[MaterialId.stone].label),
    })
    expect(filled.textContent).toContain(MATERIALS[MaterialId.stone].label)
  })

  it('asks to be filled when an empty slot is pressed', () => {
    const props = renderSlots()

    fireEvent.click(screen.getByRole('button', { name: /Favourite 1, empty/ }))

    // Nothing to draw with yet, so the press can only mean "put something here".
    expect(props.onAssign).toHaveBeenCalledWith(0)
    expect(props.onUse).not.toHaveBeenCalled()
  })

  it('draws with a filled slot when it is pressed once', () => {
    const props = renderSlots({ slots: [MaterialId.stone, null] })

    fireEvent.click(
      screen.getByRole('button', { name: new RegExp(MATERIALS[MaterialId.stone].label) })
    )

    expect(props.onUse).toHaveBeenCalledWith(0)
    expect(props.onAssign).not.toHaveBeenCalled()
  })

  it('swaps what a filled slot holds when it is pressed twice', () => {
    const props = renderSlots({ slots: [MaterialId.stone, null] })

    // `detail` is the click count the browser reports, which is what separates a double press from two
    // single ones.
    fireEvent.click(
      screen.getByRole('button', { name: new RegExp(MATERIALS[MaterialId.stone].label) }),
      { detail: 2 }
    )

    expect(props.onAssign).toHaveBeenCalledWith(0)
  })

  it('swaps on a shift-press too, since a double press is out of reach from the keyboard', () => {
    const props = renderSlots({ slots: [MaterialId.stone, null] })

    fireEvent.click(
      screen.getByRole('button', { name: new RegExp(MATERIALS[MaterialId.stone].label) }),
      { shiftKey: true }
    )

    expect(props.onAssign).toHaveBeenCalledWith(0)
    expect(props.onUse).not.toHaveBeenCalled()
  })

  it('says which slot is waiting for a material', () => {
    renderSlots({ slots: [null, null], waiting: 1 })

    const slots = screen.getAllByRole('button')
    expect(slots[1].textContent).toContain(simCopy.slots.waiting)
    expect(slots[0].textContent).toContain(simCopy.slots.empty)
  })

  it('announces a waiting slot to a screen reader, not just an empty one', () => {
    renderSlots({ slots: [null, null], waiting: 1 })

    // The visible text swaps to "Pick one"; the accessible name has to move with it or the change is silent.
    expect(screen.getByRole('button', { name: /Favourite 2, waiting/ })).toBeTruthy()
  })

  it('leaves aria-pressed off an empty slot, which fills rather than toggles', () => {
    renderSlots()

    for (const slot of screen.getAllByRole('button')) {
      expect(slot.getAttribute('aria-pressed')).toBeNull()
    }
  })

  it('holds the eraser like any material, so a slot set to Erase draws with it', () => {
    const props = renderSlots({ slots: [MaterialId.empty, null] })

    // A slot holding MaterialId.empty (0) is a filled slot, not an empty one: it names the eraser and a
    // single press draws with it. Guards a future `!material` check treating the falsy 0 as empty.
    const erase = screen.getByRole('button', {
      name: new RegExp(MATERIALS[MaterialId.empty].label),
    })
    expect(erase.textContent).toContain(MATERIALS[MaterialId.empty].label)

    fireEvent.click(erase)
    expect(props.onUse).toHaveBeenCalledWith(0)
    expect(props.onAssign).not.toHaveBeenCalled()
  })

  it('marks the slot whose material is on the brush', () => {
    renderSlots({ slots: [MaterialId.stone, MaterialId.sand], selected: MaterialId.sand })

    const slots = screen.getAllByRole('button')
    expect(slots[0].getAttribute('aria-pressed')).toBe('false')
    expect(slots[1].getAttribute('aria-pressed')).toBe('true')
  })
})
