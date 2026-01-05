import { useState } from 'react'
import { Pin, MoreHorizontal, FolderInput, Trash2, Pin as PinIcon } from 'lucide-react'
import { format, parseISO } from 'date-fns'
import { cn } from '@/lib/utils'
import { DropdownMenu, DropdownMenuTrigger, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator } from '@/components/ui/dropdown-menu'
import { MoveNoteDialog } from './MoveNoteDialog'
import { ConfirmDialog } from '@/components/ui/confirm-dialog'
import { useDeleteNote, useTogglePinNote } from '@/hooks/useNotes'
import type { NotePreview } from '@/lib/types'

interface NoteCardProps {
  note: NotePreview
  isSelected: boolean
  onClick: () => void
}

export function NoteCard({ note, isSelected, onClick }: NoteCardProps) {
  const formattedDate = formatNoteDate(note.updated_at)
  const [showMoveDialog, setShowMoveDialog] = useState(false)
  const [showDeleteDialog, setShowDeleteDialog] = useState(false)
  const deleteNote = useDeleteNote()
  const togglePin = useTogglePinNote()

  const handleDelete = async () => {
    try {
      await deleteNote.mutateAsync(note.id)
      setShowDeleteDialog(false)
    } catch (error) {
      console.error('Failed to delete note:', error)
    }
  }

  const handleTogglePin = async () => {
    try {
      await togglePin.mutateAsync({ noteId: note.id, isPinned: !note.is_pinned })
    } catch (error) {
      console.error('Failed to toggle pin:', error)
    }
  }

  return (
    <>
      <div
        onClick={onClick}
        className={cn(
          'w-full text-left px-3 py-2.5 rounded-lg transition-colors cursor-pointer',
          'border border-transparent',
          'hover:bg-secondary group',
          isSelected && 'bg-primary/10 border-primary/20'
        )}
      >
        <div className="flex items-start justify-between gap-2">
          <h3 className={cn(
            'text-sm font-medium truncate flex-1',
            !note.title && 'text-muted-foreground italic'
          )}>
            {note.title || 'Untitled'}
          </h3>
          <div className="flex items-center gap-1 flex-shrink-0">
            {note.is_pinned && (
              <Pin className="h-3 w-3 text-orange-500" />
            )}
            <span className="text-xs text-muted-foreground">{formattedDate}</span>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button
                  className={cn(
                    'p-1 rounded hover:bg-accent transition-colors',
                    'opacity-0 group-hover:opacity-100',
                    isSelected && 'opacity-100'
                  )}
                  onClick={(e) => e.stopPropagation()}
                >
                  <MoreHorizontal className="h-4 w-4 text-muted-foreground" />
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent>
                <DropdownMenuItem onClick={handleTogglePin}>
                  <PinIcon className="h-4 w-4" />
                  {note.is_pinned ? 'Unpin' : 'Pin to top'}
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => setShowMoveDialog(true)}>
                  <FolderInput className="h-4 w-4" />
                  Move to folder
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem
                  variant="destructive"
                  onClick={() => setShowDeleteDialog(true)}
                >
                  <Trash2 className="h-4 w-4" />
                  Delete note
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
        {note.preview && (
          <p className="text-xs text-muted-foreground mt-1 line-clamp-2">
            {note.preview}
          </p>
        )}
      </div>

      <MoveNoteDialog
        open={showMoveDialog}
        onOpenChange={setShowMoveDialog}
        noteId={note.id}
        noteTitle={note.title}
        currentFolderId={note.folder_id}
      />

      <ConfirmDialog
        open={showDeleteDialog}
        onOpenChange={setShowDeleteDialog}
        title="Move to Trash"
        description={`Move "${note.title || 'Untitled'}" to trash? You can restore it from the Trash folder.`}
        confirmLabel="Move to Trash"
        variant="destructive"
        onConfirm={handleDelete}
        isLoading={deleteNote.isPending}
      />
    </>
  )
}

function formatNoteDate(dateStr: string): string {
  const date = parseISO(dateStr)
  const now = new Date()
  const diffMs = now.getTime() - date.getTime()
  const diffMins = Math.floor(diffMs / 60000)
  const diffHours = Math.floor(diffMs / 3600000)
  const diffDays = Math.floor(diffMs / 86400000)

  if (diffMins < 1) return 'Just now'
  if (diffMins < 60) return `${diffMins}m ago`
  if (diffHours < 24) return format(date, 'h:mm a')
  if (diffDays < 7) return format(date, 'EEEE')
  return format(date, 'MMM d')
}
