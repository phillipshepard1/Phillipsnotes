import { motion } from 'framer-motion'
import { Folder, FileText, Edit3, Plus } from 'lucide-react'
import type { MobileView } from '@/hooks/useMobile'

interface MobileNavProps {
  activeView: MobileView
  onNavigate: (view: MobileView) => void
  onCreateNote: () => void
  hasSelectedNote: boolean
}

export function MobileNav({ activeView, onNavigate, onCreateNote, hasSelectedNote }: MobileNavProps) {
  const tabs = [
    { id: 'sidebar' as const, label: 'Folders', icon: Folder },
    { id: 'list' as const, label: 'Notes', icon: FileText },
    { id: 'editor' as const, label: 'Editor', icon: Edit3 },
  ]

  return (
    <>
      {/* Floating Action Button */}
      {activeView === 'list' && (
        <motion.button
          initial={{ scale: 0, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          exit={{ scale: 0, opacity: 0 }}
          whileTap={{ scale: 0.9 }}
          onClick={onCreateNote}
          className="fixed right-4 z-40 flex h-14 w-14 items-center justify-center rounded-full bg-primary text-primary-foreground shadow-lg active:bg-primary/90"
          style={{ bottom: 'calc(env(safe-area-inset-bottom) + 72px)' }}
        >
          <Plus className="h-6 w-6" />
        </motion.button>
      )}

      {/* Bottom Navigation */}
      <nav
        className="fixed inset-x-0 bottom-0 z-50 border-t border-border bg-card/95 backdrop-blur-sm"
        style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}
      >
        <div className="flex h-16 items-center justify-around">
          {tabs.map((tab) => {
            const isActive = activeView === tab.id
            const isDisabled = tab.id === 'editor' && !hasSelectedNote

            return (
              <button
                key={tab.id}
                onClick={() => !isDisabled && onNavigate(tab.id)}
                disabled={isDisabled}
                className={`relative flex h-full flex-1 flex-col items-center justify-center gap-1 transition-colors ${
                  isDisabled
                    ? 'text-muted-foreground/40'
                    : isActive
                    ? 'text-primary'
                    : 'text-muted-foreground active:text-primary'
                }`}
              >
                {isActive && (
                  <motion.div
                    layoutId="activeTab"
                    className="absolute inset-x-4 top-0 h-0.5 rounded-full bg-primary"
                    transition={{ type: 'spring', stiffness: 500, damping: 30 }}
                  />
                )}
                <tab.icon className="h-5 w-5" />
                <span className="text-xs font-medium">{tab.label}</span>
              </button>
            )
          })}
        </div>
      </nav>
    </>
  )
}
