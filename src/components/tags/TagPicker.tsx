import { useState, useRef, useEffect } from 'react'
import { Tag as TagIcon, Plus, Check } from 'lucide-react'
import { cn } from '@/lib/utils'
import { useTags, useNoteTags, useAddTagToNote, useRemoveTagFromNote, useCreateTag } from '@/hooks/useTags'
import { TagBadge } from './TagBadge'
import { getTagColorClasses, TAG_COLORS } from '@/api/tags'
import type { Tag } from '@/lib/types'

interface TagPickerProps {
  noteId: string
  className?: string
}

export function TagPicker({ noteId, className }: TagPickerProps) {
  const [isOpen, setIsOpen] = useState(false)
  const [isCreating, setIsCreating] = useState(false)
  const [newTagName, setNewTagName] = useState('')
  const [selectedColor, setSelectedColor] = useState('gray')
  const containerRef = useRef<HTMLDivElement>(null)

  const { data: allTags = [] } = useTags()
  const { data: noteTags = [] } = useNoteTags(noteId)
  const addTag = useAddTagToNote()
  const removeTag = useRemoveTagFromNote()
  const createTag = useCreateTag()

  const noteTagIds = noteTags.map(t => t.id)

  // Close on outside click
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false)
        setIsCreating(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  const handleTagToggle = async (tag: Tag) => {
    if (noteTagIds.includes(tag.id)) {
      await removeTag.mutateAsync({ noteId, tagId: tag.id })
    } else {
      await addTag.mutateAsync({ noteId, tagId: tag.id })
    }
  }

  const handleCreateTag = async () => {
    if (!newTagName.trim()) return
    try {
      const tag = await createTag.mutateAsync({ name: newTagName.trim(), color: selectedColor })
      await addTag.mutateAsync({ noteId, tagId: tag.id })
      setNewTagName('')
      setIsCreating(false)
      setSelectedColor('gray')
    } catch (error) {
      console.error('Failed to create tag:', error)
    }
  }

  return (
    <div ref={containerRef} className={cn('relative', className)}>
      {/* Current tags + trigger */}
      <div className="flex items-center flex-wrap gap-1">
        {noteTags.map(tag => (
          <TagBadge
            key={tag.id}
            tag={tag}
            onRemove={() => removeTag.mutate({ noteId, tagId: tag.id })}
          />
        ))}
        <button
          onClick={() => setIsOpen(!isOpen)}
          className={cn(
            'inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs',
            'text-muted-foreground hover:bg-secondary transition-colors',
            isOpen && 'bg-secondary'
          )}
        >
          <TagIcon className="h-3 w-3" />
          <span>Add tag</span>
        </button>
      </div>

      {/* Dropdown */}
      {isOpen && (
        <div className="absolute left-0 top-full mt-1 w-56 bg-popover border border-border rounded-lg shadow-lg z-50">
          <div className="p-2 max-h-64 overflow-y-auto">
            {allTags.length === 0 && !isCreating && (
              <p className="text-sm text-muted-foreground text-center py-2">No tags yet</p>
            )}

            {allTags.map(tag => {
              const isSelected = noteTagIds.includes(tag.id)
              const colors = getTagColorClasses(tag.color)
              return (
                <button
                  key={tag.id}
                  onClick={() => handleTagToggle(tag)}
                  className={cn(
                    'w-full flex items-center gap-2 px-2 py-1.5 rounded text-sm text-left',
                    'hover:bg-accent transition-colors'
                  )}
                >
                  <span className={cn('w-3 h-3 rounded-full', colors.bg)} />
                  <span className="flex-1 truncate">{tag.name}</span>
                  {isSelected && <Check className="h-4 w-4 text-primary" />}
                </button>
              )
            })}

            {/* Create new tag section */}
            {isCreating ? (
              <div className="mt-2 pt-2 border-t border-border space-y-2">
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
                      onClick={() => setSelectedColor(color.value)}
                      className={cn(
                        'w-5 h-5 rounded-full border-2 transition-colors',
                        color.bg,
                        selectedColor === color.value ? 'border-foreground' : 'border-transparent'
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
                  'w-full flex items-center gap-2 px-2 py-1.5 rounded text-sm',
                  'text-muted-foreground hover:bg-accent hover:text-foreground transition-colors',
                  allTags.length > 0 && 'mt-2 pt-2 border-t border-border'
                )}
              >
                <Plus className="h-4 w-4" />
                Create new tag
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
