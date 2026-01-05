import { useState } from 'react'
import { ChevronRight, Folder, FolderOpen, FileText, Plus, MoreHorizontal, Trash2, Pencil } from 'lucide-react'
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Skeleton } from '@/components/ui/skeleton'
import { DropdownMenu, DropdownMenuTrigger, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator } from '@/components/ui/dropdown-menu'
import { ConfirmDialog } from '@/components/ui/confirm-dialog'
import { useFolders, useCreateFolder, useDeleteFolder, useUpdateFolder } from '@/hooks/useFolders'
import { cn } from '@/lib/utils'
import type { FolderWithChildren } from '@/lib/types'

interface FolderTreeProps {
  selectedFolderId: string | null
  onFolderSelect: (id: string | null) => void
  isTrashSelected?: boolean
  onTrashSelect?: () => void
}

export function FolderTree({ selectedFolderId, onFolderSelect, isTrashSelected, onTrashSelect }: FolderTreeProps) {
  const { data: folders, isLoading } = useFolders()
  const createFolder = useCreateFolder()
  const [isCreating, setIsCreating] = useState(false)
  const [newFolderName, setNewFolderName] = useState('')

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
          onClick={() => onFolderSelect(null)}
          className={cn(
            'flex items-center gap-2 w-full px-2 py-1.5 rounded-md text-sm transition-colors',
            'hover:bg-secondary',
            selectedFolderId === null && !isTrashSelected && 'bg-primary/10 text-primary'
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
            className="flex items-center gap-2 w-full px-2 py-1.5 rounded-md text-sm text-muted-foreground hover:bg-secondary hover:text-foreground transition-colors"
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
              'flex items-center gap-2 w-full px-2 py-1.5 rounded-md text-sm transition-colors',
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
  selectedId: string | null
  onSelect: (id: string | null) => void
  level: number
}

function FolderNode({ folder, selectedId, onSelect, level }: FolderNodeProps) {
  const [isOpen, setIsOpen] = useState(false)
  const [showDeleteDialog, setShowDeleteDialog] = useState(false)
  const [isRenaming, setIsRenaming] = useState(false)
  const [renameName, setRenameName] = useState(folder.name)
  const deleteFolder = useDeleteFolder()
  const updateFolder = useUpdateFolder()
  const hasChildren = folder.children.length > 0
  const isSelected = selectedId === folder.id

  const handleDelete = async () => {
    try {
      await deleteFolder.mutateAsync(folder.id)
      setShowDeleteDialog(false)
      if (isSelected) {
        onSelect(null)
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

  return (
    <>
      <Collapsible open={isOpen} onOpenChange={setIsOpen}>
        <div
          className={cn(
            'flex items-center gap-1 rounded-md text-sm transition-colors group',
            'hover:bg-secondary',
            isSelected && 'bg-primary/10 text-primary'
          )}
          style={{ paddingLeft: `${level * 12 + 8}px` }}
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
              className="flex items-center gap-2 flex-1 py-1.5"
            >
              {isSelected || isOpen ? (
                <FolderOpen className="h-4 w-4" />
              ) : (
                <Folder className="h-4 w-4" />
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
    </>
  )
}
