import { motion, AnimatePresence } from 'framer-motion'
import { X } from 'lucide-react'

interface MobileDrawerProps {
  isOpen: boolean
  onClose: () => void
  children: React.ReactNode
  title?: string
}

export function MobileDrawer({ isOpen, onClose, children, title }: MobileDrawerProps) {
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
            onClick={onClose}
            className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm"
          />

          {/* Drawer */}
          <motion.div
            initial={{ x: '-100%' }}
            animate={{ x: 0 }}
            exit={{ x: '-100%' }}
            transition={{ type: 'spring', damping: 25, stiffness: 200 }}
            className="fixed inset-y-0 left-0 z-50 w-[280px] max-w-[85vw] bg-card shadow-xl"
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

            {/* Content */}
            <div className="h-[calc(100%-3.5rem)] overflow-y-auto">
              {children}
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  )
}
