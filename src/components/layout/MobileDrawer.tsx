import { motion, AnimatePresence, useMotionValue, useTransform, PanInfo } from 'framer-motion'
import { X } from 'lucide-react'

interface MobileDrawerProps {
  isOpen: boolean
  onClose: () => void
  children: React.ReactNode
  title?: string
}

const DRAWER_WIDTH = 280
const CLOSE_THRESHOLD = 100 // Pixels to swipe before closing

export function MobileDrawer({ isOpen, onClose, children, title }: MobileDrawerProps) {
  const x = useMotionValue(0)
  const backdropOpacity = useTransform(x, [-DRAWER_WIDTH, 0], [0, 1])

  const handleDragEnd = (_: MouseEvent | TouchEvent | PointerEvent, info: PanInfo) => {
    // Close if swiped left past threshold or with enough velocity
    if (info.offset.x < -CLOSE_THRESHOLD || info.velocity.x < -500) {
      onClose()
    }
  }

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            style={{ opacity: backdropOpacity }}
            onClick={onClose}
            className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm"
          />

          {/* Drawer */}
          <motion.div
            initial={{ x: -DRAWER_WIDTH }}
            animate={{ x: 0 }}
            exit={{ x: -DRAWER_WIDTH }}
            transition={{ type: 'spring', damping: 25, stiffness: 200 }}
            drag="x"
            dragConstraints={{ left: -DRAWER_WIDTH, right: 0 }}
            dragElastic={0.1}
            onDragEnd={handleDragEnd}
            style={{ x, width: DRAWER_WIDTH, maxWidth: '85vw', touchAction: 'pan-y' }}
            className="fixed inset-y-0 left-0 z-50 bg-card shadow-xl"
          >
            <div
              className="h-full flex flex-col"
              style={{
                paddingTop: 'env(safe-area-inset-top)',
                paddingBottom: 'env(safe-area-inset-bottom)',
              }}
            >
              {/* Header */}
              <div className="flex h-14 items-center justify-between border-b border-border px-4">
                <h2 className="text-lg font-semibold">{title || 'Menu'}</h2>
                <button
                  onClick={onClose}
                  className="flex h-10 w-10 items-center justify-center rounded-full text-muted-foreground transition-colors active:bg-accent"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>

              {/* Swipe indicator */}
              <div className="flex justify-center py-2">
                <div className="h-1 w-10 rounded-full bg-muted-foreground/30" />
              </div>

              {/* Content */}
              <div className="flex-1 overflow-y-auto">
                {children}
              </div>
            </div>

            {/* Edge drag handle - invisible but increases touch area */}
            <div
              className="absolute inset-y-0 -right-4 w-8"
              style={{ touchAction: 'pan-x' }}
            />
          </motion.div>
        </>
      )}
    </AnimatePresence>
  )
}
