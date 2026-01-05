import { useState, useRef } from 'react'
import { motion, useMotionValue, useTransform, PanInfo, AnimatePresence } from 'framer-motion'
import { Trash2 } from 'lucide-react'
import { cn } from '@/lib/utils'

interface SwipeableCardProps {
  children: React.ReactNode
  onDelete: () => void
  deleteLabel?: string
  className?: string
  disabled?: boolean
}

const DELETE_THRESHOLD = 80 // Pixels to swipe before triggering delete
const FULL_SWIPE_THRESHOLD = 150 // Pixels to fully swipe and auto-delete

export function SwipeableCard({
  children,
  onDelete,
  deleteLabel = 'Delete',
  className,
  disabled = false,
}: SwipeableCardProps) {
  const [isDragging, setIsDragging] = useState(false)
  const [showingActions, setShowingActions] = useState(false)
  const constraintsRef = useRef<HTMLDivElement>(null)

  const x = useMotionValue(0)
  const deleteOpacity = useTransform(x, [-FULL_SWIPE_THRESHOLD, -DELETE_THRESHOLD, 0], [1, 1, 0])
  const deleteScale = useTransform(x, [-FULL_SWIPE_THRESHOLD, -DELETE_THRESHOLD, 0], [1.1, 1, 0.8])
  const backgroundColor = useTransform(
    x,
    [-FULL_SWIPE_THRESHOLD, -DELETE_THRESHOLD, 0],
    ['hsl(var(--destructive))', 'hsl(var(--destructive))', 'hsl(var(--destructive)/0)']
  )

  const handleDragStart = () => {
    setIsDragging(true)
  }

  const handleDragEnd = (_: MouseEvent | TouchEvent | PointerEvent, info: PanInfo) => {
    setIsDragging(false)

    // Full swipe - auto delete
    if (info.offset.x < -FULL_SWIPE_THRESHOLD || info.velocity.x < -800) {
      onDelete()
      return
    }

    // Partial swipe - show delete button
    if (info.offset.x < -DELETE_THRESHOLD / 2) {
      setShowingActions(true)
    } else {
      setShowingActions(false)
    }
  }

  const handleDeleteClick = (e: React.MouseEvent) => {
    e.stopPropagation()
    onDelete()
  }

  const handleCardClick = () => {
    if (showingActions) {
      setShowingActions(false)
    }
  }

  if (disabled) {
    return <div className={className}>{children}</div>
  }

  return (
    <div
      ref={constraintsRef}
      className={cn('relative overflow-hidden rounded-xl', className)}
      onClick={handleCardClick}
    >
      {/* Delete action background */}
      <motion.div
        className="absolute inset-y-0 right-0 flex items-center justify-end pr-4"
        style={{ backgroundColor, width: FULL_SWIPE_THRESHOLD + 20 }}
      >
        <motion.button
          onClick={handleDeleteClick}
          style={{ opacity: deleteOpacity, scale: deleteScale }}
          className="flex flex-col items-center gap-1 text-destructive-foreground"
        >
          <Trash2 className="h-6 w-6" />
          <span className="text-xs font-medium">{deleteLabel}</span>
        </motion.button>
      </motion.div>

      {/* Swipeable content */}
      <motion.div
        drag="x"
        dragConstraints={{ left: -FULL_SWIPE_THRESHOLD - 20, right: 0 }}
        dragElastic={0.1}
        dragMomentum={false}
        onDragStart={handleDragStart}
        onDragEnd={handleDragEnd}
        animate={{ x: showingActions ? -DELETE_THRESHOLD : 0 }}
        style={{ x, touchAction: 'pan-y' }}
        className={cn(
          'relative bg-card',
          isDragging && 'cursor-grabbing'
        )}
      >
        {children}
      </motion.div>

      {/* Tap outside to close overlay when showing actions */}
      <AnimatePresence>
        {showingActions && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 z-10"
            onClick={() => setShowingActions(false)}
            style={{ pointerEvents: 'auto', background: 'transparent' }}
          />
        )}
      </AnimatePresence>
    </div>
  )
}
