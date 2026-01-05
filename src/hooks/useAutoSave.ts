import { useEffect, useRef, useCallback } from 'react'
import { useDebounce } from './useDebounce'
import { useUpdateNote } from './useNotes'
import { useEmbedNote } from './useAI'

export function useAutoSave(
  noteId: string | null,
  content: unknown[] | null,
  title: string,
  /** The original content from the database - used as baseline to detect actual changes */
  originalContent?: unknown[] | null,
  /** The original title from the database */
  originalTitle?: string
) {
  const updateNote = useUpdateNote()
  const { embedNote } = useEmbedNote()
  const debouncedContent = useDebounce(content, 500)
  const debouncedTitle = useDebounce(title, 500)
  // Longer debounce for embeddings to avoid too many API calls
  const debouncedForEmbedding = useDebounce(content, 3000)
  const isInitialized = useRef(false)
  const lastSavedContent = useRef<string | null>(null)
  const lastSavedTitle = useRef<string | null>(null)
  const lastEmbeddedContent = useRef<string | null>(null)
  const embedTimeoutRef = useRef<NodeJS.Timeout | null>(null)

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
    if (originalContent !== undefined && originalTitle !== undefined && !isInitialized.current) {
      lastSavedContent.current = JSON.stringify(originalContent)
      lastSavedTitle.current = originalTitle
      lastEmbeddedContent.current = JSON.stringify(originalContent)
      isInitialized.current = true
    }
  }, [originalContent, originalTitle])

  useEffect(() => {
    // Don't save until we've initialized with the DB content
    if (!isInitialized.current) return
    if (!noteId) return

    const contentStr = JSON.stringify(debouncedContent)
    const contentChanged = contentStr !== lastSavedContent.current
    const titleChanged = debouncedTitle !== lastSavedTitle.current

    if (contentChanged || titleChanged) {
      const updates: { content?: unknown[]; title?: string } = {}

      if (contentChanged && debouncedContent) {
        updates.content = debouncedContent
        lastSavedContent.current = contentStr
      }

      if (titleChanged) {
        updates.title = debouncedTitle
        lastSavedTitle.current = debouncedTitle
      }

      if (Object.keys(updates).length > 0) {
        updateNote.mutate({ id: noteId, updates })
      }
    }
  }, [debouncedContent, debouncedTitle, noteId, updateNote])

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
    lastSavedTitle.current = null
    lastEmbeddedContent.current = null
  }, [noteId])

  return { isSaving: updateNote.isPending }
}
