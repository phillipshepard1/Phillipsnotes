import { createPortal } from 'react-dom'
import { useDragOptional } from '@/context/DragContext'
import { FileText } from 'lucide-react'
import { cn } from '@/lib/utils'

export function DragOverlay() {
  const drag = useDragOptional()

  if (!drag?.isDragging || !drag.draggedNote) {
    return null
  }

  const { draggedNote, dragPosition } = drag

  // Offset from cursor so card doesn't block view
  const offsetX = 15
  const offsetY = 15

  return createPortal(
    <div
      className={cn(
        'fixed pointer-events-none z-[200]',
        'transform -translate-x-1/2'
      )}
      style={{
        left: dragPosition.x + offsetX,
        top: dragPosition.y + offsetY,
      }}
    >
      <div
        className={cn(
          'flex items-center gap-2 px-4 py-3',
          'bg-card border border-border rounded-xl',
          'shadow-2xl',
          'min-w-[200px] max-w-[280px]',
          'transform rotate-2',
          'animate-in zoom-in-95 duration-150'
        )}
      >
        <FileText className="w-5 h-5 text-primary flex-shrink-0" />
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold truncate">
            {draggedNote.title || 'New Note'}
          </p>
          {draggedNote.preview && (
            <p className="text-xs text-muted-foreground truncate mt-0.5">
              {draggedNote.preview}
            </p>
          )}
        </div>
      </div>
    </div>,
    document.body
  )
}
