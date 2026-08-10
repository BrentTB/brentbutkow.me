// `${count} <unit>` with the plural form picked by count: pluralize(2, 'company', 'companies') → '2 companies'.
export function pluralize(count: number, singular: string, plural: string): string {
  return `${count} ${count === 1 ? singular : plural}`
}
