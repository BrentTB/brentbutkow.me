import { Achievement, Education, Experience } from '../../data/data.types'
import { TimelineItem } from './timeline.types'

export function experienceToTimelineItem(exp: Experience, index: number): TimelineItem {
  return {
    id: `experience-${index}`,
    type: 'experience',
    title: exp.role,
    subtitle: exp.company,
    date: exp.startDate,
    endDate: exp.endDate,
    targetPage: '/experience',
    anchor: `experience-${index}`,
  }
}

export function educationToTimelineItem(edu: Education, index: number): TimelineItem {
  return {
    id: `education-${index}`,
    type: 'education',
    title: edu.degree,
    subtitle: edu.institution,
    date: edu.startDate,
    endDate: edu.endDate,
    link: edu.link,
    targetPage: '/education',
    anchor: `education-${index}`,
  }
}

export function achievementToTimelineItem(ach: Achievement, index: number): TimelineItem {
  return {
    id: `achievement-${index}`,
    type: 'achievement',
    title: ach.title,
    subtitle: ach.description || '',
    date: new Date(ach.year, 0, 1),
    endDate: null,
    link: ach.link,
    targetPage: '/achievements',
    anchor: `achievement-${index}`,
  }
}

export function sortTimelineItems(items: TimelineItem[]): TimelineItem[] {
  return items.sort((a, b) => {
    const dateA = a.endDate || a.date
    const dateB = b.endDate || b.date
    return dateB.getTime() - dateA.getTime()
  })
}

export function filterTimelineItems(
  items: TimelineItem[],
  filters: { experience: boolean; education: boolean; achievement: boolean },
  startDate: Date | null,
  endDate: Date | null
): TimelineItem[] {
  return items.filter((item) => {
    if (!filters[item.type]) return false

    const itemDate = item.endDate || item.date
    if (startDate && itemDate < startDate) return false
    if (endDate && item.date > endDate) return false

    return true
  })
}
