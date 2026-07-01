// Builds a self-playing monochrome ASCII PDF from text frames. The animation
// runs in the PDF's built-in JavaScript engine (Acrobat JS, which Chrome's
// PDFium and recent Firefox ship): a read-only multiline text field is the frame
// buffer, and app.setInterval swaps frames into it. Viewers without a JS engine
// (e.g. macOS Preview) show the first frame statically. Same trick as
// ading2210/doompdf.
//
// A bold monospace font is embedded so field text renders fixed-width in every
// viewer (Chrome renders base-14 Courier fine, but Firefox's pdf.js needs the
// real font). Without a font it falls back to base-14 Courier. Glyphs are still
// limited to WinAnsi (ASCII + Latin-1); the caller swaps block/shade ramps for
// an ASCII one (see isRampPdfSafe).
//
// Size: each cell is a 1-byte index into a glyph alphabet embedded once, and
// rows carry no separator (the player re-wraps by column count). A small decoder
// rebuilds each frame on demand.

// A zlib-deflated TrueType font (see mono-font-data.ts), embedded as /FontFile2.
export type EmbeddedFont = {
  length1: number // uncompressed TrueType byte length
  deflated: string // base64 of the zlib stream
}

export type AsciiPdfOptions = {
  cols: number
  rows: number
  // Playback rate; use the clip's effective sampled rate so it runs at real time.
  fps: number
  font?: EmbeddedFont
}

const FONT_SIZE = 10
const LINE_HEIGHT = FONT_SIZE * 1.15
const CHAR_WIDTH = FONT_SIZE * 0.6 // the font's advance is 600/1000 em
const MARGIN = 24

// Single-byte index chars: printable ASCII minus the two that need JS escaping
// (" and \). 92 slots — comfortably more than any ASCII ramp's distinct glyphs.
const INDEX_CHARS = (() => {
  let s = ''
  for (let c = 0x21; c <= 0x7e; c++) if (c !== 0x22 && c !== 0x5c) s += String.fromCharCode(c)
  return s
})()

// True when every glyph is in the font's WinAnsi range (<= U+00FF). Block/shade
// ramps fall outside and won't render, so the caller swaps them for an ASCII ramp.
export const isRampPdfSafe = (ramp: string) =>
  [...ramp].every((ch) => (ch.codePointAt(0) ?? 0) <= 0xff)

// Escape for a PDF literal string: (), backslash, and newline -> CR line break.
const pdfString = (text: string) =>
  text.replace(/\\/g, '\\\\').replace(/\(/g, '\\(').replace(/\)/g, '\\)').replace(/\n/g, '\\r')

// Escape for a double-quoted JS string literal, keeping the body pure ASCII so
// the PDF byte stream is unambiguous (non-ASCII glyphs become \uXXXX).
const jsString = (text: string) => {
  let out = '"'
  for (const ch of text) {
    const code = ch.codePointAt(0) ?? 0
    if (ch === '\\') out += '\\\\'
    else if (ch === '"') out += '\\"'
    else if (ch === '\n') out += '\\r'
    else if (code < 0x20 || code > 0x7e) out += '\\u' + code.toString(16).padStart(4, '0')
    else out += ch
  }
  return out + '"'
}

// Static first-frame value for JS-less viewers; only ASCII survives here.
const asciiSafe = (text: string) => text.replace(/[^\n\x20-\x7e]/g, '?')

const latin1Bytes = (text: string) => {
  const bytes = new Uint8Array(text.length)
  for (let i = 0; i < text.length; i++) bytes[i] = text.charCodeAt(i) & 0xff
  return bytes
}

const base64ToBytes = (b64: string) => {
  const bin = atob(b64)
  const bytes = new Uint8Array(bin.length)
  for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i)
  return bytes
}

// Builds the glyph alphabet across all frames and encodes each frame to a flat
// string of 1-byte index chars (newlines dropped; re-wrapped at play time).
function encodeFrames(frames: string[]): { alphabet: string; encoded: string[] } {
  const index = new Map<string, number>()
  let alphabet = ''
  for (const frame of frames) {
    for (const ch of frame) {
      if (ch === '\n') continue
      if (!index.has(ch)) {
        index.set(ch, alphabet.length)
        alphabet += ch
      }
    }
  }
  if (alphabet.length > INDEX_CHARS.length) {
    throw new Error(`ASCII PDF: ${alphabet.length} distinct glyphs exceeds the index alphabet`)
  }
  const encoded = frames.map((frame) => {
    let out = ''
    for (const ch of frame) {
      if (ch === '\n') continue
      out += INDEX_CHARS[index.get(ch)!]
    }
    return out
  })
  return { alphabet, encoded }
}

type Part = string | Uint8Array

export function buildAsciiPdf(frames: string[], { cols, rows, fps, font }: AsciiPdfOptions): Blob {
  const intervalMs = Math.max(1, Math.round(1000 / fps))
  const first = frames[0] ?? ''
  const { alphabet, encoded } = encodeFrames(frames)

  // The field must be a little larger than the text. If it's exactly text-width,
  // the viewer wraps each row's trailing cells (usually spaces) onto a new line —
  // showing a blank line between every row and occasionally spilling past the edge.
  const FIELD_SLACK = 16
  const w = Math.ceil(cols * CHAR_WIDTH) + FIELD_SLACK + MARGIN * 2
  const h = Math.ceil(rows * LINE_HEIGHT) + FIELD_SLACK + MARGIN * 2

  // Player: build a byte->glyph map once, decode each frame lazily (cached), and
  // re-insert a CR every `cols` chars to reform the rows.
  const boot =
    `var A = ${jsString(alphabet)};\n` +
    `var D = ${jsString(INDEX_CHARS)};\n` +
    `var C = ${cols};\n` +
    `var F = [\n${encoded.map(jsString).join(',\n')}\n];\n` +
    `var M = {}, cache = [], i = 0;\n` +
    `for (var j = 0; j < D.length; j++) M[D.charAt(j)] = A.charAt(j);\n` +
    `function _decode(s) {\n` +
    `  var o = "";\n` +
    `  for (var k = 0; k < s.length; k++) { if (k && k % C === 0) o += "\\r"; o += M[s.charAt(k)]; }\n` +
    `  return o;\n` +
    `}\n` +
    `function _show() {\n` +
    `  if (cache[i] == null) cache[i] = _decode(F[i]);\n` +
    `  getField("screen").value = cache[i];\n` +
    `}\n` +
    `_show();\n` +
    `if (F.length > 1) app.setInterval("i = (i + 1) % F.length; _show();", ${intervalMs});\n`

  const textStream = (code: string) => `<< /Length ${code.length} >>\nstream\n${code}\nendstream`
  const widths = Array(255 - 32 + 1)
    .fill(Math.round(CHAR_WIDTH * 100))
    .join(' ')

  // Object bodies as ordered parts (strings, or raw bytes for the font file).
  const objs: Part[][] = [
    // 1 catalog
    [`<< /Type /Catalog /Pages 2 0 R /AcroForm 6 0 R /Names 7 0 R >>`],
    // 2 pages
    [`<< /Type /Pages /Kids [3 0 R] /Count 1 >>`],
    // 3 page
    [
      `<< /Type /Page /Parent 2 0 R /MediaBox [0 0 ${w} ${h}]` +
        ` /Resources << /Font << /F0 5 0 R >> >> /Annots [4 0 R] >>`,
    ],
    // 4 screen field (multiline + readonly) — the frame buffer
    [
      `<< /Type /Annot /Subtype /Widget /FT /Tx /Ff 4097 /T (screen)` +
        ` /Rect [${MARGIN} ${MARGIN} ${w - MARGIN} ${h - MARGIN}]` +
        ` /DA (/F0 ${FONT_SIZE} Tf 0 g) /Q 0 /P 3 0 R /V (${pdfString(asciiSafe(first))}) >>`,
    ],
    // 5 font — embedded bold mono when supplied, else base-14 Courier
    [
      font
        ? `<< /Type /Font /Subtype /TrueType /BaseFont /ASCIIMono /FirstChar 32 /LastChar 255` +
          ` /Widths [${widths}] /FontDescriptor 11 0 R /Encoding /WinAnsiEncoding >>`
        : `<< /Type /Font /Subtype /Type1 /BaseFont /Courier /Encoding /WinAnsiEncoding >>`,
    ],
    // 6 acroform — /DR names /F0 so the field's /DA resolves to the mono font
    [
      `<< /Fields [4 0 R] /DA (/F0 ${FONT_SIZE} Tf 0 g)` +
        ` /DR << /Font << /F0 5 0 R >> >> /NeedAppearances true >>`,
    ],
    // 7 names -> javascript name tree
    [`<< /JavaScript 8 0 R >>`],
    // 8 javascript name tree (document-level JS, runs at open)
    [`<< /Names [(aaplay) 9 0 R] >>`],
    // 9 boot action
    [`<< /S /JavaScript /JS 10 0 R >>`],
    // 10 boot stream
    [textStream(boot)],
  ]

  if (font) {
    const fontBytes = base64ToBytes(font.deflated)
    // 11 font descriptor (FixedPitch + Nonsymbolic = 33)
    objs.push([
      `<< /Type /FontDescriptor /FontName /ASCIIMono /Flags 33` +
        ` /FontBBox [0 -220 600 820] /ItalicAngle 0 /Ascent 820 /Descent -220` +
        ` /CapHeight 700 /StemV 140 /FontFile2 12 0 R >>`,
    ])
    // 12 embedded TrueType program (zlib stream)
    objs.push([
      `<< /Length ${fontBytes.length} /Length1 ${font.length1} /Filter /FlateDecode >>\nstream\n`,
      fontBytes,
      `\nendstream`,
    ])
  }

  const chunks: Uint8Array[] = []
  let pos = 0
  const emit = (part: Part) => {
    const bytes = typeof part === 'string' ? latin1Bytes(part) : part
    chunks.push(bytes)
    pos += bytes.length
  }

  emit('%PDF-1.7\n%\xE2\xE3\xCF\xD3\n')
  const offsets: number[] = []
  for (let i = 0; i < objs.length; i++) {
    offsets[i] = pos
    emit(`${i + 1} 0 obj\n`)
    for (const part of objs[i]) emit(part)
    emit('\nendobj\n')
  }

  const xrefStart = pos
  const size = objs.length + 1
  let tail = `xref\n0 ${size}\n0000000000 65535 f \n`
  for (let i = 0; i < objs.length; i++) tail += `${String(offsets[i]).padStart(10, '0')} 00000 n \n`
  tail += `trailer\n<< /Size ${size} /Root 1 0 R >>\nstartxref\n${xrefStart}\n%%EOF\n`
  emit(tail)

  const out = new Uint8Array(pos)
  let offset = 0
  for (const chunk of chunks) {
    out.set(chunk, offset)
    offset += chunk.length
  }
  return new Blob([out], { type: 'application/pdf' })
}
