import { BreakdownList } from './Breakdowns'
import type { TopicOut } from '../recall.types'

type ThemesProps = {
  topics: TopicOut[]
  activeTopic: string
  onSelect: (topicId: string) => void
}

// Show every theme — the NMF build yields at most 16.
const MAX_THEME_ROWS = 16

// Themes as a clickable breakdown — a topic's label already IS its top terms ("listeria · deli · meat").
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
      maxRows={MAX_THEME_ROWS}
    />
  )
}
