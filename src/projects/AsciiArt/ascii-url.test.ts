import { describe, it, expect } from 'vitest'
import { parseAsciiParams, serializeAsciiParams } from './ascii-url'
import { AsciiOptions, CUSTOM_CHARSET, defaultOptions } from './data'
import { BackgroundMode, ColorMode, RenderMode, SourceOrigin } from './ascii-art.types'
import type { ShareSource } from './ascii-url'

const NO_SOURCE: ShareSource = { origin: SourceOrigin.none }

// Serialize then parse-and-merge should reproduce the original options exactly.
const roundTrip = (options: AsciiOptions, source: ShareSource = NO_SOURCE): AsciiOptions => {
  const params = new URLSearchParams(serializeAsciiParams(options, source))
  return { ...defaultOptions(options.colorMode), ...parseAsciiParams(params).options }
}

describe('ascii-url codec', () => {
  it('round-trips the default options', () => {
    const defaults = defaultOptions(ColorMode.grayscale)
    expect(roundTrip(defaults)).toEqual(defaults)
  })

  it('round-trips a fully customized look', () => {
    const custom: AsciiOptions = {
      colorMode: ColorMode.color,
      background: BackgroundMode.light,
      renderMode: RenderMode.edges,
      charset: CUSTOM_CHARSET,
      customRamp: '@#. ',
      rows: 96,
      invert: true,
      brightness: -40,
      contrast: 1.85,
      mirror: false,
    }
    expect(roundTrip(custom)).toEqual(custom)
  })

  it('keeps a stock link short — only colorMode plus the source', () => {
    const params = serializeAsciiParams(defaultOptions(ColorMode.grayscale), {
      origin: SourceOrigin.example,
    })
    expect(params).toEqual({ col: 'g', src: 'example' })
  })

  it('encodes the example and webcam as sources, and rejects a bogus src', () => {
    const opts = defaultOptions(ColorMode.grayscale)
    expect(serializeAsciiParams(opts, { origin: SourceOrigin.example }).src).toBe('example')
    expect(serializeAsciiParams(opts, { origin: SourceOrigin.webcam }).src).toBe('webcam')
    expect(parseAsciiParams(new URLSearchParams({ src: 'example' })).source).toEqual({
      origin: 'example',
    })
    expect(parseAsciiParams(new URLSearchParams({ src: 'bogus' })).source).toEqual(NO_SOURCE)
  })

  it('omits any source param for an upload — a link cannot recreate it', () => {
    const params = serializeAsciiParams(defaultOptions(ColorMode.grayscale), {
      origin: SourceOrigin.upload,
    })
    expect(params.src).toBeUndefined()
  })

  it('emits the custom ramp only when the charset is custom', () => {
    const preset = { ...defaultOptions(ColorMode.grayscale), customRamp: '@. ' }
    expect(serializeAsciiParams(preset, NO_SOURCE).cr).toBeUndefined()
    const custom: AsciiOptions = { ...preset, charset: CUSTOM_CHARSET }
    expect(serializeAsciiParams(custom, NO_SOURCE).cr).toBe('@. ')
  })

  it('preserves special characters in a custom ramp through the URL', () => {
    const custom: AsciiOptions = {
      ...defaultOptions(ColorMode.grayscale),
      charset: CUSTOM_CHARSET,
      customRamp: '@%# +&/=',
    }
    expect(roundTrip(custom).customRamp).toBe('@%# +&/=')
  })

  it('clamps out-of-range numbers instead of trusting them', () => {
    const params = new URLSearchParams({ r: '9999', b: '-9999', ct: '99' })
    const { options } = parseAsciiParams(params)
    expect(options.rows).toBe(120)
    expect(options.brightness).toBe(-100)
    expect(options.contrast).toBe(2.5)
  })

  it('drops garbage enum and non-numeric values', () => {
    const params = new URLSearchParams({ col: 'x', bg: 'z', c: 'notacharset', r: 'abc', i: '2' })
    const { options } = parseAsciiParams(params)
    expect(options).toEqual({})
  })

  it('reads no source when the src param is absent', () => {
    expect(parseAsciiParams(new URLSearchParams()).source).toEqual(NO_SOURCE)
  })
})
