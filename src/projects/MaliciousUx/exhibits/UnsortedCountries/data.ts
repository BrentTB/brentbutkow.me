import { pluralize } from '../../../../utils/pluralize'

export const copy = {
  label: 'Shipping country',
  hint: (count: number) =>
    `${pluralize(count, 'option', 'options')}, listed by reference code. Sorted by name length, then backwards.`,
  quiet: (first: string) => `Nothing chosen. First in the list is ${first}.`,
  chosen: (country: string, position: number, count: number) =>
    `${country}, option ${position} of ${count}.`,
  placeholder: 'Select a country',
}
