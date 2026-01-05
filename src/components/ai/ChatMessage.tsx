import { cn } from '@/lib/utils'
import { User, Bot, FileText } from 'lucide-react'

interface Source {
  noteId: string
  title: string
}

interface ChatMessageProps {
  role: 'user' | 'assistant'
  content: string
  sources?: Source[]
  isStreaming?: boolean
  onSourceClick?: (noteId: string) => void
}

export function ChatMessage({
  role,
  content,
  sources,
  isStreaming,
  onSourceClick,
}: ChatMessageProps) {
  const isUser = role === 'user'

  return (
    <div className={cn('flex gap-3 p-4', isUser ? 'bg-muted/50' : 'bg-card')}>
      {/* Avatar */}
      <div
        className={cn(
          'flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center',
          isUser ? 'bg-primary/10 text-primary' : 'bg-primary/10 text-primary'
        )}
      >
        {isUser ? <User className="w-4 h-4" /> : <Bot className="w-4 h-4" />}
      </div>

      {/* Content */}
      <div className="flex-1 min-w-0 space-y-2">
        <div className="text-sm font-medium text-foreground">
          {isUser ? 'You' : 'AI Assistant'}
        </div>

        <div
          className={cn(
            'prose prose-sm max-w-none text-foreground dark:prose-invert',
            'prose-p:my-1 prose-headings:my-2 prose-ul:my-1 prose-ol:my-1',
            'prose-pre:bg-muted prose-pre:p-2 prose-pre:rounded prose-code:text-sm'
          )}
        >
          {/* Render markdown content as plain text for now - could add react-markdown later */}
          <div className="whitespace-pre-wrap">{content}</div>
          {isStreaming && (
            <span className="inline-block w-2 h-4 bg-primary animate-pulse ml-0.5" />
          )}
        </div>

        {/* Sources */}
        {sources && sources.length > 0 && (
          <div className="mt-3 pt-3 border-t border-border">
            <div className="text-xs font-medium text-muted-foreground mb-2">Sources:</div>
            <div className="flex flex-wrap gap-2">
              {sources.map((source) => (
                <button
                  key={source.noteId}
                  onClick={() => {
                    if (onSourceClick) {
                      onSourceClick(source.noteId)
                    }
                  }}
                  className={cn(
                    'inline-flex items-center gap-1 px-2 py-1 rounded text-xs',
                    'bg-primary/10 text-primary hover:bg-primary/20 transition-colors',
                    'cursor-pointer border border-primary/20 hover:border-primary/30',
                    onSourceClick && 'hover:shadow-sm'
                  )}
                >
                  <FileText className="w-3 h-3" />
                  <span className="truncate max-w-[150px]">
                    {source.title || 'Untitled'}
                  </span>
                </button>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
