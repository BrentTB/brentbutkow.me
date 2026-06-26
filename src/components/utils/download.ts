// Triggers a browser download for a blob, cleaning up the object URL afterward.
export function downloadBlob(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob)
  const anchor = document.createElement('a')
  anchor.href = url
  anchor.download = filename
  anchor.rel = 'noopener'
  document.body.appendChild(anchor)
  anchor.click()
  anchor.remove()
  // Revoke after the download has had a chance to start.
  setTimeout(() => URL.revokeObjectURL(url), 1000)
}
