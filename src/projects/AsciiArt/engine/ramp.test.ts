import { describe, it, expect } from 'vitest'
import { brightnessToChar } from './ramp'
import { Charset } from '../data'

// The classic ramp has 20 chars, so each covers ceil(256/20) = 13 brightness
// levels — the same bucketing as the Python tool.
const classic = Charset.classic

describe('brightnessToChar', () => {
  it('maps the darkest pixels to the first ramp char and brightest to the last', () => {
    expect(brightnessToChar(0, classic)).toBe(classic[0])
    expect(brightnessToChar(255, classic)).toBe(classic[classic.length - 1])
  })

  it('buckets at the 13-level threshold boundaries', () => {
    expect(brightnessToChar(12, classic)).toBe(classic[0])
    expect(brightnessToChar(13, classic)).toBe(classic[1])
    expect(brightnessToChar(25, classic)).toBe(classic[1])
    expect(brightnessToChar(26, classic)).toBe(classic[2])
  })

  it('flips dark and light when inverted', () => {
    expect(brightnessToChar(0, classic, true)).toBe(brightnessToChar(255, classic))
    expect(brightnessToChar(255, classic, true)).toBe(brightnessToChar(0, classic))
  })

  it('maps the endpoints for every ramp length', () => {
    for (const ramp of Object.values(Charset)) {
      expect(brightnessToChar(0, ramp)).toBe(ramp[0])
      expect(brightnessToChar(255, ramp)).toBe(ramp[ramp.length - 1])
    }
  })

  it('buckets at each ramp length-specific threshold', () => {
    // blocks: 5 chars -> ceil(256/5) = 52 levels per char
    expect(brightnessToChar(51, Charset.blocks)).toBe(Charset.blocks[0])
    expect(brightnessToChar(52, Charset.blocks)).toBe(Charset.blocks[1])
    // simple: 10 chars -> ceil(256/10) = 26 levels per char
    expect(brightnessToChar(25, Charset.simple)).toBe(Charset.simple[0])
    expect(brightnessToChar(26, Charset.simple)).toBe(Charset.simple[1])
  })

  it('returns a blank for an empty ramp instead of undefined', () => {
    expect(brightnessToChar(128, '')).toBe(' ')
  })
})
