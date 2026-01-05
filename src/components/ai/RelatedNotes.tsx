import { useEffect, useState } from 'react'
import { ChevronDown, ChevronRight, FileText, RefreshCw } from 'lucide-react'
import { cn } from '@/lib/utils'
import { useRelatedNotes } from '@/hooks/useAI'

interface RelatedNotesProps {
  noteId: string | null
  onNoteClick: (noteId: string) => void
}

export function RelatedNotes({ noteId, onNoteClick }: RelatedNotesProps) {
  const [isExpanded, setIsExpanded] = useState(true)
  const { relatedNotes, isLoading, error, fetchRelatedNotes } = useRelatedNotes(noteId)

  // Fetch related notes when noteId changes
  useEffect(() => {
    if (noteId) {
      fetchRelatedNotes()
    }
  }, [noteId, fetchRelatedNotes])

  if (!noteId) return null

  return (
    <div className="border-t border-border bg-muted/30">
      {/* Header */}
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="w-full flex items-center justify-between px-4 py-2 text-sm font-medium text-muted-foreground hover:text-foreground transition-colors"
      >
        <div className="flex items-center gap-2">
          {isExpanded ? (
            <ChevronDown className="h-4 w-4" />
          ) : (
            <ChevronRight className="h-4 w-4" />
          )}
          <span>Related Notes</span>
          {relatedNotes.length > 0 && (
            <span className="text-xs bg-secondary px-1.5 py-0.5 rounded">
              {relatedNotes.length}
            </span>
          )}
        </div>
        <button
          onClick={(e) => {
            e.stopPropagation()
            fetchRelatedNotes()
          }}
          disabled={isLoading}
          className="p-1 rounded hover:bg-secondary transition-colors"
          title="Refresh related notes"
        >
          <RefreshCw className={cn('h-3.5 w-3.5', isLoading && 'animate-spin')} />
        </button>
      </button>

      {/* Content */}
      {isExpanded && (
        <div className="px-4 pb-3">
          {isLoading ? (
            <div className="flex items-center gap-2 text-xs text-muted-foreground py-2">
              <RefreshCw className="h-3 w-3 animate-spin" />
              Finding related notes...
            </div>
          ) : error ? (
            <p className="text-xs text-destructive py-2">{error}</p>
          ) : relatedNotes.length === 0 ? (
            <p className="text-xs text-muted-foreground py-2">
              No related notes found. Keep writing to build connections!
            </p>
          ) : (
            <div className="space-y-1">
              {relatedNotes.map((note) => (
                <button
                  key={note.note_id}
                  onClick={() => onNoteClick(note.note_id)}
                  className={cn(
                    'w-full flex items-start gap-2 p-2 rounded-lg text-left',
                    'hover:bg-secondary transition-colors group'
                  )}
                >
                  <FileText className="h-4 w-4 text-muted-foreground flex-shrink-0 mt-0.5" />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-medium truncate">
                        {note.title || 'Untitled'}
                      </span>
                      <span className="text-xs text-muted-foreground flex-shrink-0">
                        {Math.round(note.similarity * 100)}%
                      </span>
                    </div>
                    {note.preview && (
                      <p className="text-xs text-muted-foreground line-clamp-1 mt-0.5">
                        {note.preview}
                      </p>
                    )}
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  )
}
