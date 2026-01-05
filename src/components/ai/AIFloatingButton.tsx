import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Sparkles, X, FileText, Tag, MessageCircle, Wand2 } from 'lucide-react'
import { cn } from '@/lib/utils'

interface AIFloatingButtonProps {
  onSummarize?: () => void
  onImproveWriting?: () => void
  onSuggestTags?: () => void
  onAskAI?: () => void
  disabled?: boolean
}

const actions = [
  {
    id: 'summarize',
    label: 'Summarize',
    icon: FileText,
    color: 'text-blue-500',
    bgColor: 'bg-blue-500/10',
  },
  {
    id: 'improve',
    label: 'Improve Writing',
    icon: Wand2,
    color: 'text-purple-500',
    bgColor: 'bg-purple-500/10',
  },
  {
    id: 'tags',
    label: 'Suggest Tags',
    icon: Tag,
    color: 'text-green-500',
    bgColor: 'bg-green-500/10',
  },
  {
    id: 'chat',
    label: 'Ask AI',
    icon: MessageCircle,
    color: 'text-orange-500',
    bgColor: 'bg-orange-500/10',
  },
]

export function AIFloatingButton({
  onSummarize,
  onImproveWriting,
  onSuggestTags,
  onAskAI,
  disabled = false,
}: AIFloatingButtonProps) {
  const [isExpanded, setIsExpanded] = useState(false)

  const handleAction = (actionId: string) => {
    switch (actionId) {
      case 'summarize':
        onSummarize?.()
        break
      case 'improve':
        onImproveWriting?.()
        break
      case 'tags':
        onSuggestTags?.()
        break
      case 'chat':
        onAskAI?.()
        break
    }
    setIsExpanded(false)
  }

  return (
    <div
      className="fixed bottom-24 right-4 z-40"
      style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}
    >
      <AnimatePresence>
        {isExpanded && (
          <>
            {/* Backdrop */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsExpanded(false)}
              className="fixed inset-0 bg-black/20 backdrop-blur-sm -z-10"
            />

            {/* Action buttons */}
            <div className="absolute bottom-16 right-0 flex flex-col gap-2 items-end">
              {actions.map((action, index) => (
                <motion.button
                  key={action.id}
                  initial={{ opacity: 0, y: 20, scale: 0.8 }}
                  animate={{
                    opacity: 1,
                    y: 0,
                    scale: 1,
                    transition: { delay: index * 0.05 },
                  }}
                  exit={{
                    opacity: 0,
                    y: 10,
                    scale: 0.8,
                    transition: { delay: (actions.length - index - 1) * 0.03 },
                  }}
                  onClick={() => handleAction(action.id)}
                  className={cn(
                    'flex items-center gap-3 pl-4 pr-5 py-2.5 rounded-full',
                    'bg-background/80 backdrop-blur-xl border border-border/50',
                    'shadow-lg hover:shadow-xl transition-shadow',
                    'active:scale-95'
                  )}
                >
                  <div className={cn('p-1.5 rounded-full', action.bgColor)}>
                    <action.icon className={cn('h-4 w-4', action.color)} />
                  </div>
                  <span className="text-sm font-medium text-foreground whitespace-nowrap">
                    {action.label}
                  </span>
                </motion.button>
              ))}
            </div>
          </>
        )}
      </AnimatePresence>

      {/* Main FAB */}
      <motion.button
        whileTap={{ scale: 0.92 }}
        onClick={() => setIsExpanded(!isExpanded)}
        disabled={disabled}
        className={cn(
          'flex items-center justify-center h-14 w-14 rounded-full',
          'bg-primary text-primary-foreground',
          'shadow-lg shadow-primary/25',
          'disabled:opacity-50 disabled:cursor-not-allowed',
          'transition-transform'
        )}
      >
        <motion.div
          animate={{ rotate: isExpanded ? 45 : 0 }}
          transition={{ type: 'spring', stiffness: 300, damping: 20 }}
        >
          {isExpanded ? (
            <X className="h-6 w-6" />
          ) : (
            <Sparkles className="h-6 w-6" />
          )}
        </motion.div>
      </motion.button>
    </div>
  )
}
