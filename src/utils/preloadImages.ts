// Preload images so that they get cached before they are displayed
export function preloadImages(imagePaths: string[]): void {
  imagePaths.forEach((path) => {
    const img = new Image()
    img.src = path
  })
}
