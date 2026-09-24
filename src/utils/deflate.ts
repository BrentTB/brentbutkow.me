// Compresses bytes with the platform's CompressionStream. 'deflate' is zlib-wrapped
// (what PDF's FlateDecode expects); 'deflate-raw' drops the header and checksum.
export async function deflate(
  bytes: Uint8Array<ArrayBuffer>,
  format: CompressionFormat
): Promise<Uint8Array<ArrayBuffer>> {
  const packed = await new Response(
    new Response(bytes).body!.pipeThrough(new CompressionStream(format))
  ).arrayBuffer()
  return new Uint8Array(packed)
}
