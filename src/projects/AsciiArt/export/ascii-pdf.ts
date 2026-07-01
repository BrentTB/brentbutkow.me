// Builds a self-playing monochrome ASCII PDF from text frames. The animation
// runs in the PDF's built-in JavaScript engine (Acrobat JS, which Chrome's
// PDFium ships): a read-only multiline text field is the frame buffer, and
// app.setInterval swaps frames into it. Viewers without a JS engine (e.g. macOS
// Preview) show the first frame statically. Same trick as ading2210/doompdf.
//
// The field uses base-14 Courier-Bold — fixed-width, and the bold weight reads
// darker. It renders in PDFium and Adobe Acrobat; Firefox's pdf.js draws form
// fields with its own (proportional) font, so it's flagged as Chrome-first in the
// export dialog. Glyphs are limited to WinAnsi (ASCII + Latin-1); the caller swaps
// block/shade ramps for an ASCII one (see isRampPdfSafe).
//
// Size: each cell is a 1-byte index into a glyph alphabet embedded once, and rows
// carry no separator (the player re-wraps by column count). A small decoder
// rebuilds each frame on demand.

export type AsciiPdfOptions = {
  cols: number
  rows: number
  // Playback rate; use the clip's effective sampled rate so it runs at real time.
  fps: number
}

const FONT_SIZE = 10
const LINE_HEIGHT = FONT_SIZE * 1.15
const CHAR_WIDTH = FONT_SIZE * 0.6 // Courier advance is 600/1000 em
const MARGIN = 24

const enc = new TextEncoder()
const byteLen = (text: string) => enc.encode(text).length

// Single-byte index chars: printable ASCII minus the two that need JS escaping
// (" and \). 92 slots — comfortably more than any ASCII ramp's distinct glyphs.
const INDEX_CHARS = (() => {
  let s = ''
  for (let c = 0x21; c <= 0x7e; c++) if (c !== 0x22 && c !== 0x5c) s += String.fromCharCode(c)
  return s
})()

// True when every glyph is in Courier's WinAnsi range (<= U+00FF). Block/shade
// ramps fall outside and won't render, so the caller swaps them for an ASCII ramp.
export const isRampPdfSafe = (ramp: string) =>
  [...ramp].every((ch) => (ch.codePointAt(0) ?? 0) <= 0xff)

// Escape for a PDF literal string: (), backslash, and newline -> CR line break.
const pdfString = (text: string) =>
  text
    .replace(/\\/g, '\\\\')
    .replace(/\(/g, '\\(')
    .replace(/\)/g, '\\)')
    .replace(/\n/g, '\\r')

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

export function buildAsciiPdf(frames: string[], { cols, rows, fps }: AsciiPdfOptions): Blob {
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

  const stream = (code: string) => `<< /Length ${byteLen(code)} >>\nstream\n${code}\nendstream`

  const objs = [
    // 1 catalog
    `<< /Type /Catalog /Pages 2 0 R /AcroForm 6 0 R /Names 7 0 R >>`,
    // 2 pages
    `<< /Type /Pages /Kids [3 0 R] /Count 1 >>`,
    // 3 page
    `<< /Type /Page /Parent 2 0 R /MediaBox [0 0 ${w} ${h}]` +
      ` /Resources << /Font << /F0 5 0 R >> >> /Annots [4 0 R] >>`,
    // 4 screen field (multiline + readonly) — the frame buffer
    `<< /Type /Annot /Subtype /Widget /FT /Tx /Ff 4097 /T (screen)` +
      ` /Rect [${MARGIN} ${MARGIN} ${w - MARGIN} ${h - MARGIN}]` +
      ` /DA (/F0 ${FONT_SIZE} Tf 0 g) /Q 0 /P 3 0 R /V (${pdfString(asciiSafe(first))}) >>`,
    // 5 font — bold reads darker; base-14, no embedding needed
    `<< /Type /Font /Subtype /Type1 /BaseFont /Courier-Bold /Encoding /WinAnsiEncoding >>`,
    // 6 acroform — /DR names /F0 so the field's /DA resolves to Courier-Bold
    `<< /Fields [4 0 R] /DA (/F0 ${FONT_SIZE} Tf 0 g)` +
      ` /DR << /Font << /F0 5 0 R >> >> /NeedAppearances true >>`,
    // 7 names -> javascript name tree
    `<< /JavaScript 8 0 R >>`,
    // 8 javascript name tree (document-level JS, runs at open)
    `<< /Names [(aaplay) 9 0 R] >>`,
    // 9 boot action
    `<< /S /JavaScript /JS 10 0 R >>`,
    // 10 boot stream
    stream(boot),
  ]

  let pdf = '%PDF-1.7\n%\xE2\xE3\xCF\xD3\n'
  const offsets: number[] = []
  for (let i = 0; i < objs.length; i++) {
    offsets[i] = byteLen(pdf)
    pdf += `${i + 1} 0 obj\n${objs[i]}\nendobj\n`
  }

  const xrefStart = byteLen(pdf)
  const size = objs.length + 1
  pdf += `xref\n0 ${size}\n0000000000 65535 f \n`
  for (let i = 0; i < objs.length; i++) {
    pdf += `${String(offsets[i]).padStart(10, '0')} 00000 n \n`
  }
  pdf += `trailer\n<< /Size ${size} /Root 1 0 R >>\nstartxref\n${xrefStart}\n%%EOF\n`

  return new Blob([enc.encode(pdf)], { type: 'application/pdf' })
}
