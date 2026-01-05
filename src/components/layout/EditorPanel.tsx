import { FileText, Sparkles } from 'lucide-react'
import { NoteEditor } from '@/components/editor/NoteEditor'
import { cn } from '@/lib/utils'

interface EditorPanelProps {
  noteId: string | null
  onAIChatToggle?: () => void
  isAIChatOpen?: boolean
  onNoteSelect?: (noteId: string) => void
  isMobile?: boolean
}

export function EditorPanel({ noteId, onAIChatToggle, isAIChatOpen, onNoteSelect, isMobile = false }: EditorPanelProps) {
  if (!noteId) {
    return (
      <div className="h-full flex flex-col bg-background">
        {/* Header with AI button */}
        {!isMobile && (
          <div className="flex items-center justify-end px-4 py-2 border-b border-border">
            <button
              onClick={onAIChatToggle}
              className={cn(
                'flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm transition-colors',
                isAIChatOpen
                  ? 'bg-primary/10 text-primary'
                  : 'bg-secondary text-muted-foreground hover:bg-secondary/80'
              )}
            >
              <Sparkles className="w-4 h-4" />
              <span>AI</span>
            </button>
          </div>
        )}

        <div className="flex-1 flex flex-col items-center justify-center text-muted-foreground">
          <FileText className="h-16 w-16 mb-4 opacity-50" />
          <p className="text-lg">Select a note</p>
          <p className="text-sm mt-1">or create a new one to get started</p>
        </div>
      </div>
    )
  }

  return (
    <div className="h-full bg-background flex flex-col">
      {/* Header with AI button - hide on mobile since header is in AppShell */}
      {!isMobile && (
        <div className="flex items-center justify-end px-4 py-2 border-b border-border">
          <button
            onClick={onAIChatToggle}
            className={cn(
              'flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm transition-colors',
              isAIChatOpen
                ? 'bg-primary/10 text-primary'
                : 'bg-secondary text-muted-foreground hover:bg-secondary/80'
            )}
          >
            <Sparkles className="w-4 h-4" />
            <span>AI</span>
          </button>
        </div>
      )}

      <div className="flex-1 overflow-hidden">
        <NoteEditor noteId={noteId} onNoteSelect={onNoteSelect} />
      </div>
    </div>
  )
}
