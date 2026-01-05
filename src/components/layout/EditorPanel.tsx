import { FileText } from 'lucide-react'
import { NoteEditor } from '@/components/editor/NoteEditor'
import { NoteInfoSheet } from '@/components/editor/NoteInfoSheet'

interface EditorPanelProps {
  noteId: string | null
  onNoteSelect?: (noteId: string) => void
  isMobile?: boolean
}

export function EditorPanel({ noteId, onNoteSelect, isMobile = false }: EditorPanelProps) {
  if (!noteId) {
    return (
      <div className="h-full flex flex-col bg-background">
        {/* Header */}
        {!isMobile && (
          <div className="flex items-center justify-end px-4 py-2 border-b border-border h-[52px]" />
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
      {/* Header with Info button - hide on mobile since header is in AppShell */}
      {!isMobile && (
        <div className="flex items-center justify-end gap-2 px-4 py-2 border-b border-border">
          <NoteInfoSheet noteId={noteId} onNoteSelect={onNoteSelect} />
        </div>
      )}

      <div className="flex-1 overflow-hidden">
        <NoteEditor noteId={noteId} />
      </div>
    </div>
  )
}
