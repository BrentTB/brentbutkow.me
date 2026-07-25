import { describe, it, expect, afterEach } from 'vitest'
import { render, cleanup } from '@testing-library/react'
import { CellReading, MaterialId } from '../../pixel-world.types'
import { AMBIENT_TEMPERATURE, simCopy } from '../../data'
import { MATERIALS } from '../../engine/materials'
import { Reading } from './Reading'

function reading(overrides: Partial<CellReading> = {}): CellReading {
  return {
    material: MaterialId.sand,
    temperature: AMBIENT_TEMPERATURE,
    burning: false,
    ...overrides,
  }
}

/** The readout as a screen reader would run it together. */
function readout(cell: CellReading): string {
  return render(<Reading reading={cell} />).container.textContent ?? ''
}

afterEach(cleanup)

describe('Reading', () => {
  it('leads with the temperature, then what the cell is', () => {
    const text = readout(reading({ material: MaterialId.water, temperature: 42 }))

    expect(text.startsWith('42°C')).toBe(true)
    expect(text).toContain(MATERIALS[MaterialId.water].label)
  })

  it('calls empty space Air, since it still holds a temperature', () => {
    const text = readout(reading({ material: MaterialId.empty }))

    expect(text).toContain('Air')
    expect(text).not.toContain(MATERIALS[MaterialId.empty].label)
  })

  it('says what a source is producing', () => {
    const text = readout(reading({ material: MaterialId.source, producing: MaterialId.lava }))

    expect(text).toContain(`making ${MATERIALS[MaterialId.lava].label}`)
  })

  it('says a source is empty until something is fed to it', () => {
    const text = readout(reading({ material: MaterialId.source }))

    expect(text).toContain(`making ${simCopy.sourceEmpty}`)
  })

  it('flags a cell that is alight', () => {
    const text = readout(reading({ material: MaterialId.wood, burning: true }))

    expect(text).toContain(MATERIALS[MaterialId.wood].label)
    expect(text).toContain('on fire')
  })

  it('leaves the fire note off a cell that is not burning', () => {
    expect(readout(reading({ material: MaterialId.wood }))).not.toContain('on fire')
  })

  it('separates the temperature from the name with more than a CSS gap', () => {
    // Without a space in the text a screen reader runs the number straight into the material.
    const text = readout(reading({ material: MaterialId.stone, temperature: 20 }))

    expect(text).toContain(`20°C ${MATERIALS[MaterialId.stone].label}`)
  })
})
