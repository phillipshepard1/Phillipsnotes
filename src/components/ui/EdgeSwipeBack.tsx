import { useState, useRef, useCallback } from 'react'
import { motion, useMotionValue, useTransform, PanInfo } from 'framer-motion'
import { ChevronLeft } from 'lucide-react'

interface EdgeSwipeBackProps {
  onBack: () => void
  children: React.ReactNode
  disabled?: boolean
}

const EDGE_WIDTH = 20 // Pixels from left edge to start gesture
const BACK_THRESHOLD = 100 // Pixels to swipe before triggering back
const MAX_DRAG = 150 // Maximum drag distance

export function EdgeSwipeBack({ onBack, children, disabled = false }: EdgeSwipeBackProps) {
  const [isDragging, setIsDragging] = useState(false)
  const [isEdgeSwipe, setIsEdgeSwipe] = useState(false)
  const containerRef = useRef<HTMLDivElement>(null)
  const startXRef = useRef(0)

  const x = useMotionValue(0)
  const indicatorOpacity = useTransform(x, [0, BACK_THRESHOLD / 2, BACK_THRESHOLD], [0, 0.5, 1])
  const indicatorScale = useTransform(x, [0, BACK_THRESHOLD], [0.5, 1])
  const contentOpacity = useTransform(x, [0, MAX_DRAG], [1, 0.9])

  const handlePointerDown = useCallback((e: React.PointerEvent) => {
    if (disabled) return

    const rect = containerRef.current?.getBoundingClientRect()
    if (!rect) return

    const relativeX = e.clientX - rect.left
    startXRef.current = relativeX

    // Only start edge swipe if pointer is within edge zone
    if (relativeX <= EDGE_WIDTH) {
      setIsEdgeSwipe(true)
    }
  }, [disabled])

  const handleDragStart = () => {
    if (isEdgeSwipe) {
      setIsDragging(true)
    }
  }

  const handleDrag = () => {
    if (!isEdgeSwipe) {
      x.set(0)
    }
  }

  const handleDragEnd = (_: MouseEvent | TouchEvent | PointerEvent, info: PanInfo) => {
    setIsDragging(false)
    setIsEdgeSwipe(false)

    if (!isEdgeSwipe) return

    // Trigger back if dragged past threshold or with enough velocity
    if (info.offset.x > BACK_THRESHOLD || info.velocity.x > 500) {
      onBack()
    }
  }

  if (disabled) {
    return <>{children}</>
  }

  return (
    <div ref={containerRef} className="relative h-full w-full overflow-hidden">
      {/* Back indicator */}
      <motion.div
        className="absolute left-2 top-1/2 -translate-y-1/2 z-50 pointer-events-none"
        style={{ opacity: indicatorOpacity, scale: indicatorScale }}
      >
        <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/90 text-primary-foreground shadow-lg">
          <ChevronLeft className="h-6 w-6" />
        </div>
      </motion.div>

      {/* Draggable content */}
      <motion.div
        className="h-full w-full"
        drag={isEdgeSwipe ? 'x' : false}
        dragConstraints={{ left: 0, right: MAX_DRAG }}
        dragElastic={0.2}
        dragMomentum={false}
        onPointerDown={handlePointerDown}
        onDragStart={handleDragStart}
        onDrag={handleDrag}
        onDragEnd={handleDragEnd}
        style={{
          x: isEdgeSwipe ? x : 0,
          opacity: isDragging ? contentOpacity : 1,
          touchAction: 'pan-y',
        }}
        animate={{ x: 0 }}
        transition={{ type: 'spring', damping: 25, stiffness: 300 }}
      >
        {children}
      </motion.div>

      {/* Left edge touch zone indicator (invisible but helps with touch) */}
      <div
        className="absolute inset-y-0 left-0 w-5 z-40"
        style={{ touchAction: 'pan-x' }}
      />
    </div>
  )
}
