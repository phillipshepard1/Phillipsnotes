import { useRef, useState, useEffect } from 'react'
import { motion, useMotionValue, useTransform, useAnimation } from 'framer-motion'
import { ChevronLeft } from 'lucide-react'

interface EdgeSwipeBackProps {
  onBack: () => void
  children: React.ReactNode
  disabled?: boolean
}

const EDGE_WIDTH = 30 // Pixels from left edge to start gesture
const BACK_THRESHOLD = 120 // Pixels to swipe before triggering back
const SCREEN_WIDTH = typeof window !== 'undefined' ? window.innerWidth : 400

export function EdgeSwipeBack({ onBack, children, disabled = false }: EdgeSwipeBackProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const [isEdgeSwipe, setIsEdgeSwipe] = useState(false)
  const controls = useAnimation()

  const x = useMotionValue(0)

  // Transform values for animations
  const backdropOpacity = useTransform(x, [0, SCREEN_WIDTH * 0.4], [0, 0.3])
  const indicatorX = useTransform(x, [0, BACK_THRESHOLD], [-40, 16])
  const indicatorOpacity = useTransform(x, [0, 40, BACK_THRESHOLD], [0, 0.5, 1])
  const indicatorScale = useTransform(x, [0, BACK_THRESHOLD], [0.6, 1])
  const shadowOpacity = useTransform(x, [0, 100], [0, 0.15])

  // Track touch start position
  const touchStartX = useRef(0)
  const touchStartY = useRef(0)
  const isDragging = useRef(false)

  useEffect(() => {
    if (disabled) return

    const container = containerRef.current
    if (!container) return

    const handleTouchStart = (e: TouchEvent) => {
      const touch = e.touches[0]
      touchStartX.current = touch.clientX
      touchStartY.current = touch.clientY

      // Check if touch started near left edge
      const rect = container.getBoundingClientRect()
      const relativeX = touch.clientX - rect.left

      if (relativeX <= EDGE_WIDTH) {
        setIsEdgeSwipe(true)
        isDragging.current = true
      }
    }

    const handleTouchMove = (e: TouchEvent) => {
      if (!isDragging.current || !isEdgeSwipe) return

      const touch = e.touches[0]
      const deltaX = touch.clientX - touchStartX.current
      const deltaY = touch.clientY - touchStartY.current

      // If vertical scroll is greater, cancel the swipe
      if (Math.abs(deltaY) > Math.abs(deltaX) && Math.abs(deltaY) > 10) {
        isDragging.current = false
        setIsEdgeSwipe(false)
        x.set(0)
        return
      }

      // Only allow swiping right (positive deltaX)
      if (deltaX > 0) {
        // Prevent default to stop scrolling while swiping
        e.preventDefault()
        x.set(Math.min(deltaX, SCREEN_WIDTH * 0.8))
      }
    }

    const handleTouchEnd = () => {
      if (!isDragging.current) return

      isDragging.current = false
      const currentX = x.get()

      if (currentX > BACK_THRESHOLD) {
        // Animate off screen then trigger back
        controls.start({ x: SCREEN_WIDTH }).then(() => {
          onBack()
          x.set(0)
          controls.set({ x: 0 })
        })
      } else {
        // Snap back
        controls.start({ x: 0 })
      }

      setIsEdgeSwipe(false)
    }

    container.addEventListener('touchstart', handleTouchStart, { passive: true })
    container.addEventListener('touchmove', handleTouchMove, { passive: false })
    container.addEventListener('touchend', handleTouchEnd)
    container.addEventListener('touchcancel', handleTouchEnd)

    return () => {
      container.removeEventListener('touchstart', handleTouchStart)
      container.removeEventListener('touchmove', handleTouchMove)
      container.removeEventListener('touchend', handleTouchEnd)
      container.removeEventListener('touchcancel', handleTouchEnd)
    }
  }, [disabled, isEdgeSwipe, x, controls, onBack])

  if (disabled) {
    return <>{children}</>
  }

  return (
    <div ref={containerRef} className="relative h-full w-full overflow-hidden">
      {/* Dark backdrop that appears as you swipe */}
      <motion.div
        className="absolute inset-0 bg-black pointer-events-none z-40"
        style={{ opacity: backdropOpacity }}
      />

      {/* Back arrow indicator */}
      <motion.div
        className="absolute top-1/2 -translate-y-1/2 z-50 pointer-events-none"
        style={{
          x: indicatorX,
          opacity: indicatorOpacity,
          scale: indicatorScale
        }}
      >
        <div className="flex h-12 w-12 items-center justify-center rounded-full bg-primary text-primary-foreground shadow-xl">
          <ChevronLeft className="h-7 w-7" strokeWidth={2.5} />
        </div>
      </motion.div>

      {/* Main content that slides */}
      <motion.div
        className="h-full w-full bg-background"
        style={{ x }}
        animate={controls}
        transition={{ type: 'spring', damping: 30, stiffness: 400 }}
      >
        {/* Left shadow edge */}
        <motion.div
          className="absolute inset-y-0 left-0 w-4 pointer-events-none z-10"
          style={{
            opacity: shadowOpacity,
            background: 'linear-gradient(to right, rgba(0,0,0,0.2), transparent)',
          }}
        />
        {children}
      </motion.div>

      {/* Invisible left edge touch zone */}
      <div
        className="absolute inset-y-0 left-0 w-8 z-30"
        style={{ touchAction: 'pan-x' }}
      />
    </div>
  )
}
