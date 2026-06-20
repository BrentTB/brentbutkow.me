import { BreakdownList } from './Breakdowns'
import type { TopicOut } from '../recall.types'

type ThemesProps = {
  topics: TopicOut[]
  activeTopic: string
  onSelect: (topicId: string) => void
}

// The discovered themes as a clickable breakdown — a topic's label already IS its top terms
// ("listeria · deli · meat"). Clicking a theme filters the recalls + trend; clicking the active one
// clears it (BreakdownList's toggle behaviour).
export function Themes({ topics, activeTopic, onSelect }: ThemesProps) {
  const rows = topics.map((topic) => ({
    label: topic.label,
    value: String(topic.id),
    count: topic.size,
  }))
  return (
    <BreakdownList
      title="By theme"
      rows={rows}
      activeValue={activeTopic}
      onSelect={onSelect}
      maxRows={16}
    />
  )
}
