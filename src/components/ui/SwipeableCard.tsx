import { useState } from 'react'
import { motion, useMotionValue, PanInfo } from 'framer-motion'
import { Trash2, FolderInput } from 'lucide-react'
import { cn } from '@/lib/utils'

interface SwipeableCardProps {
  children: React.ReactNode
  onDelete: () => void
  onMove?: () => void
  showMove?: boolean
  className?: string
  disabled?: boolean
}

const BUTTON_WIDTH = 80 // Width of each action button
const SWIPE_THRESHOLD = 40 // Minimum swipe to trigger action reveal
const VELOCITY_THRESHOLD = 300 // px/s - fast swipe triggers action regardless of distance

export function SwipeableCard({
  children,
  onDelete,
  onMove,
  showMove = true,
  className,
  disabled = false,
}: SwipeableCardProps) {
  const [showingActions, setShowingActions] = useState(false)
  const x = useMotionValue(0)

  // Calculate total action width based on number of buttons
  const actionWidth = showMove && onMove ? BUTTON_WIDTH * 2 : BUTTON_WIDTH

  const handleDragEnd = (_: MouseEvent | TouchEvent | PointerEvent, info: PanInfo) => {
    const velocityX = info.velocity.x

    // Fast swipe left - show actions
    if (velocityX < -VELOCITY_THRESHOLD) {
      setShowingActions(true)
      return
    }

    // Fast swipe right - hide actions
    if (velocityX > VELOCITY_THRESHOLD) {
      setShowingActions(false)
      return
    }

    // Slow swipe: use position threshold
    // Swipe left past threshold - show actions
    if (info.offset.x < -SWIPE_THRESHOLD) {
      setShowingActions(true)
    }
    // Swipe right or small movement - hide actions
    else {
      setShowingActions(false)
    }
  }

  const handleDeleteClick = (e: React.MouseEvent) => {
    e.stopPropagation()
    setShowingActions(false)
    onDelete()
  }

  const handleMoveClick = (e: React.MouseEvent) => {
    e.stopPropagation()
    setShowingActions(false)
    onMove?.()
  }

  const closeActions = () => {
    setShowingActions(false)
  }

  if (disabled) {
    return <div className={className}>{children}</div>
  }

  return (
    <div className={cn('relative overflow-hidden rounded-xl', className)}>
      {/* Action buttons background */}
      <div className="absolute inset-y-0 right-0 flex">
        {/* Move button */}
        {showMove && onMove && (
          <button
            onClick={handleMoveClick}
            className="flex w-20 flex-col items-center justify-center gap-1 bg-primary text-primary-foreground transition-colors active:bg-primary/90"
          >
            <FolderInput className="h-6 w-6" />
            <span className="text-xs font-semibold">Move</span>
          </button>
        )}
        {/* Delete button */}
        <button
          onClick={handleDeleteClick}
          className="flex w-20 flex-col items-center justify-center gap-1 bg-destructive text-destructive-foreground transition-colors active:bg-destructive/90"
        >
          <Trash2 className="h-6 w-6" />
          <span className="text-xs font-semibold">Trash</span>
        </button>
      </div>

      {/* Swipeable content */}
      <motion.div
        drag="x"
        dragConstraints={{ left: -actionWidth, right: 0 }}
        dragElastic={0.1}
        dragMomentum={false}
        dragDirectionLock
        onDragEnd={handleDragEnd}
        animate={{ x: showingActions ? -actionWidth : 0 }}
        transition={{ type: 'spring', damping: 25, stiffness: 300 }}
        style={{ x, touchAction: 'pan-y' }}
        className="relative bg-card cursor-grab active:cursor-grabbing"
      >
        {children}
      </motion.div>

      {/* Tap overlay to close when showing actions */}
      {showingActions && (
        <div
          className="absolute inset-y-0 left-0 z-10"
          style={{ width: `calc(100% - ${actionWidth}px)` }}
          onClick={closeActions}
          onTouchEnd={(e) => {
            e.preventDefault()
            closeActions()
          }}
        />
      )}
    </div>
  )
}
