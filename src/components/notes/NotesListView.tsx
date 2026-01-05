import { NoteCard } from './NoteCard'
import { TrashNoteCard } from './TrashNoteCard'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Skeleton } from '@/components/ui/skeleton'
import { useNotes, useSearchNotes, useTrashNotes } from '@/hooks/useNotes'
import { groupNotesByDate, DATE_GROUP_LABELS } from '@/lib/dateUtils'
import type { DateGroup } from '@/lib/types'

interface NotesListViewProps {
  folderId?: string | null
  selectedNoteId: string | null
  onNoteSelect: (id: string) => void
  searchQuery?: string
  isTrashView?: boolean
}

const GROUP_ORDER: DateGroup[] = [
  'pinned',
  'today',
  'yesterday',
  'previous7Days',
  'previous30Days',
  'older',
]

export function NotesListView({
  folderId,
  selectedNoteId,
  onNoteSelect,
  searchQuery = '',
  isTrashView = false,
}: NotesListViewProps) {
  const isSearching = searchQuery.length >= 2
  const { data: folderNotes, isLoading: isFolderLoading } = useNotes(isSearching ? undefined : folderId)
  const { data: searchResults, isLoading: isSearchLoading } = useSearchNotes(searchQuery)
  const { data: trashNotes, isLoading: isTrashLoading } = useTrashNotes()

  const notes = isTrashView ? trashNotes : (isSearching ? searchResults : folderNotes)
  const isLoading = isTrashView ? isTrashLoading : (isSearching ? isSearchLoading : isFolderLoading)

  if (isLoading) {
    return (
      <div className="p-3 space-y-3">
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className="space-y-2">
            <Skeleton className="h-4 w-20" />
            <Skeleton className="h-16 w-full" />
          </div>
        ))}
      </div>
    )
  }

  if (!notes || notes.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-full p-8 text-center">
        <p className="text-muted-foreground text-sm">
          {isTrashView ? 'Trash is empty' : 'No notes yet'}
        </p>
        <p className="text-muted-foreground/70 text-xs mt-1">
          {isTrashView
            ? 'Deleted notes will appear here'
            : 'Create a new note to get started'}
        </p>
      </div>
    )
  }

  // For trash view, show simple list without date grouping
  if (isTrashView) {
    return (
      <ScrollArea className="h-full">
        <div className="px-4 py-3 space-y-2">
          {notes.map((note) => (
            <TrashNoteCard
              key={note.id}
              note={note}
              isSelected={note.id === selectedNoteId}
              onClick={() => onNoteSelect(note.id)}
            />
          ))}
        </div>
      </ScrollArea>
    )
  }

  const grouped = groupNotesByDate(notes)

  return (
    <ScrollArea className="h-full">
      <div className="px-4 py-3 space-y-6">
        {GROUP_ORDER.map((group) => {
          const groupNotes = grouped[group]
          if (groupNotes.length === 0) return null

          return (
            <div key={group}>
              <h3 className="text-[13px] font-semibold text-muted-foreground uppercase tracking-wide mb-3">
                {DATE_GROUP_LABELS[group]}
              </h3>
              <div className="space-y-2">
                {groupNotes.map((note) => (
                  <NoteCard
                    key={note.id}
                    note={note}
                    isSelected={note.id === selectedNoteId}
                    onClick={() => onNoteSelect(note.id)}
                  />
                ))}
              </div>
            </div>
          )
        })}
      </div>
    </ScrollArea>
  )
}
