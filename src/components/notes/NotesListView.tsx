import { useMemo, useState } from 'react'
import { ChevronDown } from 'lucide-react'
import { NoteCard } from './NoteCard'
import { TrashNoteCard } from './TrashNoteCard'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Skeleton } from '@/components/ui/skeleton'
import { useNotes, useSearchNotes, useTrashNotes } from '@/hooks/useNotes'
import { useFoldersFlat } from '@/hooks/useFolders'
import { groupNotesByDate, getGroupOrder, getGroupLabel } from '@/lib/dateUtils'
import { cn } from '@/lib/utils'

interface NotesListViewProps {
  folderId?: string | null
  selectedNoteId: string | null
  onNoteSelect: (id: string) => void
  searchQuery?: string
  isTrashView?: boolean
}

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
  const { data: folders } = useFoldersFlat()

  // Track collapsed sections
  const [collapsedSections, setCollapsedSections] = useState<Set<string>>(new Set())

  const notes = isTrashView ? trashNotes : (isSearching ? searchResults : folderNotes)
  const isLoading = isTrashView ? isTrashLoading : (isSearching ? isSearchLoading : isFolderLoading)

  // Create a map of folder_id to color for quick lookup
  const folderColorMap = useMemo(() => {
    if (!folders) return new Map<string, string>()
    return new Map(folders.filter(f => f.color).map(f => [f.id, f.color!]))
  }, [folders])

  // Only show folder colors in "All Notes" view (folderId is undefined/null) or when searching
  const showFolderColors = folderId === undefined || folderId === null || isSearching

  const toggleSection = (group: string) => {
    setCollapsedSections(prev => {
      const next = new Set(prev)
      if (next.has(group)) {
        next.delete(group)
      } else {
        next.add(group)
      }
      return next
    })
  }

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
  const groupOrder = getGroupOrder(grouped)

  return (
    <ScrollArea className="h-full">
      <div className="py-1">
        {groupOrder.map((group) => {
          const groupNotes = grouped[group]
          if (!groupNotes || groupNotes.length === 0) return null

          const isCollapsed = collapsedSections.has(group)
          const label = getGroupLabel(group)

          return (
            <div key={group} className="mb-2">
              {/* Section Header - Apple Notes style */}
              <button
                onClick={() => toggleSection(group)}
                className="w-full flex items-center justify-between px-4 py-2 hover:bg-accent/50 transition-colors"
              >
                <span className="text-[17px] font-semibold text-foreground">
                  {label}
                </span>
                <ChevronDown
                  className={cn(
                    'h-5 w-5 text-muted-foreground transition-transform duration-200',
                    isCollapsed && '-rotate-90'
                  )}
                />
              </button>

              {/* Section Divider */}
              <div className="mx-4 border-b border-border" />

              {/* Notes List */}
              {!isCollapsed && (
                <div className="space-y-2 pt-2 pb-1">
                  {groupNotes.map((note) => (
                    <div key={note.id} className="px-4">
                      <NoteCard
                        note={note}
                        isSelected={note.id === selectedNoteId}
                        onClick={() => onNoteSelect(note.id)}
                        folderColor={showFolderColors && note.folder_id ? folderColorMap.get(note.folder_id) : undefined}
                      />
                    </div>
                  ))}
                </div>
              )}
            </div>
          )
        })}
      </div>
    </ScrollArea>
  )
}
