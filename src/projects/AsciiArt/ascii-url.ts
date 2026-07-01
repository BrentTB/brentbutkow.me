import { BackgroundMode, ColorMode, RenderMode, SourceOrigin } from './ascii-art.types'
import {
  AsciiOptions,
  BRIGHTNESS_MAX,
  BRIGHTNESS_MIN,
  CONTRAST_MAX,
  CONTRAST_MIN,
  CUSTOM_CHARSET,
  Charset,
  CharsetSelection,
  MAX_ROWS,
  MIN_ROWS,
  defaultOptions,
} from './data'

// Compact query-param codec for the studio's visual state, so a rendered look
// (and its reproducible source) can be captured in a shareable link. The URL is
// untrusted input: every value is validated and every number clamped on parse.

// A source that can be recreated from a link: the built-in example or the
// webcam. Uploads are omitted — the recipient doesn't have the file.
export type ShareSource = { origin: SourceOrigin }

// Short param keys keep shared links legible.
const Key = {
  colorMode: 'col',
  background: 'bg',
  renderMode: 'rm',
  charset: 'c',
  customRamp: 'cr',
  rows: 'r',
  brightness: 'b',
  contrast: 'ct',
  invert: 'i',
  mirror: 'm',
  src: 'src',
} as const

const COLOR_CODES = { [ColorMode.grayscale]: 'g', [ColorMode.color]: 'c' } as const
const BG_CODES = { [BackgroundMode.dark]: 'd', [BackgroundMode.light]: 'l' } as const
const RENDER_CODES = { [RenderMode.normal]: 'n', [RenderMode.edges]: 'e' } as const

// Baseline for omission: only values differing from these get serialized, so a
// stock look yields a short URL. colorMode is emitted explicitly (below) because
// its live default is mode-dependent — encoding it always keeps links faithful.
const BASE = defaultOptions(ColorMode.grayscale)

const CHARSET_NAMES = Object.keys(Charset)
const isCharsetSelection = (value: string): value is CharsetSelection =>
  value === CUSTOM_CHARSET || CHARSET_NAMES.includes(value)

const decodeEnum = <T extends string>(codes: Record<T, string>, code: string | null): T | null => {
  if (code === null) return null
  const match = (Object.entries(codes) as [T, string][]).find(([, c]) => c === code)
  return match ? match[0] : null
}

const clampNumber = (raw: string | null, min: number, max: number): number | null => {
  if (raw === null) return null
  const n = Number(raw)
  if (!Number.isFinite(n)) return null
  return Math.min(max, Math.max(min, n))
}

const decodeBool = (raw: string | null): boolean | null =>
  raw === '1' ? true : raw === '0' ? false : null

export function serializeAsciiParams(
  options: AsciiOptions,
  source: ShareSource
): Record<string, string> {
  const params: Record<string, string> = {}
  params[Key.colorMode] = COLOR_CODES[options.colorMode]
  if (options.background !== BASE.background) params[Key.background] = BG_CODES[options.background]
  if (options.renderMode !== BASE.renderMode)
    params[Key.renderMode] = RENDER_CODES[options.renderMode]
  if (options.charset !== BASE.charset) params[Key.charset] = options.charset
  if (options.charset === CUSTOM_CHARSET) params[Key.customRamp] = options.customRamp
  if (options.rows !== BASE.rows) params[Key.rows] = String(options.rows)
  if (options.brightness !== BASE.brightness) params[Key.brightness] = String(options.brightness)
  if (options.contrast !== BASE.contrast) params[Key.contrast] = String(options.contrast)
  if (options.invert !== BASE.invert) params[Key.invert] = options.invert ? '1' : '0'
  if (options.mirror !== BASE.mirror) params[Key.mirror] = options.mirror ? '1' : '0'
  if (source.origin === SourceOrigin.example) params[Key.src] = SourceOrigin.example
  else if (source.origin === SourceOrigin.webcam) params[Key.src] = SourceOrigin.webcam
  return params
}

const parseSource = (params: URLSearchParams): ShareSource => {
  const src = params.get(Key.src)
  if (src === SourceOrigin.example) return { origin: SourceOrigin.example }
  if (src === SourceOrigin.webcam) return { origin: SourceOrigin.webcam }
  return { origin: SourceOrigin.none }
}

export function parseAsciiParams(params: URLSearchParams): {
  options: Partial<AsciiOptions>
  source: ShareSource
} {
  const options: Partial<AsciiOptions> = {}

  const colorMode = decodeEnum(COLOR_CODES, params.get(Key.colorMode))
  if (colorMode) options.colorMode = colorMode
  const background = decodeEnum(BG_CODES, params.get(Key.background))
  if (background) options.background = background
  const renderMode = decodeEnum(RENDER_CODES, params.get(Key.renderMode))
  if (renderMode) options.renderMode = renderMode

  const charset = params.get(Key.charset)
  if (charset !== null && isCharsetSelection(charset)) options.charset = charset
  const customRamp = params.get(Key.customRamp)
  if (customRamp !== null) options.customRamp = customRamp

  const rows = clampNumber(params.get(Key.rows), MIN_ROWS, MAX_ROWS)
  if (rows !== null) options.rows = Math.round(rows)
  const brightness = clampNumber(params.get(Key.brightness), BRIGHTNESS_MIN, BRIGHTNESS_MAX)
  if (brightness !== null) options.brightness = brightness
  const contrast = clampNumber(params.get(Key.contrast), CONTRAST_MIN, CONTRAST_MAX)
  if (contrast !== null) options.contrast = contrast

  const invert = decodeBool(params.get(Key.invert))
  if (invert !== null) options.invert = invert
  const mirror = decodeBool(params.get(Key.mirror))
  if (mirror !== null) options.mirror = mirror

  return { options, source: parseSource(params) }
}
