import { useEffect, useRef, useCallback, useMemo } from 'react'
import { useDebounce } from './useDebounce'
import { useUpdateNote } from './useNotes'
import { useEmbedNote } from './useAI'
import { extractFirstLine } from '@/lib/utils'

export function useAutoSave(
  noteId: string | null,
  content: unknown[] | null,
  /** The original content from the database - used as baseline to detect actual changes */
  originalContent?: unknown[] | null
) {
  const updateNote = useUpdateNote()
  const { embedNote } = useEmbedNote()
  const debouncedContent = useDebounce(content, 500)
  // Longer debounce for embeddings to avoid too many API calls
  const debouncedForEmbedding = useDebounce(content, 3000)
  const isInitialized = useRef(false)
  const lastSavedContent = useRef<string | null>(null)
  const lastEmbeddedContent = useRef<string | null>(null)
  const embedTimeoutRef = useRef<NodeJS.Timeout | null>(null)

  // Derive title from first line of content
  const derivedTitle = useMemo(() => {
    return extractFirstLine(debouncedContent || [])
  }, [debouncedContent])

  // Trigger embedding after content stabilizes
  const triggerEmbedding = useCallback(async (id: string) => {
    try {
      await embedNote(id)
    } catch (error) {
      // Silently fail - embeddings are not critical
      console.warn('Failed to embed note:', error)
    }
  }, [embedNote])

  // Initialize baseline from original DB content once it's available
  useEffect(() => {
    if (originalContent !== undefined && !isInitialized.current) {
      lastSavedContent.current = JSON.stringify(originalContent)
      lastEmbeddedContent.current = JSON.stringify(originalContent)
      isInitialized.current = true
    }
  }, [originalContent])

  useEffect(() => {
    // Don't save until we've initialized with the DB content
    if (!isInitialized.current) return
    if (!noteId) return

    const contentStr = JSON.stringify(debouncedContent)
    const contentChanged = contentStr !== lastSavedContent.current

    if (contentChanged && debouncedContent) {
      lastSavedContent.current = contentStr
      // Save both content and derived title (from first line)
      updateNote.mutate({
        id: noteId,
        updates: {
          content: debouncedContent,
          title: derivedTitle
        }
      })
    }
  }, [debouncedContent, derivedTitle, noteId, updateNote])

  // Separate effect for embeddings with longer debounce
  useEffect(() => {
    // Don't embed until we've initialized with the DB content
    if (!isInitialized.current) return
    if (!noteId || !debouncedForEmbedding) return

    const contentStr = JSON.stringify(debouncedForEmbedding)

    // Only embed if content has actually changed since last embedding
    if (contentStr !== lastEmbeddedContent.current) {
      // Clear any pending embedding
      if (embedTimeoutRef.current) {
        clearTimeout(embedTimeoutRef.current)
      }

      // Schedule embedding after a brief delay
      embedTimeoutRef.current = setTimeout(() => {
        lastEmbeddedContent.current = contentStr
        triggerEmbedding(noteId)
      }, 500)
    }

    return () => {
      if (embedTimeoutRef.current) {
        clearTimeout(embedTimeoutRef.current)
      }
    }
  }, [debouncedForEmbedding, noteId, triggerEmbedding])

  // Reset tracking when note changes
  useEffect(() => {
    isInitialized.current = false
    lastSavedContent.current = null
    lastEmbeddedContent.current = null
  }, [noteId])

  return { isSaving: updateNote.isPending }
}
