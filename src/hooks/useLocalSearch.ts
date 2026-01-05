import { useState, useEffect, useCallback } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import * as noteCache from '@/lib/noteCache'
import * as notesApi from '@/api/notes'
import type { Note, NotePreview } from '@/lib/types'
import { extractTextPreview } from '@/lib/utils'

// Transform Note to NotePreview
function toNotePreview(note: Note): NotePreview {
  return {
    id: note.id,
    title: note.title || 'Untitled',
    preview: note.content_text || extractTextPreview(note.content as unknown[], 100),
    updated_at: note.updated_at,
    is_pinned: note.is_pinned,
    folder_id: note.folder_id,
  }
}

// Hook to sync notes to IndexedDB cache
export function useNoteCacheSync() {
  const queryClient = useQueryClient()
  const [isSyncing, setIsSyncing] = useState(false)
  const [lastSynced, setLastSynced] = useState<Date | null>(null)

  // Sync notes from Supabase to IndexedDB
  const syncNotes = useCallback(async () => {
    try {
      setIsSyncing(true)
      const notes = await notesApi.getAllNotes()
      await noteCache.cacheNotes(notes)
      setLastSynced(new Date())

      // Update React Query cache too
      queryClient.setQueryData(['notes', 'all'], notes)
    } catch (error) {
      console.error('Failed to sync notes to cache:', error)
    } finally {
      setIsSyncing(false)
    }
  }, [queryClient])

  // Initial sync on mount
  useEffect(() => {
    syncNotes()
  }, [syncNotes])

  // Periodic sync (every 5 minutes)
  useEffect(() => {
    const interval = setInterval(syncNotes, 5 * 60 * 1000)
    return () => clearInterval(interval)
  }, [syncNotes])

  return {
    syncNotes,
    isSyncing,
    lastSynced
  }
}

// Hook for instant local search
export function useLocalSearch(query: string) {
  const [results, setResults] = useState<NotePreview[]>([])
  const [isSearching, setIsSearching] = useState(false)

  useEffect(() => {
    if (!query || query.length < 2) {
      setResults([])
      return
    }

    const searchLocal = async () => {
      setIsSearching(true)
      try {
        const notes = await noteCache.searchCachedNotes(query)
        setResults(notes.map(toNotePreview))
      } catch (error) {
        console.error('Local search failed:', error)
        setResults([])
      } finally {
        setIsSearching(false)
      }
    }

    // Debounce search by 100ms for instant feel but not too aggressive
    const timeoutId = setTimeout(searchLocal, 100)
    return () => clearTimeout(timeoutId)
  }, [query])

  return {
    results,
    isSearching,
    hasResults: results.length > 0
  }
}

// Hook that combines local cache with Supabase data
// Returns cached data immediately, then updates with fresh data
export function useCachedNotes(folderId?: string | null) {
  const [cachedData, setCachedData] = useState<Note[]>([])
  const [isLoadingCache, setIsLoadingCache] = useState(true)

  // Load from cache immediately
  useEffect(() => {
    const loadCache = async () => {
      try {
        const notes = folderId === undefined
          ? await noteCache.getCachedNotes()
          : await noteCache.getNotesByFolder(folderId ?? null)
        setCachedData(notes)
      } catch (error) {
        console.error('Failed to load cache:', error)
      } finally {
        setIsLoadingCache(false)
      }
    }
    loadCache()
  }, [folderId])

  // Fetch fresh data from Supabase
  const { data: freshData, isLoading: isLoadingFresh, refetch } = useQuery({
    queryKey: ['notes', { folderId }],
    queryFn: async () => {
      const notes = folderId === undefined
        ? await notesApi.getAllNotes()
        : await notesApi.getNotes(folderId)

      // Update cache with fresh data
      await noteCache.cacheNotes(notes)
      return notes
    },
    staleTime: 1000 * 60, // Consider fresh for 1 minute
  })

  // Merge: show cached data immediately, replace with fresh when available
  const notes = freshData ?? cachedData
  const isLoading = isLoadingCache && isLoadingFresh

  return {
    notes,
    notePreviews: notes.map(toNotePreview),
    isLoading,
    isStale: !freshData && cachedData.length > 0,
    refetch
  }
}

// Hook for fast note lookup from cache
export function useCachedNote(id: string | null) {
  const [cachedNote, setCachedNote] = useState<Note | null>(null)

  useEffect(() => {
    if (!id) {
      setCachedNote(null)
      return
    }

    noteCache.getCachedNote(id).then(note => {
      if (note) setCachedNote(note)
    })
  }, [id])

  // Also fetch fresh from Supabase
  const { data: freshNote, isLoading } = useQuery({
    queryKey: ['note', id],
    queryFn: async () => {
      const note = await notesApi.getNote(id!)
      // Update cache
      if (note) await noteCache.setCachedNote(note)
      return note
    },
    enabled: !!id,
  })

  return {
    note: freshNote ?? cachedNote,
    isLoading: !cachedNote && isLoading
  }
}
