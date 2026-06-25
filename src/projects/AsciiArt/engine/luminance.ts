// Rec. 601 luma — the same transform as Pillow's `image.convert('L')`, so the
// browser output matches the original Python tool.
export const luminance = (r: number, g: number, b: number): number =>
  Math.round((r * 299 + g * 587 + b * 114) / 1000)
