// Shared option shape for the inputs/ dropdowns (Select, Combobox).
// `count` (optional) shows a faceted match count beside the label; `disabled` greys an option out and
// makes it unselectable (used for facet options that would return zero under the current filters).
export type SelectOption = {
  value: string
  label: string
  count?: number
  disabled?: boolean
}
