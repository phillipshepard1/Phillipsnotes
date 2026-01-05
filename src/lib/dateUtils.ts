import { isToday, isYesterday, isWithinInterval, subDays, parseISO } from 'date-fns'
import type { NotePreview, GroupedNotes, DateGroup } from './types'

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

  return 'older'
}

export function groupNotesByDate(notes: NotePreview[]): GroupedNotes {
  const grouped: GroupedNotes = {
    pinned: [],
    today: [],
    yesterday: [],
    previous7Days: [],
    previous30Days: [],
    older: [],
  }

  for (const note of notes) {
    if (note.is_pinned) {
      grouped.pinned.push(note)
    } else {
      const group = getDateGroup(note.updated_at)
      grouped[group].push(note)
    }
  }

  return grouped
}

export const DATE_GROUP_LABELS: Record<DateGroup, string> = {
  pinned: 'Pinned',
  today: 'Today',
  yesterday: 'Yesterday',
  previous7Days: 'Previous 7 Days',
  previous30Days: 'Previous 30 Days',
  older: 'Older',
}
