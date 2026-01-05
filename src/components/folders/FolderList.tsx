import { useState, useMemo } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Folder, FolderPlus, ChevronRight, Trash2, FileText, GripVertical, Check } from 'lucide-react'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Skeleton } from '@/components/ui/skeleton'
import { ConfirmDialog } from '@/components/ui/confirm-dialog'
import { useFolders, useCreateFolder, useDeleteFolder } from '@/hooks/useFolders'
import { useNotes } from '@/hooks/useNotes'
import { cn } from '@/lib/utils'
import type { FolderWithChildren } from '@/lib/types'

interface FolderListProps {
  onFolderSelect: (id: string | undefined) => void
  onTrashSelect?: () => void
}

export function FolderList({ onFolderSelect, onTrashSelect }: FolderListProps) {
  const { data: folders, isLoading: foldersLoading } = useFolders()
  // Use useNotes() with undefined to get ALL notes (shares cache with other components)
  const { data: allNotes, isLoading: notesLoading } = useNotes()
  const createFolder = useCreateFolder()
  const deleteFolder = useDeleteFolder()

  const [isEditMode, setIsEditMode] = useState(false)
  const [selectedFolderIds, setSelectedFolderIds] = useState<Set<string>>(new Set())
  const [showDeleteDialog, setShowDeleteDialog] = useState(false)
  const [isCreatingFolder, setIsCreatingFolder] = useState(false)
  const [newFolderName, setNewFolderName] = useState('')

  // Calculate note counts per folder
  const noteCounts = useMemo(() => {
    if (!allNotes) return new Map<string | null, number>()
    const counts = new Map<string | null, number>()

    allNotes.forEach((note) => {
      const folderId = note.folder_id
      counts.set(folderId, (counts.get(folderId) || 0) + 1)
    })

    return counts
  }, [allNotes])

  const totalNotes = allNotes?.length || 0

  // Flatten folders for display (no nesting in mobile view)
  const flatFolders = useMemo(() => {
    if (!folders) return []
    const result: FolderWithChildren[] = []

    const flatten = (items: FolderWithChildren[]) => {
      items.forEach((folder) => {
        result.push(folder)
        if (folder.children?.length) {
          flatten(folder.children)
        }
      })
    }

    flatten(folders)
    return result
  }, [folders])

  const handleCreateFolder = async () => {
    if (!newFolderName.trim()) return
    try {
      await createFolder.mutateAsync({ name: newFolderName.trim() })
      setNewFolderName('')
      setIsCreatingFolder(false)
    } catch (error) {
      console.error('Failed to create folder:', error)
    }
  }

  const handleDeleteSelected = async () => {
    try {
      await Promise.all(
        Array.from(selectedFolderIds).map((id) => deleteFolder.mutateAsync(id))
      )
      setSelectedFolderIds(new Set())
      setShowDeleteDialog(false)
      setIsEditMode(false)
    } catch (error) {
      console.error('Failed to delete folders:', error)
    }
  }

  const toggleFolderSelection = (id: string) => {
    setSelectedFolderIds((prev) => {
      const next = new Set(prev)
      if (next.has(id)) {
        next.delete(id)
      } else {
        next.add(id)
      }
      return next
    })
  }

  const isLoading = foldersLoading || notesLoading

  if (isLoading) {
    return (
      <div className="flex flex-col h-full bg-background">
        <div className="p-4">
          <Skeleton className="h-10 w-32 mb-4" />
          <Skeleton className="h-14 w-full mb-2" />
          <Skeleton className="h-14 w-full mb-2" />
          <Skeleton className="h-14 w-full" />
        </div>
      </div>
    )
  }

  return (
    <div className="flex flex-col h-full bg-background">
      {/* Header with title - Apple Notes style */}
      <div
        className="flex-shrink-0 px-4"
        style={{ paddingTop: 'env(safe-area-inset-top)' }}
      >
        {/* Action buttons row */}
        <div className="flex items-center justify-end gap-1 h-11">
          {isEditMode ? (
            <button
              onClick={() => {
                setIsEditMode(false)
                setSelectedFolderIds(new Set())
              }}
              className="text-primary font-medium text-[17px] px-2 py-1"
            >
              Done
            </button>
          ) : (
            <>
              <button
                onClick={() => setIsCreatingFolder(true)}
                className="flex h-9 w-9 items-center justify-center rounded-full text-primary active:bg-primary/10"
              >
                <FolderPlus className="h-5 w-5" />
              </button>
              <button
                onClick={() => setIsEditMode(true)}
                className="text-primary font-medium text-[17px] px-2 py-1"
              >
                Edit
              </button>
            </>
          )}
        </div>

        {/* Large Title - tight spacing */}
        <h1 className="text-[34px] font-bold leading-tight tracking-tight text-foreground mb-3">
          Folders
        </h1>
      </div>

      {/* New Folder Input */}
      <AnimatePresence>
        {isCreatingFolder && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="px-4 mb-4"
          >
            <div className="flex items-center gap-2 p-3 rounded-xl bg-card border border-border">
              <Folder className="h-5 w-5 text-primary" />
              <input
                type="text"
                value={newFolderName}
                onChange={(e) => setNewFolderName(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') handleCreateFolder()
                  if (e.key === 'Escape') {
                    setIsCreatingFolder(false)
                    setNewFolderName('')
                  }
                }}
                placeholder="Folder name"
                className="flex-1 bg-transparent text-foreground placeholder:text-muted-foreground outline-none"
                autoFocus
              />
              <button
                onClick={handleCreateFolder}
                disabled={!newFolderName.trim()}
                className="text-primary font-medium disabled:opacity-50"
              >
                Create
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Folder List */}
      <ScrollArea className="flex-1">
        <div className="px-4 pb-4 space-y-3">
          {/* All Notes Card */}
          <div className="rounded-xl bg-card overflow-hidden">
            <FolderItem
              icon={<FileText className="h-5 w-5 text-primary" />}
              name="All Notes"
              count={totalNotes}
              isEditMode={isEditMode}
              isSelected={false}
              onSelect={() => {}}
              onClick={() => !isEditMode && onFolderSelect(undefined)}
            />
          </div>

          {/* User Folders Card */}
          {flatFolders.length > 0 && (
            <div className="rounded-xl bg-card overflow-hidden">
              {flatFolders.map((folder, index) => (
                <FolderItem
                  key={folder.id}
                  icon={<Folder className="h-5 w-5 text-primary" />}
                  name={folder.name}
                  count={noteCounts.get(folder.id) || 0}
                  isEditMode={isEditMode}
                  isSelected={selectedFolderIds.has(folder.id)}
                  onSelect={() => toggleFolderSelection(folder.id)}
                  onClick={() => !isEditMode && onFolderSelect(folder.id)}
                  showDivider={index < flatFolders.length - 1}
                />
              ))}
            </div>
          )}

          {/* Trash Card */}
          {onTrashSelect && (
            <div className="rounded-xl bg-card overflow-hidden">
              <FolderItem
                icon={<Trash2 className="h-5 w-5 text-destructive" />}
                name="Recently Deleted"
                isEditMode={false}
                isSelected={false}
                onSelect={() => {}}
                onClick={onTrashSelect}
              />
            </div>
          )}
        </div>
      </ScrollArea>

      {/* Edit Mode Delete Button */}
      <AnimatePresence>
        {isEditMode && selectedFolderIds.size > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 20 }}
            className="p-4 border-t border-border bg-background"
          >
            <button
              onClick={() => setShowDeleteDialog(true)}
              className="w-full py-3 rounded-xl bg-destructive text-destructive-foreground font-medium"
            >
              Delete {selectedFolderIds.size} Folder{selectedFolderIds.size > 1 ? 's' : ''}
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Delete Confirmation */}
      <ConfirmDialog
        open={showDeleteDialog}
        onOpenChange={setShowDeleteDialog}
        title="Delete Folders"
        description={`Are you sure you want to delete ${selectedFolderIds.size} folder${selectedFolderIds.size > 1 ? 's' : ''}? Notes will be moved to "All Notes".`}
        confirmLabel="Delete"
        variant="destructive"
        onConfirm={handleDeleteSelected}
        isLoading={deleteFolder.isPending}
      />
    </div>
  )
}

interface FolderItemProps {
  icon: React.ReactNode
  name: string
  count?: number
  isEditMode: boolean
  isSelected: boolean
  onSelect: () => void
  onClick: () => void
  showDivider?: boolean
}

function FolderItem({
  icon,
  name,
  count,
  isEditMode,
  isSelected,
  onSelect,
  onClick,
  showDivider = false,
}: FolderItemProps) {
  return (
    <button
      onClick={isEditMode ? onSelect : onClick}
      className={cn(
        'flex items-center w-full px-4 py-3.5 text-left transition-colors',
        'active:bg-accent',
        showDivider && 'border-b border-border'
      )}
    >
      {/* Edit Mode Checkbox */}
      <AnimatePresence>
        {isEditMode && (
          <motion.div
            initial={{ opacity: 0, width: 0 }}
            animate={{ opacity: 1, width: 32 }}
            exit={{ opacity: 0, width: 0 }}
            className="flex-shrink-0"
          >
            <div
              className={cn(
                'h-6 w-6 rounded-full border-2 flex items-center justify-center transition-colors',
                isSelected
                  ? 'bg-primary border-primary'
                  : 'border-muted-foreground/40'
              )}
            >
              {isSelected && <Check className="h-4 w-4 text-primary-foreground" />}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Folder Icon */}
      <div className="flex-shrink-0 mr-3">{icon}</div>

      {/* Folder Name */}
      <span className="flex-1 text-[17px] text-foreground truncate">{name}</span>

      {/* Note Count */}
      {count !== undefined && (
        <span className="text-muted-foreground text-[17px] mr-2">{count}</span>
      )}

      {/* Chevron (non-edit mode only) */}
      {!isEditMode && (
        <ChevronRight className="h-5 w-5 text-muted-foreground/60 flex-shrink-0" />
      )}

      {/* Drag Handle (edit mode) */}
      {isEditMode && (
        <GripVertical className="h-5 w-5 text-muted-foreground/40 flex-shrink-0 ml-2" />
      )}
    </button>
  )
}
