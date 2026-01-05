import { useState, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Search, Mic, X } from 'lucide-react'
import { cn } from '@/lib/utils'

interface MobileToolbarProps {
  searchQuery: string
  onSearchChange: (query: string) => void
  onCreateNote: () => void
  onVoiceSearch?: (transcript: string) => void
  isListening?: boolean
  onStartListening?: () => void
  onStopListening?: () => void
}

export function MobileToolbar({
  searchQuery,
  onSearchChange,
  onCreateNote,
  isListening = false,
  onStartListening,
  onStopListening,
}: MobileToolbarProps) {
  const [isSearchFocused, setIsSearchFocused] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)

  const handleMicClick = () => {
    if (isListening) {
      onStopListening?.()
    } else {
      onStartListening?.()
      // Focus the input when starting voice search
      inputRef.current?.focus()
    }
  }

  const handleClearSearch = () => {
    onSearchChange('')
    inputRef.current?.focus()
  }

  return (
    <div
      className="fixed inset-x-0 bottom-0 z-50 border-t border-border bg-card/95 backdrop-blur-md"
      style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}
    >
      <div className="flex h-14 items-center gap-2 px-3">
        {/* Search Bar */}
        <div
          className={cn(
            'relative flex flex-1 items-center rounded-xl transition-all duration-200',
            'bg-muted/80',
            isSearchFocused && 'bg-muted ring-2 ring-primary/20'
          )}
        >
          <Search className="absolute left-3 h-4 w-4 text-muted-foreground" />
          <input
            ref={inputRef}
            type="text"
            value={searchQuery}
            onChange={(e) => onSearchChange(e.target.value)}
            onFocus={() => setIsSearchFocused(true)}
            onBlur={() => setIsSearchFocused(false)}
            placeholder="Search"
            className={cn(
              'h-10 w-full bg-transparent pl-9 pr-16 text-sm text-foreground',
              'placeholder:text-muted-foreground',
              'outline-none'
            )}
          />

          {/* Clear button (when there's text) */}
          <AnimatePresence>
            {searchQuery && (
              <motion.button
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.8 }}
                onClick={handleClearSearch}
                className="absolute right-10 flex h-5 w-5 items-center justify-center rounded-full bg-muted-foreground/30"
              >
                <X className="h-3 w-3 text-background" />
              </motion.button>
            )}
          </AnimatePresence>

          {/* Microphone button */}
          <button
            onClick={handleMicClick}
            className={cn(
              'absolute right-2 flex h-7 w-7 items-center justify-center rounded-full transition-colors',
              isListening
                ? 'bg-destructive text-destructive-foreground'
                : 'text-muted-foreground active:bg-muted-foreground/20'
            )}
          >
            <Mic className={cn('h-4 w-4', isListening && 'animate-pulse')} />
          </button>
        </div>

        {/* New Note Button */}
        <motion.button
          whileTap={{ scale: 0.95 }}
          onClick={onCreateNote}
          className={cn(
            'flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-xl',
            'bg-primary/10 text-primary',
            'active:bg-primary/20'
          )}
        >
          {/* Apple Notes style: square with pencil */}
          <svg
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth={1.5}
            className="h-5 w-5"
          >
            {/* Square/page */}
            <rect x="4" y="4" width="14" height="16" rx="2" />
            {/* Pencil line */}
            <path d="M8 12h6M8 8h6M8 16h3" />
            {/* Pencil */}
            <path
              d="M16 2l4 4-8 8H8v-4l8-8z"
              strokeLinejoin="round"
            />
          </svg>
        </motion.button>
      </div>
    </div>
  )
}
