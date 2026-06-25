// Maps a 0-255 brightness to a ramp character. Replicates the Python tool's
// thresholding: each character covers ceil(256 / length) brightness levels,
// indexed from the start of the ramp. `invert` flips dark<->light without
// reversing the ramp string.
export function brightnessToChar(brightness: number, ramp: string, invert = false): string {
  const value = invert ? 255 - brightness : brightness
  const step = Math.ceil(256 / ramp.length)
  for (let i = 0; i < ramp.length; i++) {
    if (value < (i + 1) * step) return ramp[i]
  }
  return ramp[ramp.length - 1]
}
