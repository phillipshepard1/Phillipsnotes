import { useState } from 'react'
import { Plus, Pencil, Trash2, Check, X } from 'lucide-react'
import { Dialog, DialogContent, DialogHeader, DialogBody } from '@/components/ui/dialog'
import { ConfirmDialog } from '@/components/ui/confirm-dialog'
import { ScrollArea } from '@/components/ui/scroll-area'
import { cn } from '@/lib/utils'
import { useTags, useCreateTag, useUpdateTag, useDeleteTag } from '@/hooks/useTags'
import { getTagColorClasses, TAG_COLORS } from '@/api/tags'
import type { Tag } from '@/lib/types'

interface TagManagerProps {
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function TagManager({ open, onOpenChange }: TagManagerProps) {
  const { data: tags = [], isLoading } = useTags()
  const createTag = useCreateTag()
  const updateTag = useUpdateTag()
  const deleteTag = useDeleteTag()

  const [isCreating, setIsCreating] = useState(false)
  const [newTagName, setNewTagName] = useState('')
  const [newTagColor, setNewTagColor] = useState('gray')
  const [editingTag, setEditingTag] = useState<Tag | null>(null)
  const [editName, setEditName] = useState('')
  const [editColor, setEditColor] = useState('')
  const [deleteTagId, setDeleteTagId] = useState<string | null>(null)

  const handleCreateTag = async () => {
    if (!newTagName.trim()) return
    try {
      await createTag.mutateAsync({ name: newTagName.trim(), color: newTagColor })
      setNewTagName('')
      setNewTagColor('gray')
      setIsCreating(false)
    } catch (error) {
      console.error('Failed to create tag:', error)
    }
  }

  const handleStartEdit = (tag: Tag) => {
    setEditingTag(tag)
    setEditName(tag.name)
    setEditColor(tag.color || 'gray')
  }

  const handleSaveEdit = async () => {
    if (!editingTag || !editName.trim()) return
    try {
      await updateTag.mutateAsync({
        id: editingTag.id,
        updates: { name: editName.trim(), color: editColor },
      })
      setEditingTag(null)
    } catch (error) {
      console.error('Failed to update tag:', error)
    }
  }

  const handleCancelEdit = () => {
    setEditingTag(null)
    setEditName('')
    setEditColor('')
  }

  const handleDeleteTag = async () => {
    if (!deleteTagId) return
    try {
      await deleteTag.mutateAsync(deleteTagId)
      setDeleteTagId(null)
    } catch (error) {
      console.error('Failed to delete tag:', error)
    }
  }

  const tagToDelete = tags.find(t => t.id === deleteTagId)

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-sm">
          <DialogHeader onClose={() => onOpenChange(false)}>
            Manage Tags
          </DialogHeader>
          <DialogBody>
            <ScrollArea className="max-h-80">
              <div className="space-y-1">
                {isLoading ? (
                  <p className="text-sm text-muted-foreground text-center py-4">Loading...</p>
                ) : tags.length === 0 && !isCreating ? (
                  <p className="text-sm text-muted-foreground text-center py-4">No tags yet. Create your first tag!</p>
                ) : (
                  tags.map(tag => {
                    const isEditing = editingTag?.id === tag.id
                    const colors = getTagColorClasses(tag.color)

                    if (isEditing) {
                      return (
                        <div key={tag.id} className="p-2 border border-border rounded-lg space-y-2">
                          <input
                            type="text"
                            value={editName}
                            onChange={(e) => setEditName(e.target.value)}
                            onKeyDown={(e) => {
                              if (e.key === 'Enter') handleSaveEdit()
                              if (e.key === 'Escape') handleCancelEdit()
                            }}
                            className="w-full px-2 py-1 text-sm border border-border rounded bg-background focus:outline-none focus:ring-1 focus:ring-primary"
                            autoFocus
                          />
                          <div className="flex flex-wrap gap-1">
                            {TAG_COLORS.map(color => (
                              <button
                                key={color.value}
                                onClick={() => setEditColor(color.value)}
                                className={cn(
                                  'w-5 h-5 rounded-full border-2 transition-colors',
                                  color.bg,
                                  editColor === color.value ? 'border-foreground' : 'border-transparent'
                                )}
                              />
                            ))}
                          </div>
                          <div className="flex gap-1">
                            <button
                              onClick={handleCancelEdit}
                              className="flex-1 flex items-center justify-center gap-1 px-2 py-1 text-xs rounded bg-secondary hover:bg-secondary/80 transition-colors"
                            >
                              <X className="h-3 w-3" />
                              Cancel
                            </button>
                            <button
                              onClick={handleSaveEdit}
                              disabled={!editName.trim() || updateTag.isPending}
                              className="flex-1 flex items-center justify-center gap-1 px-2 py-1 text-xs rounded bg-primary text-primary-foreground hover:bg-primary/90 disabled:opacity-50 transition-colors"
                            >
                              <Check className="h-3 w-3" />
                              Save
                            </button>
                          </div>
                        </div>
                      )
                    }

                    return (
                      <div
                        key={tag.id}
                        className="flex items-center gap-2 px-2 py-1.5 rounded hover:bg-secondary group"
                      >
                        <span className={cn('w-3 h-3 rounded-full flex-shrink-0', colors.bg)} />
                        <span className="flex-1 text-sm truncate">{tag.name}</span>
                        <button
                          onClick={() => handleStartEdit(tag)}
                          className="p-1 rounded hover:bg-accent opacity-0 group-hover:opacity-100 transition-opacity"
                        >
                          <Pencil className="h-3.5 w-3.5 text-muted-foreground" />
                        </button>
                        <button
                          onClick={() => setDeleteTagId(tag.id)}
                          className="p-1 rounded hover:bg-destructive/10 opacity-0 group-hover:opacity-100 transition-opacity"
                        >
                          <Trash2 className="h-3.5 w-3.5 text-destructive" />
                        </button>
                      </div>
                    )
                  })
                )}

                {/* Create new tag */}
                {isCreating ? (
                  <div className="mt-2 pt-2 border-t border-border p-2 space-y-2">
                    <input
                      type="text"
                      value={newTagName}
                      onChange={(e) => setNewTagName(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') handleCreateTag()
                        if (e.key === 'Escape') {
                          setIsCreating(false)
                          setNewTagName('')
                        }
                      }}
                      placeholder="Tag name"
                      className="w-full px-2 py-1 text-sm border border-border rounded bg-background focus:outline-none focus:ring-1 focus:ring-primary"
                      autoFocus
                    />
                    <div className="flex flex-wrap gap-1">
                      {TAG_COLORS.map(color => (
                        <button
                          key={color.value}
                          onClick={() => setNewTagColor(color.value)}
                          className={cn(
                            'w-5 h-5 rounded-full border-2 transition-colors',
                            color.bg,
                            newTagColor === color.value ? 'border-foreground' : 'border-transparent'
                          )}
                        />
                      ))}
                    </div>
                    <div className="flex gap-1">
                      <button
                        onClick={() => {
                          setIsCreating(false)
                          setNewTagName('')
                        }}
                        className="flex-1 px-2 py-1 text-xs rounded bg-secondary hover:bg-secondary/80 transition-colors"
                      >
                        Cancel
                      </button>
                      <button
                        onClick={handleCreateTag}
                        disabled={!newTagName.trim() || createTag.isPending}
                        className="flex-1 px-2 py-1 text-xs rounded bg-primary text-primary-foreground hover:bg-primary/90 disabled:opacity-50 transition-colors"
                      >
                        Create
                      </button>
                    </div>
                  </div>
                ) : (
                  <button
                    onClick={() => setIsCreating(true)}
                    className={cn(
                      'w-full flex items-center gap-2 px-2 py-2 rounded text-sm',
                      'text-muted-foreground hover:bg-secondary hover:text-foreground transition-colors',
                      tags.length > 0 && 'mt-2 border-t border-border pt-2'
                    )}
                  >
                    <Plus className="h-4 w-4" />
                    Create new tag
                  </button>
                )}
              </div>
            </ScrollArea>
          </DialogBody>
        </DialogContent>
      </Dialog>

      {/* Delete confirmation */}
      <ConfirmDialog
        open={!!deleteTagId}
        onOpenChange={(open) => !open && setDeleteTagId(null)}
        title="Delete Tag"
        description={`Are you sure you want to delete "${tagToDelete?.name}"? This will remove the tag from all notes.`}
        confirmLabel="Delete"
        variant="destructive"
        onConfirm={handleDeleteTag}
        isLoading={deleteTag.isPending}
      />
    </>
  )
}
