export const copy = {
  label: 'Shipping country',
  hint: (count: number) =>
    `${count} options, listed by reference code. Sorted by name length, then backwards.`,
  quiet: (first: string) => `Nothing chosen. The list opens on ${first}.`,
  chosen: (country: string, position: number, count: number) =>
    `${country}, option ${position} of ${count}.`,
  placeholder: 'Select a country',
}
