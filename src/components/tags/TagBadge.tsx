import { X } from 'lucide-react'
import { cn } from '@/lib/utils'
import { getTagColorClasses } from '@/api/tags'
import type { Tag } from '@/lib/types'

interface TagBadgeProps {
  tag: Tag
  onRemove?: () => void
  onClick?: () => void
  size?: 'sm' | 'md'
}

export function TagBadge({ tag, onRemove, onClick, size = 'sm' }: TagBadgeProps) {
  const colors = getTagColorClasses(tag.color)

  return (
    <span
      className={cn(
        'inline-flex items-center gap-1 rounded-full font-medium transition-colors',
        colors.bg,
        colors.text,
        size === 'sm' && 'px-2 py-0.5 text-xs',
        size === 'md' && 'px-2.5 py-1 text-sm',
        onClick && 'cursor-pointer hover:opacity-80'
      )}
      onClick={onClick}
    >
      {tag.name}
      {onRemove && (
        <button
          onClick={(e) => {
            e.stopPropagation()
            onRemove()
          }}
          className="hover:bg-black/10 dark:hover:bg-white/10 rounded-full p-0.5 -mr-1"
        >
          <X className="h-3 w-3" />
        </button>
      )}
    </span>
  )
}
