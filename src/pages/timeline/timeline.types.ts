import { Achievement, Education, Experience } from '../../data/data.types'

export type TimelineItemType = 'experience' | 'education' | 'achievement'

export type TimelineItem = {
  id: string
  type: TimelineItemType
  title: string
  subtitle: string
  date: Date
  endDate: Date | null
  link?: string
  targetPage: string
  anchor: string
}

export type TimelineData = {
  experience: Experience[]
  education: Education[]
  achievements: Achievement[]
}

export type TimelineFilters = {
  experience: boolean
  education: boolean
  achievement: boolean
}
