import { useState } from 'react'
import { X, Youtube, Loader2, ClipboardPaste } from 'lucide-react'
import { Dialog, DialogContent, DialogHeader, DialogBody } from '@/components/ui/dialog'
import { YouTubeImport } from './YouTubeImport'
import { TextImport } from './TextImport'
import { useImport } from '@/hooks/useImport'
import { cn } from '@/lib/utils'

interface ImportDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  folderId?: string | null
  onNoteCreated?: (noteId: string) => void
}

type TabId = 'text' | 'youtube'

const IMPORT_TABS: Array<{
  id: TabId
  label: string
  icon: React.ReactNode
  description: string
}> = [
  {
    id: 'text',
    label: 'Paste Text',
    icon: <ClipboardPaste className="w-4 h-4" />,
    description: 'Paste copied conversation text from any AI chat',
  },
  {
    id: 'youtube',
    label: 'YouTube',
    icon: <Youtube className="w-4 h-4" />,
    description: 'Import transcript from a YouTube video',
  },
]

export function ImportDialog({
  open,
  onOpenChange,
  folderId,
  onNoteCreated,
}: ImportDialogProps) {
  const [activeTab, setActiveTab] = useState<TabId>('text')
  const [error, setError] = useState<string | null>(null)

  const {
    importYouTube,
    importFromText,
    progress,
    isImporting,
  } = useImport({
    folderId,
    onSuccess: (noteIds) => {
      if (noteIds.length > 0) {
        onNoteCreated?.(noteIds[0])
      }
      onOpenChange(false)
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

  const activeTabInfo = IMPORT_TABS.find((t) => t.id === activeTab)

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold">Import Content</h2>
            <button
              onClick={() => onOpenChange(false)}
              className="p-1 rounded hover:bg-gray-100"
            >
              <X className="w-5 h-5 text-gray-500" />
            </button>
          </div>
        </DialogHeader>

        <DialogBody>
          {/* Tabs */}
          <div className="flex border-b border-gray-200 mb-4">
            {IMPORT_TABS.map((tab) => (
              <button
                key={tab.id}
                onClick={() => {
                  setActiveTab(tab.id)
                  setError(null)
                }}
                disabled={isImporting}
                className={cn(
                  'flex items-center gap-2 px-4 py-2 text-sm font-medium transition-colors',
                  'border-b-2 -mb-px',
                  activeTab === tab.id
                    ? 'border-blue-500 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300',
                  isImporting && 'opacity-50 cursor-not-allowed'
                )}
              >
                {tab.icon}
                <span>{tab.label}</span>
              </button>
            ))}
          </div>

          {/* Description */}
          <p className="text-sm text-gray-500 mb-4">{activeTabInfo?.description}</p>

          {/* Progress */}
          {progress && (
            <div className="mb-4 p-4 bg-blue-50 rounded-lg">
              <div className="flex items-center gap-2 mb-2">
                <Loader2 className="w-4 h-4 animate-spin text-blue-500" />
                <span className="text-sm font-medium text-blue-700">
                  {progress.message}
                </span>
              </div>
              {progress.total > 1 && (
                <div className="w-full bg-blue-200 rounded-full h-2">
                  <div
                    className="bg-blue-500 h-2 rounded-full transition-all"
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
            <div className="mb-4 p-4 bg-red-50 border border-red-100 rounded-lg">
              <p className="text-sm text-red-600">{error}</p>
            </div>
          )}

          {/* Content based on active tab */}
          {activeTab === 'text' ? (
            <TextImport
              onImport={handleTextImport}
              disabled={isImporting}
            />
          ) : (
            <YouTubeImport
              onImport={handleYouTubeImport}
              disabled={isImporting}
            />
          )}
        </DialogBody>
      </DialogContent>
    </Dialog>
  )
}
