import { describe, it, expect, afterEach, vi } from 'vitest'
import { buildAsciiPdf, isRampPdfSafe } from './ascii-pdf'

// Byte-accurate view of the blob so xref offsets (byte counts) line up with
// string indices — a UTF-8 decode would collapse the binary marker bytes.
async function readBytes(blob: Blob): Promise<string> {
  const buf = new Uint8Array(await blob.arrayBuffer())
  let out = ''
  for (const b of buf) out += String.fromCharCode(b)
  return out
}

// The boot script, inflated when the stream is Flate-compressed.
async function bootScript(pdf: string): Promise<string> {
  const head = pdf.match(/10 0 obj\n<< \/Length (\d+)( \/Filter \/FlateDecode)? >>\nstream\n/)!
  const start = head.index! + head[0].length
  const body = Uint8Array.from(pdf.slice(start, start + Number(head[1])), (c) => c.charCodeAt(0))
  if (!head[2]) return String.fromCharCode(...body)
  const inflated = new Response(body).body!.pipeThrough(new DecompressionStream('deflate'))
  return new Response(inflated).text()
}

// Every xref entry must point at "<n> 0 obj".
function xrefResolves(pdf: string): boolean {
  const start = Number(pdf.slice(pdf.lastIndexOf('startxref') + 9).match(/\d+/)![0])
  const lines = pdf.slice(start).split('\n')
  const count = Number(lines[1].split(' ')[1])
  for (let i = 1; i < count; i++) {
    const off = Number(lines[2 + i].slice(0, 10))
    if (!pdf.slice(off, off + 20).startsWith(`${i} 0 obj`)) return false
  }
  return true
}

describe('buildAsciiPdf', () => {
  it('produces a valid PDF blob with resolvable xref offsets', async () => {
    const blob = await buildAsciiPdf(['AB\nCD', 'EF\nGH'], { cols: 2, rows: 2, fps: 10 })
    expect(blob.type).toBe('application/pdf')
    const pdf = await readBytes(blob)
    expect(pdf.startsWith('%PDF-1.7')).toBe(true)
    expect(pdf.trimEnd().endsWith('%%EOF')).toBe(true)
    expect(xrefResolves(pdf)).toBe(true)
  })

  it('embeds the glyph alphabet, column count, and a guarded animation loop', async () => {
    const blob = await buildAsciiPdf(['AB\nCD', 'EF\nGH'], { cols: 2, rows: 2, fps: 10 })
    const pdf = await bootScript(await readBytes(blob))
    expect(pdf).toContain('var A = "ABCDEFGH"') // distinct glyphs, embedded once
    expect(pdf).toContain('var C = 2') // column count for re-wrapping rows
    expect(pdf).toContain('getField("screen").value')
    // 1000 / 10 fps = 100ms, guarded so a single frame doesn't loop
    expect(pdf).toContain('if (F.length > 1) app.setInterval')
    expect(pdf).toContain('100)')
  })

  it('uses a bold monospace field font resolvable via the AcroForm /DR', async () => {
    const pdf = await readBytes(await buildAsciiPdf(['AB\nCD'], { cols: 2, rows: 2, fps: 10 }))
    expect(pdf).toContain('/BaseFont /Courier-Bold')
    expect(pdf).toContain('/DR << /Font << /F0 5 0 R >> >>')
  })

  it('stores a repeated multi-byte glyph once in the alphabet, not per cell', async () => {
    const pdf = await bootScript(
      await readBytes(await buildAsciiPdf(['██\n██'], { cols: 2, rows: 2, fps: 10 }))
    )
    // full block appears exactly once (in the alphabet), cells reference it by index
    expect(pdf.match(/2588/g)).toHaveLength(1)
  })

  it('renders a non-ASCII first frame as ? in the static /V fallback', async () => {
    const pdf = await readBytes(await buildAsciiPdf(['█'], { cols: 1, rows: 1, fps: 12 }))
    expect(pdf).toContain('/V (?)')
  })

  it('Flate-compresses the frame script far below its raw size', async () => {
    const cols = 80
    const rows = 40
    const frames = Array.from({ length: 60 }, (_, f) =>
      Array.from({ length: rows }, (_, r) =>
        Array.from({ length: cols }, (_, c) => ' .:-=+*#%@'[(r + c + f) % 10]).join('')
      ).join('\n')
    )
    const pdf = await readBytes(await buildAsciiPdf(frames, { cols, rows, fps: 12 }))
    expect(pdf).toContain('/Filter /FlateDecode')
    expect(xrefResolves(pdf)).toBe(true)
    expect(pdf.length).toBeLessThan((frames.length * cols * rows) / 10)
    expect(await bootScript(pdf)).toContain(`var C = ${cols}`)
  })

  describe('without CompressionStream', () => {
    afterEach(() => vi.unstubAllGlobals())

    it('writes the script stream raw, still a valid PDF', async () => {
      vi.stubGlobal('CompressionStream', undefined)
      const pdf = await readBytes(await buildAsciiPdf(['AB\nCD'], { cols: 2, rows: 2, fps: 10 }))
      expect(pdf).not.toContain('/FlateDecode')
      expect(xrefResolves(pdf)).toBe(true)
      expect(pdf).toContain('var A = "ABCD"')
    })
  })

  it('flags ramps Courier cannot draw', () => {
    expect(isRampPdfSafe('@%#*+=-:. ')).toBe(true)
    expect(isRampPdfSafe('$NM@B8&#%§ZXI±+^,-. ')).toBe(true) // classic: § ± are Latin-1
    expect(isRampPdfSafe('█▓▒░ ')).toBe(false) // block elements are outside WinAnsi
  })
})
