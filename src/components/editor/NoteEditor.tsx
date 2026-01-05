import { useEffect, useState, useMemo, useCallback, useRef } from 'react'
import { useCreateBlockNote } from '@blocknote/react'
import { BlockNoteView } from '@blocknote/mantine'
import '@blocknote/mantine/style.css'
import { format, parseISO } from 'date-fns'
import { Download } from 'lucide-react'
import { Skeleton } from '@/components/ui/skeleton'
import { TagPicker } from '@/components/tags/TagPicker'
import { RelatedNotes } from '@/components/ai/RelatedNotes'
import { useNote } from '@/hooks/useNotes'
import { useAutoSave } from '@/hooks/useAutoSave'
import { useTheme } from '@/hooks/useTheme'
import { downloadMarkdown } from '@/lib/exporters/markdown'
import { extractFirstLine } from '@/lib/utils'
import type { Block } from '@blocknote/core'

// Title is now derived automatically from the first line of content (like Apple Notes)

interface NoteEditorProps {
  noteId: string
}

interface NoteEditorPropsWithCallback extends NoteEditorProps {
  onNoteSelect?: (noteId: string) => void
}

export function NoteEditor({ noteId, onNoteSelect }: NoteEditorPropsWithCallback) {
  const { data: note, isLoading } = useNote(noteId)
  const { resolvedTheme } = useTheme()
  const [content, setContent] = useState<Block[] | null>(null)
  // Track if we're loading content to prevent false saves
  const isLoadingContent = useRef(true)
  // Ref for editor container to handle copy events
  const editorContainerRef = useRef<HTMLDivElement>(null)

  // Create editor instance
  const editor = useCreateBlockNote()

  // Auto-save hook - derives title from first line of content automatically
  const { isSaving } = useAutoSave(
    noteId,
    content,
    note?.content as unknown[] | null
  )

  // Reset loading flag when noteId changes
  useEffect(() => {
    isLoadingContent.current = true
  }, [noteId])

  // Sync note data to local state when note loads or changes
  useEffect(() => {
    if (note) {
      const noteContent = note.content as Block[]
      if (Array.isArray(noteContent) && noteContent.length > 0) {
        editor.replaceBlocks(editor.document, noteContent)
      }
      // Allow a brief moment for editor to settle before enabling saves
      setTimeout(() => {
        isLoadingContent.current = false
      }, 100)
    }
  }, [note, editor])

  // Handle copy events to replace markdown with plain text
  useEffect(() => {
    const container = editorContainerRef.current
    if (!container) return

    const handleCopy = (e: ClipboardEvent) => {
      const html = e.clipboardData?.getData('text/html')
      if (!html) return

      // Extract plain text from HTML
      const temp = document.createElement('div')
      temp.innerHTML = html
      const plainText = temp.textContent || temp.innerText || ''

      // Override the text/plain with actual plain text (not markdown)
      e.clipboardData?.setData('text/plain', plainText)
    }

    container.addEventListener('copy', handleCopy)
    return () => container.removeEventListener('copy', handleCopy)
  }, [])

  // Memoize the formatted date
  const formattedDate = useMemo(() => {
    if (!note) return ''
    return format(parseISO(note.updated_at), "MMMM d, yyyy 'at' h:mm a")
  }, [note?.updated_at])

  // Export to markdown
  const handleExport = useCallback(async () => {
    if (!note) return
    try {
      const markdown = await editor.blocksToMarkdownLossy(editor.document)
      const title = extractFirstLine(editor.document as unknown[])
      const titleLine = title !== 'New Note' ? `# ${title}\n\n` : ''
      downloadMarkdown(titleLine + markdown, title)
    } catch (error) {
      console.error('Failed to export note:', error)
    }
  }, [editor, note])

  if (isLoading) {
    return (
      <div className="h-full p-6 space-y-4">
        <Skeleton className="h-10 w-3/4" />
        <Skeleton className="h-4 w-48" />
        <Skeleton className="h-64 w-full mt-4" />
      </div>
    )
  }

  if (!note) {
    return (
      <div className="h-full flex items-center justify-center">
        <p className="text-muted-foreground">Note not found</p>
      </div>
    )
  }

  return (
    <div className="h-full flex flex-col">
      {/* Header - minimal like Apple Notes */}
      <div className="px-6 pt-4 pb-2 border-b border-border">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <span>{formattedDate}</span>
            {isSaving && (
              <span className="text-primary">Saving...</span>
            )}
          </div>
          <button
            onClick={handleExport}
            className="p-2 rounded-lg hover:bg-secondary transition-colors"
            title="Export to Markdown"
          >
            <Download className="h-4 w-4 text-muted-foreground" />
          </button>
        </div>
        <TagPicker noteId={noteId} />
      </div>

      {/* Editor */}
      <div ref={editorContainerRef} className="flex-1 overflow-auto">
        <BlockNoteView
          editor={editor}
          onChange={() => {
            // Only track changes after content has finished loading
            if (!isLoadingContent.current) {
              setContent(editor.document)
            }
          }}
          theme={resolvedTheme}
        />
      </div>

      {/* Related Notes */}
      {onNoteSelect && (
        <RelatedNotes
          noteId={noteId}
          onNoteClick={onNoteSelect}
        />
      )}
    </div>
  )
}
