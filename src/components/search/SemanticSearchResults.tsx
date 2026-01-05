import { FileText, Sparkles } from 'lucide-react'
import { ScrollArea } from '@/components/ui/scroll-area'
import { cn } from '@/lib/utils'

interface SemanticResult {
  note_id: string
  title: string
  preview: string
  similarity: number
}

interface SemanticSearchResultsProps {
  results: SemanticResult[]
  isLoading: boolean
  selectedNoteId: string | null
  onNoteSelect: (noteId: string) => void
}

export function SemanticSearchResults({
  results,
  isLoading,
  selectedNoteId,
  onNoteSelect,
}: SemanticSearchResultsProps) {
  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center h-full text-muted-foreground">
        <Sparkles className="h-8 w-8 mb-2 animate-pulse text-primary" />
        <p>Searching with AI...</p>
      </div>
    )
  }

  if (results.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-full text-muted-foreground">
        <FileText className="h-8 w-8 mb-2 opacity-50" />
        <p>No matching notes found</p>
      </div>
    )
  }

  return (
    <ScrollArea className="h-full">
      <div className="divide-y divide-border">
        {results.map((result) => (
          <button
            key={result.note_id}
            onClick={() => onNoteSelect(result.note_id)}
            className={cn(
              'w-full text-left px-4 py-3 transition-colors',
              'hover:bg-muted/50 active:bg-muted',
              selectedNoteId === result.note_id && 'bg-primary/10'
            )}
          >
            <div className="flex items-start justify-between gap-2">
              <div className="flex-1 min-w-0">
                <h3 className="font-medium text-foreground truncate">
                  {result.title || 'Untitled'}
                </h3>
                <p className="text-sm text-muted-foreground line-clamp-2 mt-0.5">
                  {result.preview}
                </p>
              </div>
              <div className="flex items-center gap-1 flex-shrink-0">
                <Sparkles className="h-3 w-3 text-primary" />
                <span className="text-xs font-medium text-primary">
                  {Math.round(result.similarity * 100)}%
                </span>
              </div>
            </div>
          </button>
        ))}
      </div>
    </ScrollArea>
  )
}
