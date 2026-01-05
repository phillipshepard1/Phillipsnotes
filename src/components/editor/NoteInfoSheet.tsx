import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Info, X, Download, Calendar, Tag, FileText, RefreshCw, Sparkles, Plus } from 'lucide-react'
import { format, parseISO } from 'date-fns'
import { cn } from '@/lib/utils'
import { TagPicker } from '@/components/tags/TagPicker'
import { useRelatedNotes, useAISuggestions } from '@/hooks/useAI'
import { useNote } from '@/hooks/useNotes'
import { useTags, useCreateTag, useAddTagToNote } from '@/hooks/useTags'
import { useCreateBlockNote } from '@blocknote/react'
import { downloadMarkdown } from '@/lib/exporters/markdown'
import { extractFirstLine } from '@/lib/utils'

interface NoteInfoSheetProps {
  noteId: string
  onNoteSelect?: (noteId: string) => void
  isMobile?: boolean
  open?: boolean
  onOpenChange?: (open: boolean) => void
  autoSuggestTags?: boolean
}

export function NoteInfoSheet({ noteId, onNoteSelect, isMobile = false, open, onOpenChange, autoSuggestTags = false }: NoteInfoSheetProps) {
  const [internalOpen, setInternalOpen] = useState(false)

  // Support controlled and uncontrolled mode
  const isOpen = open !== undefined ? open : internalOpen
  const setIsOpen = (value: boolean) => {
    setInternalOpen(value)
    onOpenChange?.(value)
  }
  const [suggestedTags, setSuggestedTags] = useState<string[]>([])
  const [hasAutoSuggested, setHasAutoSuggested] = useState(false)
  const { data: note } = useNote(noteId)
  const { relatedNotes, isLoading, error, fetchRelatedNotes } = useRelatedNotes(noteId)
  const { generateSuggestions, isGenerating } = useAISuggestions()

  // Auto-suggest tags when opened with autoSuggestTags flag
  useEffect(() => {
    if (isOpen && autoSuggestTags && !hasAutoSuggested && !isGenerating) {
      setHasAutoSuggested(true)
      generateSuggestions(noteId, 'tags').then(result => {
        if (result?.tags) {
          setSuggestedTags(result.tags)
        }
      })
    }
    // Reset flag when sheet closes
    if (!isOpen) {
      setHasAutoSuggested(false)
    }
  }, [isOpen, autoSuggestTags, hasAutoSuggested, isGenerating, noteId, generateSuggestions])
  const { data: allTags = [] } = useTags()
  const createTag = useCreateTag()
  const addTag = useAddTagToNote()
  const editor = useCreateBlockNote()

  const handleSuggestTags = async () => {
    const result = await generateSuggestions(noteId, 'tags')
    if (result?.tags) {
      setSuggestedTags(result.tags)
    }
  }

  const handleAddSuggestedTag = async (tagName: string) => {
    // Check if tag already exists
    const existingTag = allTags.find(t => t.name.toLowerCase() === tagName.toLowerCase())

    if (existingTag) {
      await addTag.mutateAsync({ noteId, tagId: existingTag.id })
    } else {
      // Create new tag and add it
      const newTag = await createTag.mutateAsync({ name: tagName, color: 'gray' })
      await addTag.mutateAsync({ noteId, tagId: newTag.id })
    }

    // Remove from suggestions
    setSuggestedTags(prev => prev.filter(t => t !== tagName))
  }

  const formattedDate = note ? format(parseISO(note.updated_at), "MMMM d, yyyy 'at' h:mm a") : ''

  const handleExport = async () => {
    if (!note) return
    try {
      // Get content from note
      const content = note.content as unknown[]
      if (content && editor) {
        editor.replaceBlocks(editor.document, content as Parameters<typeof editor.replaceBlocks>[1])
        const markdown = await editor.blocksToMarkdownLossy(editor.document)
        const title = extractFirstLine(content)
        const titleLine = title !== 'New Note' ? `# ${title}\n\n` : ''
        downloadMarkdown(titleLine + markdown, title)
      }
    } catch (error) {
      console.error('Failed to export note:', error)
    }
  }

  const handleNoteClick = (id: string) => {
    setIsOpen(false)
    onNoteSelect?.(id)
  }

  return (
    <>
      {/* Info Button */}
      <button
        onClick={() => setIsOpen(true)}
        className={cn(
          'flex items-center justify-center rounded-full transition-colors',
          'text-muted-foreground hover:text-foreground hover:bg-secondary',
          isMobile ? 'h-9 w-9' : 'h-8 w-8'
        )}
        title="Note info"
      >
        <Info className={cn(isMobile ? 'h-5 w-5' : 'h-4 w-4')} />
      </button>

      {/* Sheet Overlay */}
      <AnimatePresence>
        {isOpen && (
          <>
            {/* Backdrop */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsOpen(false)}
              className="fixed inset-0 bg-black/40 z-50"
            />

            {/* Sheet */}
            <motion.div
              initial={{ y: '100%' }}
              animate={{ y: 0 }}
              exit={{ y: '100%' }}
              transition={{ type: 'spring', damping: 25, stiffness: 300 }}
              className={cn(
                'fixed bottom-0 left-0 right-0 z-50',
                'bg-background rounded-t-2xl shadow-xl',
                'max-h-[85vh] overflow-hidden flex flex-col'
              )}
              style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}
            >
              {/* Handle */}
              <div className="flex justify-center pt-3 pb-2">
                <div className="w-10 h-1 bg-muted-foreground/30 rounded-full" />
              </div>

              {/* Header */}
              <div className="flex items-center justify-between px-4 pb-3 border-b border-border">
                <h2 className="text-lg font-semibold">Note Info</h2>
                <button
                  onClick={() => setIsOpen(false)}
                  className="p-2 -mr-2 rounded-full hover:bg-secondary transition-colors"
                >
                  <X className="h-5 w-5 text-muted-foreground" />
                </button>
              </div>

              {/* Content */}
              <div className="flex-1 overflow-y-auto">
                {/* Date Section */}
                <div className="px-4 py-4 border-b border-border">
                  <div className="flex items-center gap-3">
                    <div className="flex items-center justify-center h-10 w-10 rounded-full bg-secondary">
                      <Calendar className="h-5 w-5 text-muted-foreground" />
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">Last modified</p>
                      <p className="text-[15px] font-medium">{formattedDate}</p>
                    </div>
                  </div>
                </div>

                {/* Tags Section */}
                <div className="px-4 py-4 border-b border-border">
                  <div className="flex items-start gap-3">
                    <div className="flex items-center justify-center h-10 w-10 rounded-full bg-secondary flex-shrink-0">
                      <Tag className="h-5 w-5 text-muted-foreground" />
                    </div>
                    <div className="flex-1 min-w-0 pt-1.5">
                      <div className="flex items-center justify-between mb-2">
                        <p className="text-sm text-muted-foreground">Tags</p>
                        <button
                          onClick={handleSuggestTags}
                          disabled={isGenerating}
                          className="flex items-center gap-1 px-2 py-1 text-xs rounded-lg bg-primary/10 text-primary hover:bg-primary/20 transition-colors disabled:opacity-50"
                        >
                          <Sparkles className={cn('h-3 w-3', isGenerating && 'animate-pulse')} />
                          {isGenerating ? 'Thinking...' : 'Suggest'}
                        </button>
                      </div>
                      <TagPicker noteId={noteId} />

                      {/* AI Suggested Tags */}
                      {suggestedTags.length > 0 && (
                        <div className="mt-3 pt-3 border-t border-border/50">
                          <p className="text-xs text-muted-foreground mb-2 flex items-center gap-1">
                            <Sparkles className="h-3 w-3 text-primary" />
                            Suggested tags (tap to add)
                          </p>
                          <div className="flex flex-wrap gap-1.5">
                            {suggestedTags.map(tag => (
                              <button
                                key={tag}
                                onClick={() => handleAddSuggestedTag(tag)}
                                className="inline-flex items-center gap-1 px-2.5 py-1 text-xs rounded-full bg-primary/10 text-primary hover:bg-primary/20 transition-colors"
                              >
                                <Plus className="h-3 w-3" />
                                {tag}
                              </button>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                {/* Related Notes Section */}
                {onNoteSelect && (
                  <div className="px-4 py-4 border-b border-border">
                    <div className="flex items-start gap-3">
                      <div className="flex items-center justify-center h-10 w-10 rounded-full bg-secondary flex-shrink-0">
                        <FileText className="h-5 w-5 text-muted-foreground" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between mb-2">
                          <p className="text-sm text-muted-foreground">Related Notes</p>
                          <button
                            onClick={() => fetchRelatedNotes()}
                            disabled={isLoading}
                            className="p-1.5 rounded-lg hover:bg-secondary transition-colors"
                          >
                            <RefreshCw className={cn('h-4 w-4 text-muted-foreground', isLoading && 'animate-spin')} />
                          </button>
                        </div>

                        {isLoading ? (
                          <p className="text-sm text-muted-foreground">Finding related notes...</p>
                        ) : error ? (
                          <p className="text-sm text-destructive">{error}</p>
                        ) : relatedNotes.length === 0 ? (
                          <p className="text-sm text-muted-foreground">No related notes found</p>
                        ) : (
                          <div className="space-y-1">
                            {relatedNotes.slice(0, 5).map((relatedNote) => (
                              <button
                                key={relatedNote.note_id}
                                onClick={() => handleNoteClick(relatedNote.note_id)}
                                className="w-full flex items-center gap-2 p-2 rounded-lg text-left hover:bg-secondary transition-colors"
                              >
                                <FileText className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                                <span className="text-[15px] truncate flex-1">
                                  {relatedNote.title || 'New Note'}
                                </span>
                                <span className="text-xs text-muted-foreground">
                                  {Math.round(relatedNote.similarity * 100)}%
                                </span>
                              </button>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                )}

                {/* Export Section */}
                <div className="px-4 py-4">
                  <button
                    onClick={handleExport}
                    className="w-full flex items-center gap-3 p-3 rounded-xl bg-secondary hover:bg-secondary/80 transition-colors"
                  >
                    <div className="flex items-center justify-center h-10 w-10 rounded-full bg-background">
                      <Download className="h-5 w-5 text-muted-foreground" />
                    </div>
                    <div className="text-left">
                      <p className="text-[15px] font-medium">Export to Markdown</p>
                      <p className="text-sm text-muted-foreground">Download as .md file</p>
                    </div>
                  </button>
                </div>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </>
  )
}
