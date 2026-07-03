import { describe, it, expect } from 'vitest'
import { STEAM_LOCOMOTIVE, cowsay } from './ascii'

describe('cowsay', () => {
  it('wraps the message in a bubble sized to the text, above the cow', () => {
    const lines = cowsay('hi').split('\n')
    expect(lines[0]).toBe(' ____')
    expect(lines[1]).toBe('< hi >')
    expect(lines[2]).toBe(' ----')
    expect(lines.some((line) => line.includes('^__^'))).toBe(true)
  })

  it('defaults to moo for blank input', () => {
    expect(cowsay('').split('\n')[1]).toBe('< moo >')
    expect(cowsay('   ').split('\n')[1]).toBe('< moo >')
  })

  it('caps long input so it cannot blow out the bubble', () => {
    expect(cowsay('a'.repeat(200)).split('\n')[1]).toBe(`< ${'a'.repeat(40)} >`)
  })
})

describe('STEAM_LOCOMOTIVE', () => {
  it('is a multi-line sprite', () => {
    expect(STEAM_LOCOMOTIVE.split('\n').length).toBeGreaterThan(4)
    expect(STEAM_LOCOMOTIVE).toContain('====')
  })
})
