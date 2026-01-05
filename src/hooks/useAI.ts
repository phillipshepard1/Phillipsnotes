import { useState, useCallback, useRef } from 'react'
import { supabase } from '@/lib/supabase'

interface Message {
  id: string
  role: 'user' | 'assistant'
  content: string
  sources?: Array<{ noteId: string; title: string }>
  isStreaming?: boolean
}

interface UseAIChatOptions {
  noteId?: string // Optional: focus on specific note
  onSourceClick?: (noteId: string) => void
}

export function useAIChat(options: UseAIChatOptions = {}) {
  const [messages, setMessages] = useState<Message[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const abortControllerRef = useRef<AbortController | null>(null)

  const sendMessage = useCallback(async (query: string) => {
    if (!query.trim() || isLoading) return

    setError(null)
    setIsLoading(true)

    // Add user message
    const userMessage: Message = {
      id: `user-${Date.now()}`,
      role: 'user',
      content: query,
    }
    setMessages(prev => [...prev, userMessage])

    // Create assistant message placeholder
    const assistantId = `assistant-${Date.now()}`
    const assistantMessage: Message = {
      id: assistantId,
      role: 'assistant',
      content: '',
      isStreaming: true,
    }
    setMessages(prev => [...prev, assistantMessage])

    try {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) {
        throw new Error('Not authenticated')
      }

      // Get project URL from environment
      const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
      const functionUrl = `${supabaseUrl}/functions/v1/ai-chat`

      // Create abort controller for cancellation
      abortControllerRef.current = new AbortController()

      const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY
      const response = await fetch(functionUrl, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${session.access_token}`,
          'apikey': anonKey,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          query,
          noteId: options.noteId,
          messages: messages.filter(m => !m.isStreaming).map(m => ({
            role: m.role,
            content: m.content,
          })),
        }),
        signal: abortControllerRef.current.signal,
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Failed to get response')
      }

      // Handle streaming response
      const reader = response.body?.getReader()
      if (!reader) throw new Error('No response body')

      const decoder = new TextDecoder()
      let buffer = ''
      let accumulatedContent = ''
      let sources: Array<{ noteId: string; title: string }> = []

      while (true) {
        const { done, value } = await reader.read()
        if (done) break

        buffer += decoder.decode(value, { stream: true })
        const lines = buffer.split('\n')
        buffer = lines.pop() || ''

        for (const line of lines) {
          if (line.startsWith('data: ')) {
            const data = line.slice(6)
            if (data === '[DONE]') continue

            try {
              const parsed = JSON.parse(data)

              if (parsed.type === 'sources') {
                sources = parsed.sources
              } else if (parsed.type === 'content') {
                accumulatedContent += parsed.content
                // Update message in real-time
                setMessages(prev => prev.map(m =>
                  m.id === assistantId
                    ? { ...m, content: accumulatedContent, sources }
                    : m
                ))
              } else if (parsed.type === 'error') {
                throw new Error(parsed.error)
              }
            } catch (e) {
              // Skip invalid JSON
              if (e instanceof SyntaxError) continue
              throw e
            }
          }
        }
      }

      // Mark as complete
      setMessages(prev => prev.map(m =>
        m.id === assistantId
          ? { ...m, isStreaming: false }
          : m
      ))
    } catch (err) {
      if (err instanceof Error && err.name === 'AbortError') {
        // User cancelled, remove the streaming message
        setMessages(prev => prev.filter(m => m.id !== assistantId))
      } else {
        const errorMessage = err instanceof Error ? err.message : 'An error occurred'
        setError(errorMessage)
        // Update message with error
        setMessages(prev => prev.map(m =>
          m.id === assistantId
            ? { ...m, content: `Error: ${errorMessage}`, isStreaming: false }
            : m
        ))
      }
    } finally {
      setIsLoading(false)
      abortControllerRef.current = null
    }
  }, [isLoading, messages, options.noteId])

  const cancelRequest = useCallback(() => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort()
    }
  }, [])

  const clearMessages = useCallback(() => {
    setMessages([])
    setError(null)
  }, [])

  return {
    messages,
    isLoading,
    error,
    sendMessage,
    cancelRequest,
    clearMessages,
  }
}

// Hook for semantic search
interface SemanticSearchResult {
  note_id: string
  title: string
  preview: string
  similarity: number
}

export function useSemanticSearch() {
  const [results, setResults] = useState<SemanticSearchResult[]>([])
  const [isSearching, setIsSearching] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const search = useCallback(async (query: string) => {
    if (!query.trim() || query.length < 2) {
      setResults([])
      return
    }

    setIsSearching(true)
    setError(null)

    try {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) {
        throw new Error('Not authenticated')
      }

      const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
      const functionUrl = `${supabaseUrl}/functions/v1/semantic-search`
      const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY

      const response = await fetch(functionUrl, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${session.access_token}`,
          'apikey': anonKey,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ query, limit: 20 }),
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Search failed')
      }

      const data = await response.json()
      setResults(data.results || [])
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'An error occurred'
      setError(errorMessage)
      setResults([])
    } finally {
      setIsSearching(false)
    }
  }, [])

  const clearResults = useCallback(() => {
    setResults([])
    setError(null)
  }, [])

  return {
    results,
    isSearching,
    error,
    search,
    clearResults,
  }
}

// Hook for related notes
interface RelatedNote {
  note_id: string
  title: string
  preview: string
  similarity: number
}

export function useRelatedNotes(noteId: string | null) {
  const [relatedNotes, setRelatedNotes] = useState<RelatedNote[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const fetchRelatedNotes = useCallback(async () => {
    if (!noteId) {
      setRelatedNotes([])
      return
    }

    setIsLoading(true)
    setError(null)

    try {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) {
        throw new Error('Not authenticated')
      }

      const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
      const functionUrl = `${supabaseUrl}/functions/v1/related-notes`
      const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY

      const response = await fetch(functionUrl, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${session.access_token}`,
          'apikey': anonKey,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ noteId, limit: 5 }),
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Failed to get related notes')
      }

      const data = await response.json()
      setRelatedNotes(data.results || [])
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'An error occurred'
      setError(errorMessage)
      setRelatedNotes([])
    } finally {
      setIsLoading(false)
    }
  }, [noteId])

  return {
    relatedNotes,
    isLoading,
    error,
    fetchRelatedNotes,
  }
}

// Hook for AI suggestions (auto-title and auto-tags)
interface AISuggestions {
  title?: string
  tags?: string[]
}

export function useAISuggestions() {
  const [isGenerating, setIsGenerating] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const generateSuggestions = useCallback(async (
    noteId: string,
    mode: 'title' | 'tags' | 'both' = 'both'
  ): Promise<AISuggestions | null> => {
    setIsGenerating(true)
    setError(null)

    try {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) {
        throw new Error('Not authenticated')
      }

      const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
      const functionUrl = `${supabaseUrl}/functions/v1/ai-suggest`
      const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY

      const response = await fetch(functionUrl, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${session.access_token}`,
          'apikey': anonKey,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ noteId, mode }),
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Failed to generate suggestions')
      }

      const data = await response.json()
      return data
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'An error occurred'
      setError(errorMessage)
      return null
    } finally {
      setIsGenerating(false)
    }
  }, [])

  return {
    generateSuggestions,
    isGenerating,
    error,
  }
}

// Hook for embedding notes
export function useEmbedNote() {
  const [isEmbedding, setIsEmbedding] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const embedNote = useCallback(async (noteId: string) => {
    setIsEmbedding(true)
    setError(null)

    try {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) {
        throw new Error('Not authenticated')
      }

      const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
      const functionUrl = `${supabaseUrl}/functions/v1/embed-note`
      const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY

      const response = await fetch(functionUrl, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${session.access_token}`,
          'apikey': anonKey,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ noteId }),
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Failed to embed note')
      }

      const result = await response.json()
      return result
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'An error occurred'
      setError(errorMessage)
      throw err
    } finally {
      setIsEmbedding(false)
    }
  }, [])

  return {
    embedNote,
    isEmbedding,
    error,
  }
}
