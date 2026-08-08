import { describe, expect, it } from 'vitest'
import { placards, wingCopy } from '../data'
import { ExhibitId, Wing } from '../malicious-ux.types'
import { accessionFor, exhibits, exhibitsInWing } from './registry'

const ids = Object.values(ExhibitId)
const wings = Object.values(Wing)

describe('exhibit registry', () => {
  it('shows every catalogued specimen', () => {
    expect(exhibits.map((exhibit) => exhibit.id).sort()).toEqual([...ids].sort())
  })

  it('gives each specimen a component and the placard that belongs to it', () => {
    for (const exhibit of exhibits) {
      expect(typeof exhibit.component).toBe('function')
      expect(exhibit.copy).toBe(placards[exhibit.id])
    }
  })

  it('lists each specimen once', () => {
    expect(new Set(exhibits.map((exhibit) => exhibit.id)).size).toBe(exhibits.length)
  })

  it('numbers the accessions in walking order, with no gaps', () => {
    exhibits.forEach((exhibit, index) => {
      expect(exhibit.accession).toBe(accessionFor(index))
    })
    expect(new Set(exhibits.map((exhibit) => exhibit.accession)).size).toBe(exhibits.length)
  })

  it('pads the code to three digits, so the wall labels line up', () => {
    expect(accessionFor(0)).toBe('DP-001')
    expect(accessionFor(15)).toBe('DP-016')
  })

  it('fills every wing, and every wing has a heading to fill', () => {
    for (const wing of wings) {
      expect(exhibitsInWing(wing).length).toBeGreaterThan(0)
      expect(wingCopy[wing]).toBeDefined()
    }
  })

  it('accounts for every specimen across the wings', () => {
    const walked = wings.flatMap((wing) => exhibitsInWing(wing))
    expect(walked).toHaveLength(exhibits.length)
  })

  it('gives every placard something to say', () => {
    for (const placard of Object.values(placards)) {
      expect(placard.name.length).toBeGreaterThan(0)
      expect(placard.crime.length).toBeGreaterThan(0)
      expect(placard.why.length).toBeGreaterThan(0)
      expect(placard.seenAt.length).toBeGreaterThan(0)
    }
  })
})
