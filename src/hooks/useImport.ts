import { useState, useCallback } from 'react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import { fetchYouTubeTranscript, transcriptToBlocks } from '@/lib/importers'
import type { ImportedNote } from '@/lib/importers'

interface UseImportOptions {
  folderId?: string | null
  onSuccess?: (noteIds: string[]) => void
  onError?: (error: Error) => void
}

interface FormattedConversation {
  title: string
  messages: Array<{
    role: 'user' | 'assistant'
    content: string
  }>
  source: string
}

export function useImport(options: UseImportOptions = {}) {
  const [progress, setProgress] = useState<{
    current: number
    total: number
    message: string
  } | null>(null)
  const queryClient = useQueryClient()

  // Create note mutation
  const createNoteMutation = useMutation({
    mutationFn: async (note: ImportedNote) => {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) throw new Error('Not authenticated')

      const { data, error } = await supabase
        .from('notes')
        .insert({
          user_id: user.id,
          folder_id: options.folderId || null,
          title: note.title,
          content: note.content,
          content_text: note.contentText,
          source_type: note.sourceType,
          source_url: note.sourceUrl || null,
          source_metadata: note.sourceMetadata || null,
        })
        .select('id')
        .single()

      if (error) throw error
      return data.id
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notes'] })
    },
  })

  // Import YouTube transcript
  const importYouTube = useCallback(async (url: string, includeTimestamps = true, includeSummary = false) => {
    setProgress({
      current: 0,
      total: 1,
      message: includeSummary ? 'Fetching transcript & generating summary...' : 'Fetching transcript...'
    })

    try {
      const result = await fetchYouTubeTranscript(url, includeTimestamps, includeSummary)
      const blocks = transcriptToBlocks(result.transcript, {
        url: result.url,
        channelName: result.channelName,
        channelUrl: result.channelUrl,
        summary: result.summary,
      })

      setProgress({ current: 0, total: 1, message: 'Creating note...' })

      const noteId = await createNoteMutation.mutateAsync({
        title: result.title,
        content: blocks,
        contentText: result.transcript,
        sourceType: 'youtube_transcript',
        sourceUrl: result.url,
        sourceMetadata: {
          videoId: result.videoId,
          channelName: result.channelName,
          channelUrl: result.channelUrl,
        },
      })

      setProgress(null)
      options.onSuccess?.([noteId])
      return [noteId]
    } catch (error) {
      setProgress(null)
      const err = error instanceof Error ? error : new Error('Import failed')
      options.onError?.(err)
      throw err
    }
  }, [createNoteMutation, options])

  // Import from web URL
  const importWebUrl = useCallback(async (url: string, includeSummary = false) => {
    setProgress({
      current: 0,
      total: 1,
      message: includeSummary ? 'Fetching article & generating summary...' : 'Fetching article...'
    })

    try {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) {
        throw new Error('Not authenticated')
      }

      // Call the edge function to fetch and extract article content
      const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
      const functionUrl = `${supabaseUrl}/functions/v1/fetch-url`
      const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY

      const response = await fetch(functionUrl, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${session.access_token}`,
          'apikey': anonKey,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ url, includeSummary }),
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Failed to fetch article')
      }

      const result = await response.json()

      setProgress({ current: 0, total: 1, message: 'Creating note...' })

      // Convert content to blocks
      const blocks: unknown[] = []

      // Add summary if included
      if (result.summary) {
        blocks.push({
          type: 'heading',
          props: { level: 2 },
          content: [{ type: 'text', text: 'Summary' }],
        })
        blocks.push({
          type: 'paragraph',
          content: [{ type: 'text', text: result.summary }],
        })
        blocks.push({
          type: 'paragraph',
          content: [],
        })
      }

      // Add main content as paragraphs
      const paragraphs = result.content.split('\n\n')
      for (const para of paragraphs) {
        if (para.trim()) {
          blocks.push({
            type: 'paragraph',
            content: [{ type: 'text', text: para }],
          })
        }
      }

      // Add source info at the end
      blocks.push({
        type: 'paragraph',
        content: [],
      })
      blocks.push({
        type: 'paragraph',
        content: [
          { type: 'text', text: 'Source: ' },
          { type: 'link', href: url, content: [{ type: 'text', text: result.title || url }] },
        ],
      })

      const noteId = await createNoteMutation.mutateAsync({
        title: result.title || 'Imported Article',
        content: blocks,
        contentText: result.content,
        sourceType: 'web_import',
        sourceUrl: url,
        sourceMetadata: {
          domain: new URL(url).hostname,
          author: result.author,
          publishedDate: result.publishedDate,
        },
      })

      setProgress(null)
      options.onSuccess?.([noteId])
      return [noteId]
    } catch (error) {
      setProgress(null)
      const err = error instanceof Error ? error : new Error('Import failed')
      options.onError?.(err)
      throw err
    }
  }, [createNoteMutation, options])

  // Import from pasted text
  const importFromText = useCallback(async (text: string, formatAsChat: boolean) => {
    setProgress({ current: 0, total: 1, message: formatAsChat ? 'Formatting conversation...' : 'Creating note...' })

    try {
      let title: string
      let blocks: unknown[]
      let contentText: string
      let sourceMetadata: Record<string, unknown> = {}

      if (formatAsChat) {
        // Call the edge function to format the text as a conversation
        const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
        const functionUrl = `${supabaseUrl}/functions/v1/format-conversation`

        const response = await fetch(functionUrl, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ text }),
        })

        if (!response.ok) {
          const errorData = await response.json()
          throw new Error(errorData.error || 'Failed to format conversation')
        }

        const data: FormattedConversation = await response.json()

        title = data.title || 'Imported Conversation'
        contentText = text
        sourceMetadata = {
          source: data.source || 'pasted_text',
          formattedByAI: true,
        }

        // Convert messages to blocks
        blocks = []
        const sourceLabel = getSourceLabel(data.source)

        for (const msg of data.messages) {
          // Add role header
          blocks.push({
            type: 'heading',
            props: { level: 3 },
            content: [{ type: 'text', text: msg.role === 'user' ? 'You' : sourceLabel }],
          })

          // Add message content
          const paragraphs = msg.content.split('\n\n')
          for (const para of paragraphs) {
            if (para.trim()) {
              blocks.push({
                type: 'paragraph',
                content: [{ type: 'text', text: para }],
              })
            }
          }

          // Add separator
          blocks.push({
            type: 'paragraph',
            content: [],
          })
        }
      } else {
        // Plain text import - just create paragraphs
        title = 'Imported Text'
        contentText = text

        blocks = []
        const paragraphs = text.split('\n\n')
        for (const para of paragraphs) {
          if (para.trim()) {
            blocks.push({
              type: 'paragraph',
              content: [{ type: 'text', text: para }],
            })
          }
        }
      }

      setProgress({ current: 0, total: 1, message: 'Creating note...' })

      const noteId = await createNoteMutation.mutateAsync({
        title,
        content: blocks,
        contentText,
        sourceType: formatAsChat ? 'chat_import' : 'text_import',
        sourceMetadata,
      })

      setProgress(null)
      options.onSuccess?.([noteId])
      return [noteId]
    } catch (error) {
      setProgress(null)
      const err = error instanceof Error ? error : new Error('Import failed')
      options.onError?.(err)
      throw err
    }
  }, [createNoteMutation, options])

  return {
    importYouTube,
    importFromText,
    importWebUrl,
    progress,
    isImporting: progress !== null,
  }
}

function getSourceLabel(source: string): string {
  switch (source) {
    case 'chatgpt': return 'ChatGPT'
    case 'claude': return 'Claude'
    case 'grok': return 'Grok'
    case 'gemini': return 'Gemini'
    case 'deepseek': return 'DeepSeek'
    case 'perplexity': return 'Perplexity'
    default: return 'AI'
  }
}
