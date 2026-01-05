import { isToday, isYesterday, isWithinInterval, subDays, parseISO, getYear } from 'date-fns'
import type { NotePreview } from './types'

export type DateGroup = 'pinned' | 'today' | 'yesterday' | 'previous7Days' | 'previous30Days' | string

export interface GroupedNotesWithYears {
  pinned: NotePreview[]
  today: NotePreview[]
  yesterday: NotePreview[]
  previous7Days: NotePreview[]
  previous30Days: NotePreview[]
  // Year-based groups for older notes (e.g., '2025', '2024')
  [year: string]: NotePreview[]
}

export function getDateGroup(dateStr: string): DateGroup {
  const date = parseISO(dateStr)
  const now = new Date()

  if (isToday(date)) return 'today'
  if (isYesterday(date)) return 'yesterday'

  if (isWithinInterval(date, {
    start: subDays(now, 7),
    end: subDays(now, 2)
  })) {
    return 'previous7Days'
  }

  if (isWithinInterval(date, {
    start: subDays(now, 30),
    end: subDays(now, 8)
  })) {
    return 'previous30Days'
  }

  // Return year for older notes
  return getYear(date).toString()
}

export function groupNotesByDate(notes: NotePreview[]): GroupedNotesWithYears {
  const grouped: GroupedNotesWithYears = {
    pinned: [],
    today: [],
    yesterday: [],
    previous7Days: [],
    previous30Days: [],
  }

  for (const note of notes) {
    if (note.is_pinned) {
      grouped.pinned.push(note)
    } else {
      const group = getDateGroup(note.updated_at)
      if (!grouped[group]) {
        grouped[group] = []
      }
      grouped[group].push(note)
    }
  }

  return grouped
}

// Get ordered list of groups (fixed groups first, then years descending)
export function getGroupOrder(grouped: GroupedNotesWithYears): string[] {
  const fixedGroups = ['pinned', 'today', 'yesterday', 'previous7Days', 'previous30Days']
  const yearGroups = Object.keys(grouped)
    .filter(key => !fixedGroups.includes(key) && grouped[key].length > 0)
    .sort((a, b) => parseInt(b) - parseInt(a)) // Sort years descending

  return [...fixedGroups, ...yearGroups]
}

export function getGroupLabel(group: string): string {
  const labels: Record<string, string> = {
    pinned: 'Pinned',
    today: 'Today',
    yesterday: 'Yesterday',
    previous7Days: 'Previous 7 Days',
    previous30Days: 'Previous 30 Days',
  }

  // If it's a year, return the year as label
  if (/^\d{4}$/.test(group)) {
    return group
  }

  return labels[group] || group
}
