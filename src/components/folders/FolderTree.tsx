import { useState, useRef, useEffect } from 'react'
import { ChevronRight, Folder, FolderOpen, FileText, Plus, MoreHorizontal, Trash2, Pencil, Palette } from 'lucide-react'
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Skeleton } from '@/components/ui/skeleton'
import { DropdownMenu, DropdownMenuTrigger, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator } from '@/components/ui/dropdown-menu'
import { Dialog, DialogContent, DialogHeader } from '@/components/ui/dialog'
import { ConfirmDialog } from '@/components/ui/confirm-dialog'
import { FolderColorPicker } from '@/components/ui/FolderColorPicker'
import { useFolders, useCreateFolder, useDeleteFolder, useUpdateFolder } from '@/hooks/useFolders'
import { useMoveNote } from '@/hooks/useNotes'
import { useDragOptional } from '@/context/DragContext'
import { cn } from '@/lib/utils'
import type { FolderWithChildren } from '@/lib/types'

interface FolderTreeProps {
  selectedFolderId: string | undefined
  onFolderSelect: (id: string | undefined) => void
  isTrashSelected?: boolean
  onTrashSelect?: () => void
  onNoteMoved?: (message: string, type: 'success' | 'warning') => void
}

export function FolderTree({ selectedFolderId, onFolderSelect, isTrashSelected, onTrashSelect, onNoteMoved }: FolderTreeProps) {
  const { data: folders, isLoading } = useFolders()
  const createFolder = useCreateFolder()
  const moveNote = useMoveNote()
  const drag = useDragOptional()
  const allNotesRef = useRef<HTMLButtonElement>(null)
  const [isCreating, setIsCreating] = useState(false)
  const [newFolderName, setNewFolderName] = useState('')

  const isAllNotesDropTarget = drag?.hoveredDropZone === 'all-notes'

  // Register "All Notes" as drop zone
  useEffect(() => {
    if (!drag || !allNotesRef.current) return
    drag.registerDropZone('all-notes', allNotesRef.current)
    return () => drag.unregisterDropZone('all-notes')
  }, [drag])

  // Handle drop on "All Notes"
  const handleAllNotesMouseUp = async () => {
    if (!drag?.isDragging || !drag.draggedNote || !isAllNotesDropTarget) return

    const draggedNote = drag.draggedNote
    const currentFolderId = draggedNote.folder_id

    drag.endDrag()

    if (currentFolderId === null) {
      onNoteMoved?.('Already in "All Notes"', 'warning')
    } else {
      try {
        await moveNote.mutateAsync({ noteId: draggedNote.id, folderId: null })
        onNoteMoved?.('Removed from folder', 'success')
      } catch (error) {
        console.error('Failed to move note:', error)
      }
    }
  }

  const handleCreateFolder = async () => {
    if (!newFolderName.trim()) return
    try {
      await createFolder.mutateAsync({ name: newFolderName.trim() })
      setNewFolderName('')
      setIsCreating(false)
    } catch (error) {
      console.error('Failed to create folder:', error)
    }
  }

  if (isLoading) {
    return (
      <div className="p-3 space-y-2">
        <Skeleton className="h-7 w-full" />
        <Skeleton className="h-7 w-full" />
        <Skeleton className="h-7 w-3/4" />
      </div>
    )
  }

  return (
    <ScrollArea className="h-full">
      <div className="p-2 space-y-1">
        {/* All Notes */}
        <button
          ref={allNotesRef}
          onClick={() => onFolderSelect(undefined)}
          onMouseUp={handleAllNotesMouseUp}
          className={cn(
            'flex items-center gap-2 w-full px-3 py-2 rounded-lg text-[15px] transition-colors',
            'hover:bg-secondary',
            selectedFolderId === undefined && !isTrashSelected && 'bg-primary/10 text-primary',
            isAllNotesDropTarget && 'bg-primary/20 ring-2 ring-primary'
          )}
        >
          <FileText className="h-4 w-4" />
          <span>All Notes</span>
        </button>

        {/* Folder tree */}
        {folders?.map((folder) => (
          <FolderNode
            key={folder.id}
            folder={folder}
            selectedId={selectedFolderId}
            onSelect={onFolderSelect}
            level={0}
            onNoteMoved={onNoteMoved}
          />
        ))}

        {/* New folder input */}
        {isCreating ? (
          <div className="flex items-center gap-1 px-2">
            <Folder className="h-4 w-4 text-muted-foreground" />
            <input
              type="text"
              value={newFolderName}
              onChange={(e) => setNewFolderName(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') handleCreateFolder()
                if (e.key === 'Escape') {
                  setIsCreating(false)
                  setNewFolderName('')
                }
              }}
              onBlur={() => {
                if (!newFolderName.trim()) {
                  setIsCreating(false)
                }
              }}
              className="flex-1 text-sm px-1 py-0.5 border border-border rounded bg-background focus:outline-none focus:ring-1 focus:ring-primary"
              placeholder="Folder name"
              autoFocus
            />
          </div>
        ) : (
          <button
            onClick={() => setIsCreating(true)}
            className="flex items-center gap-2 w-full px-3 py-2 rounded-lg text-[15px] text-muted-foreground hover:bg-secondary hover:text-foreground transition-colors"
          >
            <Plus className="h-4 w-4" />
            <span>New Folder</span>
          </button>
        )}

        {/* Divider */}
        <div className="my-2 border-t border-border" />

        {/* Trash */}
        {onTrashSelect && (
          <button
            onClick={onTrashSelect}
            className={cn(
              'flex items-center gap-2 w-full px-3 py-2 rounded-lg text-[15px] transition-colors',
              'hover:bg-secondary',
              isTrashSelected && 'bg-destructive/10 text-destructive'
            )}
          >
            <Trash2 className="h-4 w-4" />
            <span>Trash</span>
          </button>
        )}
      </div>
    </ScrollArea>
  )
}

interface FolderNodeProps {
  folder: FolderWithChildren
  selectedId: string | undefined
  onSelect: (id: string | undefined) => void
  level: number
  onNoteMoved?: (message: string, type: 'success' | 'warning') => void
}

function FolderNode({ folder, selectedId, onSelect, level, onNoteMoved }: FolderNodeProps) {
  const [isOpen, setIsOpen] = useState(false)
  const [showDeleteDialog, setShowDeleteDialog] = useState(false)
  const [isRenaming, setIsRenaming] = useState(false)
  const [renameName, setRenameName] = useState(folder.name)
  const [showColorPicker, setShowColorPicker] = useState(false)
  const deleteFolder = useDeleteFolder()
  const updateFolder = useUpdateFolder()
  const moveNote = useMoveNote()
  const drag = useDragOptional()
  const dropZoneRef = useRef<HTMLDivElement>(null)
  const hasChildren = folder.children.length > 0
  const isSelected = selectedId === folder.id
  const isDropTarget = drag?.hoveredDropZone === `folder-${folder.id}`

  // Register as drop zone
  useEffect(() => {
    if (!drag || !dropZoneRef.current) return
    drag.registerDropZone(`folder-${folder.id}`, dropZoneRef.current)
    return () => drag.unregisterDropZone(`folder-${folder.id}`)
  }, [drag, folder.id])

  // Handle drop
  const handleMouseUp = async () => {
    if (!drag?.isDragging || !drag.draggedNote || !isDropTarget) return

    const draggedNote = drag.draggedNote
    const currentFolderId = draggedNote.folder_id

    drag.endDrag()

    if (currentFolderId === folder.id) {
      onNoteMoved?.(`Already in "${folder.name}"`, 'warning')
    } else {
      try {
        await moveNote.mutateAsync({ noteId: draggedNote.id, folderId: folder.id })
        onNoteMoved?.(`Moved to "${folder.name}"`, 'success')
      } catch (error) {
        console.error('Failed to move note:', error)
      }
    }
  }

  const handleDelete = async () => {
    try {
      await deleteFolder.mutateAsync(folder.id)
      setShowDeleteDialog(false)
      if (isSelected) {
        onSelect(undefined)
      }
    } catch (error) {
      console.error('Failed to delete folder:', error)
    }
  }

  const handleRename = async () => {
    if (!renameName.trim() || renameName === folder.name) {
      setIsRenaming(false)
      setRenameName(folder.name)
      return
    }
    try {
      await updateFolder.mutateAsync({ id: folder.id, updates: { name: renameName.trim() } })
      setIsRenaming(false)
    } catch (error) {
      console.error('Failed to rename folder:', error)
    }
  }

  const handleColorChange = async (color: string | null) => {
    try {
      await updateFolder.mutateAsync({ id: folder.id, updates: { color } })
      setShowColorPicker(false)
    } catch (error) {
      console.error('Failed to update folder color:', error)
    }
  }

  return (
    <>
      <Collapsible open={isOpen} onOpenChange={setIsOpen}>
        <div
          ref={dropZoneRef}
          onMouseUp={handleMouseUp}
          className={cn(
            'flex items-center gap-1 rounded-lg text-[15px] transition-colors group',
            'hover:bg-secondary',
            isSelected && 'bg-primary/10 text-primary',
            isDropTarget && 'bg-primary/20 ring-2 ring-primary'
          )}
          style={{ paddingLeft: `${level * 12 + 12}px` }}
        >
          {hasChildren ? (
            <CollapsibleTrigger asChild>
              <button className="p-1 hover:bg-accent rounded">
                <ChevronRight
                  className={cn(
                    'h-3 w-3 transition-transform',
                    isOpen && 'rotate-90'
                  )}
                />
              </button>
            </CollapsibleTrigger>
          ) : (
            <span className="w-5" />
          )}

          {isRenaming ? (
            <input
              type="text"
              value={renameName}
              onChange={(e) => setRenameName(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') handleRename()
                if (e.key === 'Escape') {
                  setIsRenaming(false)
                  setRenameName(folder.name)
                }
              }}
              onBlur={handleRename}
              className="flex-1 text-sm px-1 py-0.5 border border-border rounded bg-background focus:outline-none focus:ring-1 focus:ring-primary"
              autoFocus
            />
          ) : (
            <button
              onClick={() => onSelect(folder.id)}
              className="flex items-center gap-2 flex-1 py-2"
            >
              {isSelected || isOpen ? (
                <FolderOpen className="h-4 w-4" />
              ) : (
                <Folder className="h-4 w-4" />
              )}
              {folder.color && (
                <div
                  className="h-2.5 w-2.5 rounded-full flex-shrink-0"
                  style={{ backgroundColor: folder.color }}
                />
              )}
              <span className="truncate">{folder.name}</span>
            </button>
          )}

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button
                className={cn(
                  'p-1 rounded hover:bg-accent transition-colors mr-1',
                  'opacity-0 group-hover:opacity-100',
                  isSelected && 'opacity-100'
                )}
                onClick={(e) => e.stopPropagation()}
              >
                <MoreHorizontal className="h-4 w-4 text-muted-foreground" />
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent>
              <DropdownMenuItem onClick={() => setIsRenaming(true)}>
                <Pencil className="h-4 w-4" />
                Rename
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => setShowColorPicker(true)}>
                <Palette className="h-4 w-4" />
                Change color
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem
                variant="destructive"
                onClick={() => setShowDeleteDialog(true)}
              >
                <Trash2 className="h-4 w-4" />
                Delete folder
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>

        {hasChildren && (
          <CollapsibleContent>
            {folder.children.map((child) => (
              <FolderNode
                key={child.id}
                folder={child}
                selectedId={selectedId}
                onSelect={onSelect}
                level={level + 1}
                onNoteMoved={onNoteMoved}
              />
            ))}
          </CollapsibleContent>
        )}
      </Collapsible>

      <ConfirmDialog
        open={showDeleteDialog}
        onOpenChange={setShowDeleteDialog}
        title="Delete Folder"
        description={`Are you sure you want to delete "${folder.name}"? Notes in this folder will be moved to "All Notes".`}
        confirmLabel="Delete"
        variant="destructive"
        onConfirm={handleDelete}
        isLoading={deleteFolder.isPending}
      />

      <Dialog open={showColorPicker} onOpenChange={setShowColorPicker}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>Choose Color for "{folder.name}"</DialogHeader>
          <div className="py-4">
            <FolderColorPicker
              selectedColor={folder.color}
              onColorSelect={handleColorChange}
              className="justify-center"
            />
          </div>
        </DialogContent>
      </Dialog>
    </>
  )
}
