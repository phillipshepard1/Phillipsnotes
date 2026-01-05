import { useState, useRef, useEffect } from 'react'
import { Send, Loader2 } from 'lucide-react'
import { cn } from '@/lib/utils'

interface ChatInputProps {
  onSend: (message: string) => void
  disabled?: boolean
  placeholder?: string
}

export function ChatInput({ onSend, disabled, placeholder = 'Ask about your notes...' }: ChatInputProps) {
  const [value, setValue] = useState('')
  const [isFocused, setIsFocused] = useState(false)
  const textareaRef = useRef<HTMLTextAreaElement>(null)

  // Auto-resize textarea
  useEffect(() => {
    const textarea = textareaRef.current
    if (textarea) {
      textarea.style.height = 'auto'
      textarea.style.height = `${Math.min(textarea.scrollHeight, 150)}px`
    }
  }, [value])

  const handleSubmit = () => {
    const trimmed = value.trim()
    if (trimmed && !disabled) {
      onSend(trimmed)
      setValue('')
    }
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSubmit()
    }
  }

  return (
    <div className="border-t border-border/50 p-3 bg-background/80 backdrop-blur-xl">
      <div className="flex items-end gap-2">
        <div
          className={cn(
            'relative flex flex-1 items-center rounded-2xl transition-all duration-200',
            'bg-muted/60',
            isFocused && 'bg-muted ring-2 ring-primary/30'
          )}
        >
          <textarea
            ref={textareaRef}
            value={value}
            onChange={(e) => setValue(e.target.value)}
            onKeyDown={handleKeyDown}
            onFocus={() => setIsFocused(true)}
            onBlur={() => setIsFocused(false)}
            placeholder={placeholder}
            disabled={disabled}
            rows={1}
            className={cn(
              'flex-1 resize-none bg-transparent px-4 py-3 text-[17px] text-foreground',
              'placeholder:text-muted-foreground/60',
              'outline-none',
              'min-h-[48px] max-h-[150px]',
              'disabled:opacity-50'
            )}
          />
        </div>
        <button
          onClick={handleSubmit}
          disabled={disabled || !value.trim()}
          className={cn(
            'flex-shrink-0 h-12 w-12 flex items-center justify-center rounded-2xl transition-colors',
            'bg-primary text-primary-foreground shadow-sm',
            'active:opacity-80',
            'disabled:opacity-50 disabled:cursor-not-allowed'
          )}
        >
          {disabled ? (
            <Loader2 className="w-5 h-5 animate-spin" />
          ) : (
            <Send className="w-5 h-5" />
          )}
        </button>
      </div>
      <div className="mt-2 text-xs text-muted-foreground/60 text-center">
        Press Enter to send, Shift+Enter for new line
      </div>
    </div>
  )
}
