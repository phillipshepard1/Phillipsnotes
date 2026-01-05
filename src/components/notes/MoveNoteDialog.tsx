import { useState } from 'react'
import { Folder, FolderOpen, FileText, Check } from 'lucide-react'
import { Dialog, DialogContent, DialogHeader, DialogBody, DialogFooter } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { ScrollArea } from '@/components/ui/scroll-area'
import { useFoldersFlat } from '@/hooks/useFolders'
import { useMoveNote } from '@/hooks/useNotes'
import { cn } from '@/lib/utils'
import type { Folder as FolderType } from '@/lib/types'

interface MoveNoteDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  noteId: string
  noteTitle: string
  currentFolderId: string | null
}

export function MoveNoteDialog({
  open,
  onOpenChange,
  noteId,
  noteTitle,
  currentFolderId,
}: MoveNoteDialogProps) {
  const { data: folders = [] } = useFoldersFlat()
  const moveNote = useMoveNote()
  const [selectedFolderId, setSelectedFolderId] = useState<string | null>(currentFolderId)

  const handleMove = async () => {
    if (selectedFolderId === currentFolderId) {
      onOpenChange(false)
      return
    }

    try {
      await moveNote.mutateAsync({ noteId, folderId: selectedFolderId })
      onOpenChange(false)
    } catch (error) {
      console.error('Failed to move note:', error)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader onClose={() => onOpenChange(false)}>
          Move Note
        </DialogHeader>
        <DialogBody>
          <p className="text-sm text-gray-500 mb-4">
            Move "<span className="font-medium text-gray-700">{noteTitle || 'New Note'}</span>" to:
          </p>
          <ScrollArea className="h-64 border border-gray-200 rounded-lg">
            <div className="p-2">
              {/* All Notes option (no folder) */}
              <button
                onClick={() => setSelectedFolderId(null)}
                className={cn(
                  'w-full flex items-center gap-2 px-3 py-2 rounded-md text-left',
                  'hover:bg-gray-100 transition-colors',
                  selectedFolderId === null && 'bg-blue-50 text-blue-600'
                )}
              >
                <FileText className="h-4 w-4 flex-shrink-0" />
                <span className="flex-1 truncate">All Notes (No Folder)</span>
                {selectedFolderId === null && (
                  <Check className="h-4 w-4 flex-shrink-0" />
                )}
              </button>

              {/* Folders */}
              {folders.map((folder: FolderType) => (
                <FolderOption
                  key={folder.id}
                  folder={folder}
                  selectedFolderId={selectedFolderId}
                  onSelect={setSelectedFolderId}
                  level={0}
                />
              ))}
            </div>
          </ScrollArea>
        </DialogBody>
        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
          >
            Cancel
          </Button>
          <Button
            onClick={handleMove}
            disabled={moveNote.isPending}
          >
            {moveNote.isPending ? 'Moving...' : 'Move'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

interface FolderOptionProps {
  folder: FolderType
  selectedFolderId: string | null
  onSelect: (id: string) => void
  level: number
}

function FolderOption({ folder, selectedFolderId, onSelect, level }: FolderOptionProps) {
  const isSelected = selectedFolderId === folder.id

  return (
    <button
      onClick={() => onSelect(folder.id)}
      className={cn(
        'w-full flex items-center gap-2 px-3 py-2 rounded-md text-left',
        'hover:bg-gray-100 transition-colors',
        isSelected && 'bg-blue-50 text-blue-600'
      )}
      style={{ paddingLeft: `${12 + level * 16}px` }}
    >
      {isSelected ? (
        <FolderOpen className="h-4 w-4 flex-shrink-0" />
      ) : (
        <Folder className="h-4 w-4 flex-shrink-0" />
      )}
      <span className="flex-1 truncate">{folder.name}</span>
      {isSelected && (
        <Check className="h-4 w-4 flex-shrink-0" />
      )}
    </button>
  )
}
