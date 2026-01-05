import { useRef, useEffect, useState } from 'react'
import { X, Trash2, Sparkles, FileText } from 'lucide-react'
import { ChatMessage } from './ChatMessage'
import { ChatInput } from './ChatInput'
import { useAIChat } from '@/hooks/useAI'
import { useCreateNote } from '@/hooks/useNotes'
import { cn } from '@/lib/utils'

interface Message {
  id: string
  role: 'user' | 'assistant'
  content: string
  sources?: Array<{ noteId: string; title: string }>
  isStreaming?: boolean
}

function convertChatToBlocks(messages: Message[]) {
  const blocks: unknown[] = []

  // First user message becomes the title
  const firstUserMsg = messages.find(m => m.role === 'user')
  const title = firstUserMsg?.content.slice(0, 100) || 'AI Chat'

  // Add each message as formatted blocks
  for (const msg of messages) {
    // Role header (h3)
    blocks.push({
      type: 'heading',
      props: { level: 3 },
      content: [{ type: 'text', text: msg.role === 'user' ? 'You' : 'AI Assistant' }],
    })

    // Message content as paragraphs
    const paragraphs = msg.content.split('\n\n')
    for (const para of paragraphs) {
      if (para.trim()) {
        blocks.push({
          type: 'paragraph',
          content: [{ type: 'text', text: para }],
        })
      }
    }

    // Empty paragraph as spacer
    blocks.push({ type: 'paragraph', content: [] })
  }

  return { title, blocks }
}

interface AIChatSidebarProps {
  isOpen: boolean
  onClose: () => void
  noteId?: string // Optional: focus on specific note
  onNoteSelect?: (noteId: string) => void
}

export function AIChatSidebar({
  isOpen,
  onClose,
  noteId,
  onNoteSelect,
}: AIChatSidebarProps) {
  const { messages, isLoading, error, sendMessage, clearMessages } = useAIChat({
    noteId,
  })
  const createNote = useCreateNote()
  const [isSaving, setIsSaving] = useState(false)

  // Handle source click: navigate to note and close sidebar
  const handleSourceClick = (clickedNoteId: string) => {
    if (onNoteSelect) {
      onNoteSelect(clickedNoteId)
      onClose() // Close sidebar so user can see the note
    }
  }

  // Save chat as a new note
  const handleSaveAsNote = async () => {
    if (messages.length === 0 || isSaving) return

    setIsSaving(true)
    try {
      const { title, blocks } = convertChatToBlocks(messages as Message[])

      const note = await createNote.mutateAsync({
        title,
        content: blocks,
      })

      // Navigate to the new note and close sidebar
      if (onNoteSelect) {
        onNoteSelect(note.id)
      }
      onClose()
    } catch (error) {
      console.error('Failed to save chat as note:', error)
    } finally {
      setIsSaving(false)
    }
  }

  const messagesEndRef = useRef<HTMLDivElement>(null)

  // Auto-scroll to bottom on new messages
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  if (!isOpen) return null

  return (
    <div
      className={cn(
        'fixed inset-y-0 right-0 w-96 bg-card shadow-xl z-50',
        'flex flex-col border-l border-border',
        'animate-in slide-in-from-right duration-200'
      )}
    >
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-border bg-gradient-to-r from-primary/5 to-primary/10">
        <div className="flex items-center gap-2">
          <div className="p-1.5 rounded-lg bg-primary/10">
            <Sparkles className="w-4 h-4 text-primary" />
          </div>
          <div>
            <h2 className="font-semibold text-foreground">AI Assistant</h2>
            <p className="text-xs text-muted-foreground">
              {noteId ? 'Focused on current note' : 'Search all notes'}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-1">
          {messages.length > 0 && (
            <>
              <button
                onClick={handleSaveAsNote}
                disabled={isSaving}
                className="p-2 rounded-lg hover:bg-secondary transition-colors disabled:opacity-50"
                title="Save as note"
              >
                <FileText className="w-4 h-4 text-muted-foreground" />
              </button>
              <button
                onClick={clearMessages}
                className="p-2 rounded-lg hover:bg-secondary transition-colors"
                title="Clear chat"
              >
                <Trash2 className="w-4 h-4 text-muted-foreground" />
              </button>
            </>
          )}
          <button
            onClick={onClose}
            className="p-2 rounded-lg hover:bg-secondary transition-colors"
            title="Close"
          >
            <X className="w-4 h-4 text-muted-foreground" />
          </button>
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto">
        {messages.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full p-8 text-center">
            <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center mb-4">
              <Sparkles className="w-8 h-8 text-primary" />
            </div>
            <h3 className="font-medium text-foreground mb-2">
              Ask about your notes
            </h3>
            <p className="text-sm text-muted-foreground max-w-xs">
              I can help you find information, summarize content, and answer questions based on your notes.
            </p>
            <div className="mt-6 space-y-2 w-full max-w-xs">
              <SuggestionButton
                onClick={() => sendMessage('What are the main topics in my notes?')}
                disabled={isLoading}
              >
                What are the main topics in my notes?
              </SuggestionButton>
              <SuggestionButton
                onClick={() => sendMessage('Summarize my recent notes')}
                disabled={isLoading}
              >
                Summarize my recent notes
              </SuggestionButton>
              <SuggestionButton
                onClick={() => sendMessage('What did I write about today?')}
                disabled={isLoading}
              >
                What did I write about today?
              </SuggestionButton>
            </div>
          </div>
        ) : (
          <div>
            {messages.map((message) => (
              <ChatMessage
                key={message.id}
                role={message.role}
                content={message.content}
                sources={message.sources}
                isStreaming={message.isStreaming}
                onSourceClick={handleSourceClick}
              />
            ))}
            <div ref={messagesEndRef} />
          </div>
        )}

        {/* Error display */}
        {error && (
          <div className="mx-4 mb-4 p-3 bg-destructive/10 border border-destructive/20 rounded-lg">
            <p className="text-sm text-destructive">{error}</p>
          </div>
        )}
      </div>

      {/* Input */}
      <ChatInput
        onSend={sendMessage}
        disabled={isLoading}
        placeholder={noteId ? 'Ask about this note...' : 'Ask about your notes...'}
      />
    </div>
  )
}

function SuggestionButton({
  children,
  onClick,
  disabled,
}: {
  children: React.ReactNode
  onClick: () => void
  disabled?: boolean
}) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className={cn(
        'w-full text-left px-3 py-2 text-sm rounded-lg',
        'bg-secondary text-foreground hover:bg-secondary/80 transition-colors',
        'disabled:opacity-50 disabled:cursor-not-allowed'
      )}
    >
      {children}
    </button>
  )
}
