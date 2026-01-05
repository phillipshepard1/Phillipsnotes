import { useState, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Search, Mic, X, Download } from 'lucide-react'
import { cn } from '@/lib/utils'

interface MobileToolbarProps {
  searchQuery: string
  onSearchChange: (query: string) => void
  onCreateNote: () => void
  onImportClick?: () => void
  onVoiceSearch?: (transcript: string) => void
  isListening?: boolean
  onStartListening?: () => void
  onStopListening?: () => void
  onSearchFocus?: () => void
  onSearchBlur?: () => void
}

export function MobileToolbar({
  searchQuery,
  onSearchChange,
  onCreateNote,
  onImportClick,
  isListening = false,
  onStartListening,
  onStopListening,
  onSearchFocus,
  onSearchBlur,
}: MobileToolbarProps) {
  const [isSearchFocused, setIsSearchFocused] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)

  const handleFocus = () => {
    setIsSearchFocused(true)
    onSearchFocus?.()
  }

  const handleBlur = () => {
    setIsSearchFocused(false)
    // Only call onSearchBlur if there's no query (user cancelled)
    if (!searchQuery) {
      onSearchBlur?.()
    }
  }

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
      className="fixed inset-x-0 bottom-0 z-50 bg-background/80 backdrop-blur-xl border-t border-border/50"
      style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}
    >
      <div className="flex items-center gap-3 px-4 py-3">
        {/* Search Bar - Apple style */}
        <div
          className={cn(
            'relative flex flex-1 items-center rounded-2xl transition-all duration-200',
            'bg-muted/60',
            isSearchFocused && 'bg-muted ring-2 ring-primary/30'
          )}
        >
          <Search className="absolute left-4 h-5 w-5 text-muted-foreground/70" />
          <input
            ref={inputRef}
            type="text"
            value={searchQuery}
            onChange={(e) => onSearchChange(e.target.value)}
            onFocus={handleFocus}
            onBlur={handleBlur}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                inputRef.current?.blur()
              }
            }}
            placeholder="Search"
            className={cn(
              'h-12 w-full bg-transparent pl-12 pr-20 text-[17px] text-foreground',
              'placeholder:text-muted-foreground/60',
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
                className="absolute right-14 flex h-6 w-6 items-center justify-center rounded-full bg-muted-foreground/40"
              >
                <X className="h-3.5 w-3.5 text-background" />
              </motion.button>
            )}
          </AnimatePresence>

          {/* Microphone button */}
          <button
            onClick={handleMicClick}
            className={cn(
              'absolute right-3 flex h-9 w-9 items-center justify-center rounded-full transition-colors',
              isListening
                ? 'bg-destructive text-destructive-foreground'
                : 'text-muted-foreground/70 active:bg-muted-foreground/20'
            )}
          >
            <Mic className={cn('h-5 w-5', isListening && 'animate-pulse')} />
          </button>
        </div>

        {/* Import Button - subtle icon button */}
        {onImportClick && (
          <motion.button
            whileTap={{ scale: 0.92 }}
            onClick={onImportClick}
            className={cn(
              'flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-xl',
              'bg-muted/60 text-muted-foreground',
              'active:bg-muted'
            )}
          >
            <Download className="h-5 w-5" />
          </motion.button>
        )}

        {/* New Note Button - Apple style compose icon */}
        <motion.button
          whileTap={{ scale: 0.92 }}
          onClick={onCreateNote}
          className={cn(
            'flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-2xl',
            'bg-primary text-primary-foreground',
            'shadow-sm active:opacity-80'
          )}
        >
          {/* Apple-style square with pencil icon */}
          <svg
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth={2}
            strokeLinecap="round"
            strokeLinejoin="round"
            className="h-6 w-6"
          >
            {/* Square/paper */}
            <rect x="3" y="3" width="14" height="18" rx="2" />
            {/* Pencil */}
            <path d="M14 3v4a1 1 0 0 0 1 1h4" />
            <path d="M17 21v-7" />
            <path d="M14 18h6" />
          </svg>
        </motion.button>
      </div>
    </div>
  )
}
