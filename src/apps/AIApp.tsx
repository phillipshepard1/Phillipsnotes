import { useState, useRef, useEffect } from 'react'
import { QueryClientProvider } from '@tanstack/react-query'
import { queryClient } from '@/lib/queryClient'
import { AuthProvider } from '@/components/auth/AuthProvider'
import { ThemeProvider } from '@/hooks/useTheme'
import { LoginForm } from '@/components/auth/LoginForm'
import { useAuth } from '@/hooks/useAuth'
import { useAIChat, useSemanticSearch } from '@/hooks/useAI'
import { ChatMessage } from '@/components/ai/ChatMessage'
import { ChatInput } from '@/components/ai/ChatInput'
import { SemanticSearchResults } from '@/components/search/SemanticSearchResults'
import { Sparkles, Search, Trash2, X } from 'lucide-react'
import { cn } from '@/lib/utils'

function AIAppContent() {
  const { user, isLoading: authLoading } = useAuth()
  const [activeTab, setActiveTab] = useState<'chat' | 'search'>('chat')
  const [searchQuery, setSearchQuery] = useState('')
  const messagesEndRef = useRef<HTMLDivElement>(null)

  // AI Chat
  const { messages, isLoading, error, sendMessage, clearMessages } = useAIChat({})

  // Semantic Search
  const {
    results: searchResults,
    isSearching,
    search: performSearch,
    clearResults,
  } = useSemanticSearch()

  // Auto-scroll to bottom on new messages
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  // Handle search
  const handleSearch = (query: string) => {
    setSearchQuery(query)
    if (query.length >= 2) {
      performSearch(query)
    } else {
      clearResults()
    }
  }

  // Handle opening note in Notes app
  const handleNoteSelect = (noteId: string) => {
    // Open in Notes app with noteId parameter
    window.location.href = `/?noteId=${noteId}`
  }

  if (authLoading) {
    return (
      <div className="h-screen flex items-center justify-center bg-background">
        <div className="text-center">
          <div className="animate-spin h-8 w-8 border-2 border-primary border-t-transparent rounded-full mx-auto" />
          <p className="mt-4 text-muted-foreground text-sm">Loading...</p>
        </div>
      </div>
    )
  }

  if (!user) {
    return <LoginForm />
  }

  return (
    <div className="h-screen flex flex-col bg-background">
      {/* Header */}
      <header
        className="flex-shrink-0 border-b border-border bg-card"
        style={{ paddingTop: 'env(safe-area-inset-top)' }}
      >
        <div className="flex items-center justify-between px-4 h-14">
          <div className="flex items-center gap-2">
            <div className="p-1.5 rounded-lg bg-primary/10">
              <Sparkles className="w-5 h-5 text-primary" />
            </div>
            <h1 className="font-semibold text-lg">Phillips AI</h1>
          </div>
          {activeTab === 'chat' && messages.length > 0 && (
            <button
              onClick={clearMessages}
              className="p-2 rounded-lg hover:bg-secondary transition-colors"
              title="Clear chat"
            >
              <Trash2 className="w-5 h-5 text-muted-foreground" />
            </button>
          )}
          {activeTab === 'search' && searchQuery && (
            <button
              onClick={() => {
                setSearchQuery('')
                clearResults()
              }}
              className="p-2 rounded-lg hover:bg-secondary transition-colors"
              title="Clear search"
            >
              <X className="w-5 h-5 text-muted-foreground" />
            </button>
          )}
        </div>

        {/* Tab switcher */}
        <div className="flex px-4 gap-1 pb-2">
          <button
            onClick={() => setActiveTab('chat')}
            className={cn(
              'flex-1 py-2 px-4 text-sm font-medium rounded-lg transition-colors',
              activeTab === 'chat'
                ? 'bg-primary text-primary-foreground'
                : 'bg-secondary text-muted-foreground hover:text-foreground'
            )}
          >
            <Sparkles className="w-4 h-4 inline-block mr-2" />
            Chat
          </button>
          <button
            onClick={() => setActiveTab('search')}
            className={cn(
              'flex-1 py-2 px-4 text-sm font-medium rounded-lg transition-colors',
              activeTab === 'search'
                ? 'bg-primary text-primary-foreground'
                : 'bg-secondary text-muted-foreground hover:text-foreground'
            )}
          >
            <Search className="w-4 h-4 inline-block mr-2" />
            Search
          </button>
        </div>
      </header>

      {/* Content */}
      <main className="flex-1 overflow-hidden flex flex-col">
        {activeTab === 'chat' ? (
          <>
            {/* Chat Messages */}
            <div className="flex-1 overflow-y-auto">
              {messages.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-full p-8 text-center">
                  <div className="w-20 h-20 rounded-full bg-primary/10 flex items-center justify-center mb-4">
                    <Sparkles className="w-10 h-10 text-primary" />
                  </div>
                  <h2 className="text-xl font-semibold text-foreground mb-2">
                    Chat with your notes
                  </h2>
                  <p className="text-muted-foreground max-w-sm mb-8">
                    Ask questions, get summaries, and discover connections across all your notes.
                  </p>
                  <div className="space-y-2 w-full max-w-sm">
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
                      onClick={() => sendMessage('What connections can you find?')}
                      disabled={isLoading}
                    >
                      What connections can you find?
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
                      onSourceClick={handleNoteSelect}
                    />
                  ))}
                  <div ref={messagesEndRef} />
                </div>
              )}

              {error && (
                <div className="mx-4 mb-4 p-3 bg-destructive/10 border border-destructive/20 rounded-lg">
                  <p className="text-sm text-destructive">{error}</p>
                </div>
              )}
            </div>

            {/* Chat Input */}
            <div style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}>
              <ChatInput
                onSend={sendMessage}
                disabled={isLoading}
                placeholder="Ask about your notes..."
              />
            </div>
          </>
        ) : (
          <>
            {/* Search Input */}
            <div className="px-4 py-3 border-b border-border">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => handleSearch(e.target.value)}
                  placeholder="Search your notes with AI..."
                  className="w-full pl-10 pr-4 py-3 rounded-xl bg-secondary border-0 focus:outline-none focus:ring-2 focus:ring-primary/50 text-foreground placeholder:text-muted-foreground"
                  autoFocus
                />
              </div>
              {searchQuery.length > 0 && searchQuery.length < 2 && (
                <p className="text-xs text-muted-foreground mt-2 text-center">
                  Type at least 2 characters to search
                </p>
              )}
            </div>

            {/* Search Results */}
            <div
              className="flex-1 overflow-y-auto"
              style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}
            >
              {searchQuery.length >= 2 ? (
                <SemanticSearchResults
                  results={searchResults}
                  isLoading={isSearching}
                  selectedNoteId={null}
                  onNoteSelect={handleNoteSelect}
                />
              ) : (
                <div className="flex flex-col items-center justify-center h-full p-8 text-center">
                  <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center mb-4">
                    <Search className="w-8 h-8 text-primary" />
                  </div>
                  <h3 className="font-medium text-foreground mb-2">
                    AI-powered search
                  </h3>
                  <p className="text-sm text-muted-foreground max-w-xs">
                    Find notes by meaning, not just keywords. Describe what you're looking for.
                  </p>
                </div>
              )}
            </div>
          </>
        )}
      </main>
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
        'w-full text-left px-4 py-3 text-sm rounded-xl',
        'bg-secondary text-foreground hover:bg-secondary/80 transition-colors',
        'disabled:opacity-50 disabled:cursor-not-allowed'
      )}
    >
      {children}
    </button>
  )
}

export default function AIApp() {
  return (
    <QueryClientProvider client={queryClient}>
      <ThemeProvider>
        <AuthProvider>
          <AIAppContent />
        </AuthProvider>
      </ThemeProvider>
    </QueryClientProvider>
  )
}
