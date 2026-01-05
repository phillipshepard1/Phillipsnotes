import { useRef, useState, useEffect } from 'react'
import { motion, useMotionValue, useTransform, useAnimation } from 'framer-motion'
import { ChevronLeft } from 'lucide-react'

interface EdgeSwipeBackProps {
  onBack: () => void
  children: React.ReactNode
  disabled?: boolean
  previousScreenTitle?: string
}

const EDGE_WIDTH = 30 // Pixels from left edge to start gesture
const BACK_THRESHOLD = 120 // Pixels to swipe before triggering back
const SCREEN_WIDTH = typeof window !== 'undefined' ? window.innerWidth : 400

export function EdgeSwipeBack({
  onBack,
  children,
  disabled = false,
  previousScreenTitle = 'Back'
}: EdgeSwipeBackProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const [isEdgeSwipe, setIsEdgeSwipe] = useState(false)
  const controls = useAnimation()

  const x = useMotionValue(0)

  // Transform values for the current screen (slides right)
  const currentScreenShadow = useTransform(
    x,
    [0, SCREEN_WIDTH * 0.5],
    ['0px 0px 0px rgba(0,0,0,0)', '-10px 0px 30px rgba(0,0,0,0.2)']
  )

  // Transform values for the "previous screen" preview (slides in from left)
  const prevScreenX = useTransform(x, [0, SCREEN_WIDTH], [-SCREEN_WIDTH * 0.3, 0])
  const prevScreenScale = useTransform(x, [0, SCREEN_WIDTH * 0.5], [0.92, 1])
  const prevScreenOpacity = useTransform(x, [0, 100], [0, 1])

  // Overlay that darkens the previous screen
  const overlayOpacity = useTransform(x, [0, SCREEN_WIDTH * 0.5], [0.4, 0])

  // Back chevron indicator
  const chevronOpacity = useTransform(x, [0, 60, BACK_THRESHOLD], [0, 0.7, 1])
  const chevronX = useTransform(x, [0, BACK_THRESHOLD], [0, 12])

  // Track touch
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

      // Cancel if scrolling vertically
      if (Math.abs(deltaY) > Math.abs(deltaX) && Math.abs(deltaY) > 10) {
        isDragging.current = false
        setIsEdgeSwipe(false)
        x.set(0)
        return
      }

      if (deltaX > 0) {
        e.preventDefault()
        x.set(Math.min(deltaX, SCREEN_WIDTH * 0.85))
      }
    }

    const handleTouchEnd = () => {
      if (!isDragging.current) return

      isDragging.current = false
      const currentX = x.get()

      if (currentX > BACK_THRESHOLD) {
        controls.start({ x: SCREEN_WIDTH }).then(() => {
          onBack()
          x.set(0)
          controls.set({ x: 0 })
        })
      } else {
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
    <div ref={containerRef} className="relative h-full w-full overflow-hidden bg-muted">
      {/* Previous screen preview (background layer) */}
      <motion.div
        className="absolute inset-0 bg-background"
        style={{
          x: prevScreenX,
          scale: prevScreenScale,
          opacity: prevScreenOpacity,
        }}
      >
        {/* Simulated previous screen content */}
        <div className="h-full flex flex-col">
          {/* Header area */}
          <div
            className="flex items-center gap-3 px-4 border-b border-border"
            style={{
              paddingTop: 'calc(env(safe-area-inset-top) + 12px)',
              paddingBottom: '12px'
            }}
          >
            <ChevronLeft className="h-5 w-5 text-primary" />
            <span className="text-primary font-medium">{previousScreenTitle}</span>
          </div>

          {/* Content preview (blurred bars representing content) */}
          <div className="flex-1 p-4 space-y-3">
            <div className="h-8 w-48 bg-foreground/10 rounded-lg" />
            <div className="h-4 w-24 bg-muted-foreground/20 rounded" />
            <div className="mt-6 space-y-2">
              {[1, 2, 3, 4].map((i) => (
                <div key={i} className="p-4 rounded-xl bg-card border border-border/50">
                  <div className="h-4 w-32 bg-foreground/10 rounded mb-2" />
                  <div className="h-3 w-full bg-muted-foreground/10 rounded" />
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Overlay to darken the previous screen */}
        <motion.div
          className="absolute inset-0 bg-black pointer-events-none"
          style={{ opacity: overlayOpacity }}
        />
      </motion.div>

      {/* Current screen (foreground, slides right) */}
      <motion.div
        className="absolute inset-0 bg-background"
        style={{
          x,
          boxShadow: currentScreenShadow,
        }}
        animate={controls}
        transition={{ type: 'spring', damping: 30, stiffness: 400 }}
      >
        {children}
      </motion.div>

      {/* Back chevron that appears on left edge */}
      <motion.div
        className="absolute left-3 top-1/2 -translate-y-1/2 z-50 pointer-events-none"
        style={{
          opacity: chevronOpacity,
          x: chevronX,
        }}
      >
        <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/90 text-primary-foreground shadow-lg backdrop-blur-sm">
          <ChevronLeft className="h-6 w-6" strokeWidth={2.5} />
        </div>
      </motion.div>

      {/* Left edge touch zone */}
      <div
        className="absolute inset-y-0 left-0 w-8 z-40"
        style={{ touchAction: 'pan-x' }}
      />
    </div>
  )
}
