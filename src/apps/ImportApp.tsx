import { useState } from 'react'
import { QueryClientProvider } from '@tanstack/react-query'
import { queryClient } from '@/lib/queryClient'
import { AuthProvider } from '@/components/auth/AuthProvider'
import { ThemeProvider } from '@/hooks/useTheme'
import { LoginForm } from '@/components/auth/LoginForm'
import { useAuth } from '@/hooks/useAuth'
import { useImport } from '@/hooks/useImport'
import { YouTubeImport } from '@/components/import/YouTubeImport'
import { TextImport } from '@/components/import/TextImport'
import { WebImport } from '@/components/import/WebImport'
import { UpdatePrompt } from '@/components/pwa'
import {
  Download,
  Youtube,
  ClipboardPaste,
  Globe,
  Mic,
  ArrowLeft,
  Loader2,
  CheckCircle,
  ExternalLink,
} from 'lucide-react'
import { cn } from '@/lib/utils'

type ImportType = 'youtube' | 'text' | 'web' | 'voice' | null

const IMPORT_OPTIONS = [
  {
    id: 'youtube' as const,
    label: 'YouTube',
    description: 'Import transcript from a video',
    icon: Youtube,
    color: 'text-red-500',
    bgColor: 'bg-red-500/10',
  },
  {
    id: 'web' as const,
    label: 'Web URL',
    description: 'Import article from any webpage',
    icon: Globe,
    color: 'text-blue-500',
    bgColor: 'bg-blue-500/10',
  },
  {
    id: 'text' as const,
    label: 'Paste Text',
    description: 'Paste text or AI conversation',
    icon: ClipboardPaste,
    color: 'text-purple-500',
    bgColor: 'bg-purple-500/10',
  },
  {
    id: 'voice' as const,
    label: 'Voice Note',
    description: 'Record and transcribe audio',
    icon: Mic,
    color: 'text-green-500',
    bgColor: 'bg-green-500/10',
    disabled: true,
    comingSoon: true,
  },
]

function ImportAppContent() {
  const { user, isLoading: authLoading } = useAuth()
  const [activeImport, setActiveImport] = useState<ImportType>(null)
  const [successNoteId, setSuccessNoteId] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  const {
    importYouTube,
    importFromText,
    importWebUrl,
    progress,
    isImporting,
  } = useImport({
    onSuccess: (noteIds) => {
      if (noteIds.length > 0) {
        setSuccessNoteId(noteIds[0])
      }
    },
    onError: (err) => {
      setError(err.message)
    },
  })

  const handleYouTubeImport = async (url: string, includeTimestamps: boolean, includeSummary: boolean) => {
    setError(null)
    await importYouTube(url, includeTimestamps, includeSummary)
  }

  const handleTextImport = async (text: string, formatAsChat: boolean) => {
    setError(null)
    await importFromText(text, formatAsChat)
  }

  const handleWebImport = async (url: string, includeSummary: boolean) => {
    setError(null)
    await importWebUrl(url, includeSummary)
  }

  const handleBack = () => {
    setActiveImport(null)
    setError(null)
    setSuccessNoteId(null)
  }

  const handleViewNote = () => {
    if (successNoteId) {
      // Use window.open to try to launch the Notes PWA instead of in-app browser
      // On iOS, this opens Safari which may redirect to the installed PWA
      const url = `${window.location.origin}/?noteId=${successNoteId}`
      window.open(url, '_blank', 'noopener,noreferrer')
    }
  }

  const handleImportAnother = () => {
    setSuccessNoteId(null)
    setError(null)
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

  // Success state
  if (successNoteId) {
    return (
      <div className="h-screen flex flex-col bg-background">
        <header
          className="flex-shrink-0 border-b border-border bg-card"
          style={{ paddingTop: 'env(safe-area-inset-top)' }}
        >
          <div className="flex items-center gap-3 px-4 h-14">
            <div className="p-1.5 rounded-lg bg-green-500/10">
              <CheckCircle className="w-5 h-5 text-green-500" />
            </div>
            <h1 className="font-semibold text-lg">Import Complete</h1>
          </div>
        </header>

        <main className="flex-1 flex flex-col items-center justify-center p-8">
          <div className="w-20 h-20 rounded-full bg-green-500/10 flex items-center justify-center mb-6">
            <CheckCircle className="w-10 h-10 text-green-500" />
          </div>
          <h2 className="text-xl font-semibold mb-2">Note Created!</h2>
          <p className="text-muted-foreground text-center mb-8">
            Your content has been imported and is ready to view.
          </p>
          <div className="space-y-3 w-full max-w-sm">
            <button
              onClick={handleViewNote}
              className="w-full flex items-center justify-center gap-2 py-3 px-4 rounded-xl bg-primary text-primary-foreground font-medium"
            >
              <ExternalLink className="w-5 h-5" />
              View in Notes
            </button>
            <button
              onClick={handleImportAnother}
              className="w-full py-3 px-4 rounded-xl bg-secondary text-foreground font-medium"
            >
              Import Another
            </button>
          </div>
        </main>
      </div>
    )
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
            {activeImport && (
              <button
                onClick={handleBack}
                disabled={isImporting}
                className="p-2 -ml-2 rounded-lg hover:bg-secondary transition-colors disabled:opacity-50"
              >
                <ArrowLeft className="w-5 h-5 text-muted-foreground" />
              </button>
            )}
            <div className="p-1.5 rounded-lg bg-emerald-500/10">
              <Download className="w-5 h-5 text-emerald-500" />
            </div>
            <h1 className="font-semibold text-lg">
              {activeImport
                ? IMPORT_OPTIONS.find((o) => o.id === activeImport)?.label
                : 'Import Notes'}
            </h1>
          </div>
        </div>
      </header>

      {/* Content */}
      <main
        className="flex-1 overflow-y-auto"
        style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}
      >
        {/* Progress */}
        {progress && (
          <div className="mx-4 mt-4 p-4 bg-primary/10 rounded-xl">
            <div className="flex items-center gap-2 mb-2">
              <Loader2 className="w-4 h-4 animate-spin text-primary" />
              <span className="text-sm font-medium text-primary">
                {progress.message}
              </span>
            </div>
            {progress.total > 1 && (
              <div className="w-full bg-primary/20 rounded-full h-2">
                <div
                  className="bg-primary h-2 rounded-full transition-all"
                  style={{
                    width: `${((progress.current + 1) / progress.total) * 100}%`,
                  }}
                />
              </div>
            )}
          </div>
        )}

        {/* Error */}
        {error && (
          <div className="mx-4 mt-4 p-4 bg-destructive/10 border border-destructive/20 rounded-xl">
            <p className="text-sm text-destructive">{error}</p>
          </div>
        )}

        {!activeImport ? (
          // Import options grid
          <div className="p-4">
            <p className="text-muted-foreground mb-6">
              Choose how you'd like to import content into your notes.
            </p>
            <div className="grid gap-3">
              {IMPORT_OPTIONS.map((option) => (
                <button
                  key={option.id}
                  onClick={() => !option.disabled && setActiveImport(option.id)}
                  disabled={option.disabled}
                  className={cn(
                    'flex items-center gap-4 p-4 rounded-xl text-left transition-colors',
                    'bg-card border border-border',
                    option.disabled
                      ? 'opacity-50 cursor-not-allowed'
                      : 'hover:bg-secondary/50 active:bg-secondary'
                  )}
                >
                  <div className={cn('p-3 rounded-xl', option.bgColor)}>
                    <option.icon className={cn('w-6 h-6', option.color)} />
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <span className="font-medium text-foreground">
                        {option.label}
                      </span>
                      {option.comingSoon && (
                        <span className="text-xs px-2 py-0.5 rounded-full bg-muted text-muted-foreground">
                          Coming soon
                        </span>
                      )}
                    </div>
                    <p className="text-sm text-muted-foreground mt-0.5">
                      {option.description}
                    </p>
                  </div>
                </button>
              ))}
            </div>
          </div>
        ) : (
          // Active import form
          <div className="p-4">
            {activeImport === 'youtube' && (
              <YouTubeImport
                onImport={handleYouTubeImport}
                disabled={isImporting}
              />
            )}
            {activeImport === 'text' && (
              <TextImport
                onImport={handleTextImport}
                disabled={isImporting}
              />
            )}
            {activeImport === 'web' && (
              <WebImport
                onImport={handleWebImport}
                disabled={isImporting}
              />
            )}
          </div>
        )}
      </main>
    </div>
  )
}

export default function ImportApp() {
  return (
    <QueryClientProvider client={queryClient}>
      <ThemeProvider>
        <AuthProvider>
          <ImportAppContent />
          <UpdatePrompt />
        </AuthProvider>
      </ThemeProvider>
    </QueryClientProvider>
  )
}
