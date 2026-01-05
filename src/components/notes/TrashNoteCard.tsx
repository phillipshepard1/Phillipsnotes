import { useState } from 'react'
import { MoreHorizontal, Trash2, RotateCcw } from 'lucide-react'
import { format, parseISO } from 'date-fns'
import { cn } from '@/lib/utils'
import { DropdownMenu, DropdownMenuTrigger, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator } from '@/components/ui/dropdown-menu'
import { SwipeableCard } from '@/components/ui/SwipeableCard'
import { ConfirmDialog } from '@/components/ui/confirm-dialog'
import { useRestoreNote, usePermanentlyDeleteNote } from '@/hooks/useNotes'
import type { NotePreview } from '@/lib/types'

interface TrashNoteCardProps {
  note: NotePreview
  isSelected: boolean
  onClick: () => void
}

export function TrashNoteCard({ note, isSelected, onClick }: TrashNoteCardProps) {
  const formattedDate = formatDeletedDate(note.updated_at)
  const [showDeleteDialog, setShowDeleteDialog] = useState(false)
  const restoreNote = useRestoreNote()
  const permanentlyDeleteNote = usePermanentlyDeleteNote()

  const handleRestore = async () => {
    try {
      await restoreNote.mutateAsync(note.id)
    } catch (error) {
      console.error('Failed to restore note:', error)
    }
  }

  const handlePermanentDelete = async () => {
    try {
      await permanentlyDeleteNote.mutateAsync(note.id)
      setShowDeleteDialog(false)
    } catch (error) {
      console.error('Failed to permanently delete note:', error)
    }
  }

  const handleSwipeDelete = () => {
    setShowDeleteDialog(true)
  }

  return (
    <>
      <SwipeableCard onDelete={handleSwipeDelete} showMove={false}>
        <div
          onClick={onClick}
          className={cn(
            'w-full text-left px-4 py-3.5 transition-colors cursor-pointer',
            'border border-border/50',
            'hover:bg-accent/50 group',
            isSelected && 'bg-destructive/10 border-destructive/30'
          )}
        >
        {/* Title row with date */}
        <div className="flex items-center justify-between gap-3">
          <h3 className={cn(
            'text-[17px] font-semibold truncate flex-1',
            !note.title && 'text-muted-foreground italic'
          )}>
            {note.title || 'New Note'}
          </h3>
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
                <DropdownMenuItem onClick={handleRestore}>
                  <RotateCcw className="h-4 w-4" />
                  Restore note
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem
                  variant="destructive"
                  onClick={() => setShowDeleteDialog(true)}
                >
                  <Trash2 className="h-4 w-4" />
                  Delete forever
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
      </SwipeableCard>

      <ConfirmDialog
        open={showDeleteDialog}
        onOpenChange={setShowDeleteDialog}
        title="Delete Forever"
        description={`Are you sure you want to permanently delete "${note.title || 'New Note'}"? This action cannot be undone.`}
        confirmLabel="Delete Forever"
        variant="destructive"
        onConfirm={handlePermanentDelete}
        isLoading={permanentlyDeleteNote.isPending}
      />
    </>
  )
}

function formatDeletedDate(dateStr: string): string {
  const date = parseISO(dateStr)
  const now = new Date()
  const diffMs = now.getTime() - date.getTime()
  const diffDays = Math.floor(diffMs / 86400000)

  if (diffDays < 1) return 'Today'
  if (diffDays < 7) return `${diffDays}d ago`
  return format(date, 'MMM d')
}
