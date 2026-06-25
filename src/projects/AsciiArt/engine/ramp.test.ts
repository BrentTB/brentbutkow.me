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
})
