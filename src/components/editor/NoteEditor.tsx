import { useEffect, useState, useMemo, useCallback, useRef } from 'react'
import { useCreateBlockNote } from '@blocknote/react'
import { BlockNoteView } from '@blocknote/mantine'
import '@blocknote/mantine/style.css'
import { format, parseISO } from 'date-fns'
import { Download, Wand2 } from 'lucide-react'
import { Skeleton } from '@/components/ui/skeleton'
import { TagPicker } from '@/components/tags/TagPicker'
import { RelatedNotes } from '@/components/ai/RelatedNotes'
import { useNote, useUpdateNote } from '@/hooks/useNotes'
import { useAutoSave } from '@/hooks/useAutoSave'
import { useTheme } from '@/hooks/useTheme'
import { useAISuggestions } from '@/hooks/useAI'
import { downloadMarkdown } from '@/lib/exporters/markdown'
import { cn } from '@/lib/utils'
import type { Block } from '@blocknote/core'

interface NoteEditorProps {
  noteId: string
}

interface NoteEditorPropsWithCallback extends NoteEditorProps {
  onNoteSelect?: (noteId: string) => void
}

export function NoteEditor({ noteId, onNoteSelect }: NoteEditorPropsWithCallback) {
  const { data: note, isLoading } = useNote(noteId)
  const updateNote = useUpdateNote()
  const { resolvedTheme } = useTheme()
  const { generateSuggestions, isGenerating } = useAISuggestions()
  const [title, setTitle] = useState('')
  const [content, setContent] = useState<Block[] | null>(null)
  // Track if we're loading content to prevent false saves
  const isLoadingContent = useRef(true)

  // Create editor instance
  const editor = useCreateBlockNote()

  // Auto-save hook - pass original DB content as baseline to prevent false saves
  const { isSaving } = useAutoSave(
    noteId,
    content,
    title,
    note?.content as unknown[] | null,
    note?.title
  )

  // Reset loading flag when noteId changes
  useEffect(() => {
    isLoadingContent.current = true
  }, [noteId])

  // Sync note data to local state when note loads or changes
  useEffect(() => {
    if (note) {
      setTitle(note.title || '')
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
      const titleLine = title ? `# ${title}\n\n` : ''
      downloadMarkdown(titleLine + markdown, title || 'Untitled')
    } catch (error) {
      console.error('Failed to export note:', error)
    }
  }, [editor, note, title])

  // Generate AI title
  const handleGenerateTitle = useCallback(async () => {
    if (!noteId || isGenerating) return
    try {
      const suggestions = await generateSuggestions(noteId, 'title')
      if (suggestions?.title) {
        setTitle(suggestions.title)
        // Also save to database
        await updateNote.mutateAsync({ id: noteId, updates: { title: suggestions.title } })
      }
    } catch (error) {
      console.error('Failed to generate title:', error)
    }
  }, [noteId, isGenerating, generateSuggestions, updateNote])

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
      {/* Header */}
      <div className="px-6 pt-6 pb-3 border-b border-border space-y-2">
        <div className="flex items-start justify-between gap-2">
          <input
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Untitled"
            className={cn(
              'flex-1 text-2xl font-semibold text-foreground',
              'bg-transparent border-none outline-none',
              'placeholder:text-muted-foreground/50'
            )}
          />
          <div className="flex items-center gap-1">
            <button
              onClick={handleGenerateTitle}
              disabled={isGenerating}
              className={cn(
                'p-2 rounded-lg hover:bg-secondary transition-colors',
                isGenerating && 'animate-pulse'
              )}
              title="Generate title with AI"
            >
              <Wand2 className="h-4 w-4 text-muted-foreground" />
            </button>
            <button
              onClick={handleExport}
              className="p-2 rounded-lg hover:bg-secondary transition-colors"
              title="Export to Markdown"
            >
              <Download className="h-4 w-4 text-muted-foreground" />
            </button>
          </div>
        </div>
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          <span>{formattedDate}</span>
          {isSaving && (
            <span className="text-primary">Saving...</span>
          )}
          {isGenerating && (
            <span className="text-primary">Generating...</span>
          )}
        </div>
        <TagPicker noteId={noteId} />
      </div>

      {/* Editor */}
      <div className="flex-1 overflow-auto">
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
