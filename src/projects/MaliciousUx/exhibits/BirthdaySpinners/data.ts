export const FIRST_YEAR = 1700
export const LAST_YEAR = 2300

export const copy = {
  legend: 'Date of birth',
  hint: 'Required to confirm you are old enough to read a recipe.',
  day: 'Day',
  month: 'Month',
  year: 'Year',
  quiet: `Years start at ${FIRST_YEAR} and count up. Scroll.`,
  chosen: (day: string, month: string, year: string, scrolled: number) =>
    `${day} ${month} ${year}, after scrolling past ${scrolled} ${scrolled === 1 ? 'year' : 'years'}.`,
}
