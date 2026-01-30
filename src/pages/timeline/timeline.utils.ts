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

    // For date range filtering, check if the item's date range overlaps with the filter range
    const itemStart = item.date
    const itemEnd = item.endDate || item.date
    
    // If both filter dates are set, check for overlap
    if (startDate && endDate) {
      // Item overlaps if: item starts before filter ends AND item ends after filter starts
      return itemStart <= endDate && itemEnd >= startDate
    }
    
    // If only start date is set, include items that end on or after the start date
    if (startDate && itemEnd < startDate) return false
    
    // If only end date is set, include items that start on or before the end date
    if (endDate && itemStart > endDate) return false

    return true
  })
}
