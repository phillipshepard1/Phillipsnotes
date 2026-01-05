import { Plus, Trash2 } from 'lucide-react'
import { NotesListView } from '@/components/notes/NotesListView'
import { useCreateNote, useEmptyTrash, useTrashNotes } from '@/hooks/useNotes'
import { useFolder } from '@/hooks/useFolders'
import { ConfirmDialog } from '@/components/ui/confirm-dialog'
import { cn } from '@/lib/utils'
import { useState } from 'react'

interface NotesListProps {
  folderId: string | null
  selectedNoteId: string | null
  onNoteSelect: (id: string) => void
  searchQuery: string
  isTrashView?: boolean
}

export function NotesList({
  folderId,
  selectedNoteId,
  onNoteSelect,
  searchQuery,
  isTrashView = false,
}: NotesListProps) {
  const createNote = useCreateNote()
  const emptyTrash = useEmptyTrash()
  const { data: folder } = useFolder(folderId)
  const { data: trashNotes } = useTrashNotes()
  const [showEmptyTrashDialog, setShowEmptyTrashDialog] = useState(false)

  const handleCreateNote = async () => {
    try {
      const note = await createNote.mutateAsync({
        folder_id: folderId,
        title: '',
      })
      onNoteSelect(note.id)
    } catch (error) {
      console.error('Failed to create note:', error)
    }
  }

  const handleEmptyTrash = async () => {
    try {
      await emptyTrash.mutateAsync()
      setShowEmptyTrashDialog(false)
    } catch (error) {
      console.error('Failed to empty trash:', error)
    }
  }

  const folderName = folderId === null ? 'All Notes' : folder?.name || 'Notes'
  const headerTitle = isTrashView
    ? 'Trash'
    : searchQuery
      ? `Search: "${searchQuery}"`
      : folderName

  const trashCount = trashNotes?.length || 0

  return (
    <div className="h-full flex flex-col bg-background">
      {/* Header */}
      <div className="p-3 border-b border-border">
        <div className="flex items-center justify-between">
          <h2 className={cn(
            'font-semibold truncate',
            isTrashView ? 'text-destructive' : 'text-foreground'
          )}>
            {headerTitle}
          </h2>
          {isTrashView ? (
            trashCount > 0 && (
              <button
                onClick={() => setShowEmptyTrashDialog(true)}
                className={cn(
                  'p-1.5 rounded-md transition-colors',
                  'hover:bg-destructive/10 text-destructive',
                  'disabled:opacity-50'
                )}
                title="Empty trash"
              >
                <Trash2 className="h-5 w-5" />
              </button>
            )
          ) : (
            <button
              onClick={handleCreateNote}
              disabled={createNote.isPending}
              className={cn(
                'p-1.5 rounded-md transition-colors',
                'hover:bg-secondary',
                'disabled:opacity-50'
              )}
              title="New note"
            >
              <Plus className="h-5 w-5 text-muted-foreground" />
            </button>
          )}
        </div>
      </div>

      {/* Notes list */}
      <div className="flex-1 overflow-hidden">
        <NotesListView
          folderId={searchQuery ? undefined : folderId}
          selectedNoteId={selectedNoteId}
          onNoteSelect={onNoteSelect}
          searchQuery={searchQuery}
          isTrashView={isTrashView}
        />
      </div>

      {/* Empty Trash Dialog */}
      <ConfirmDialog
        open={showEmptyTrashDialog}
        onOpenChange={setShowEmptyTrashDialog}
        title="Empty Trash"
        description={`Are you sure you want to permanently delete all ${trashCount} note${trashCount === 1 ? '' : 's'} in trash? This action cannot be undone.`}
        confirmLabel="Empty Trash"
        variant="destructive"
        onConfirm={handleEmptyTrash}
        isLoading={emptyTrash.isPending}
      />
    </div>
  )
}
