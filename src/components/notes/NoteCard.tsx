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
          'w-full text-left px-4 py-3.5 rounded-xl transition-colors cursor-pointer',
          'border border-border/50 bg-card',
          'hover:bg-accent/50 group',
          isSelected && 'bg-primary/10 border-primary/30'
        )}
      >
        {/* Title row with date */}
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-2 flex-1 min-w-0">
            {note.is_pinned && (
              <Pin className="h-4 w-4 text-orange-500 flex-shrink-0" />
            )}
            <h3 className={cn(
              'text-[17px] font-semibold truncate',
              !note.title && 'text-muted-foreground italic'
            )}>
              {note.title || 'New Note'}
            </h3>
          </div>
          <div className="flex items-center gap-1 flex-shrink-0">
            <span className="text-sm text-muted-foreground">{formattedDate}</span>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button
                  className={cn(
                    'p-1.5 rounded-lg hover:bg-accent transition-colors',
                    'opacity-0 group-hover:opacity-100',
                    isSelected && 'opacity-100'
                  )}
                  onClick={(e) => e.stopPropagation()}
                >
                  <MoreHorizontal className="h-5 w-5 text-muted-foreground" />
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
        {/* Preview text */}
        {note.preview && (
          <p className="text-[15px] text-muted-foreground mt-1.5 line-clamp-2 leading-snug">
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
        description={`Move "${note.title || 'New Note'}" to trash? You can restore it from the Trash folder.`}
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
