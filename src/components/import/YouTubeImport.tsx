import { useState } from 'react'
import { Youtube, Download, Clock, Sparkles } from 'lucide-react'
import { cn } from '@/lib/utils'

interface YouTubeImportProps {
  onImport: (url: string, includeTimestamps: boolean, includeSummary: boolean) => Promise<void>
  disabled?: boolean
}

export function YouTubeImport({ onImport, disabled }: YouTubeImportProps) {
  const [url, setUrl] = useState('')
  const [includeTimestamps, setIncludeTimestamps] = useState(false)
  const [includeSummary, setIncludeSummary] = useState(true)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!url.trim() || disabled) return
    await onImport(url.trim(), includeTimestamps, includeSummary)
  }

  const isValidUrl = url.trim() && (
    url.includes('youtube.com') ||
    url.includes('youtu.be') ||
    /^[a-zA-Z0-9_-]{11}$/.test(url.trim())
  )

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <label htmlFor="youtube-url" className="block text-sm font-medium text-gray-700 mb-1">
          YouTube URL or Video ID
        </label>
        <div className="relative">
          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
            <Youtube className="h-5 w-5 text-gray-400" />
          </div>
          <input
            type="text"
            id="youtube-url"
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            disabled={disabled}
            placeholder="https://www.youtube.com/watch?v=..."
            className={cn(
              'block w-full pl-10 pr-3 py-2 border border-gray-200 rounded-lg',
              'focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent',
              'placeholder:text-gray-400',
              'disabled:bg-gray-50 disabled:text-gray-500'
            )}
          />
        </div>
        <p className="mt-1 text-xs text-gray-500">
          Paste a YouTube URL or just the video ID (11 characters)
        </p>
      </div>

      <div className="space-y-2">
        <div className="flex items-center gap-2">
          <input
            type="checkbox"
            id="include-summary"
            checked={includeSummary}
            onChange={(e) => setIncludeSummary(e.target.checked)}
            disabled={disabled}
            className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
          />
          <label htmlFor="include-summary" className="flex items-center gap-1 text-sm text-gray-700">
            <Sparkles className="w-4 h-4" />
            Include AI summary
          </label>
        </div>
        <div className="flex items-center gap-2">
          <input
            type="checkbox"
            id="include-timestamps"
            checked={includeTimestamps}
            onChange={(e) => setIncludeTimestamps(e.target.checked)}
            disabled={disabled}
            className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
          />
          <label htmlFor="include-timestamps" className="flex items-center gap-1 text-sm text-gray-700">
            <Clock className="w-4 h-4" />
            Include timestamps
          </label>
        </div>
      </div>

      <button
        type="submit"
        disabled={disabled || !isValidUrl}
        className={cn(
          'w-full flex items-center justify-center gap-2 px-4 py-2 rounded-lg',
          'bg-blue-500 text-white font-medium',
          'hover:bg-blue-600 transition-colors',
          'disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:bg-blue-500'
        )}
      >
        <Download className="w-4 h-4" />
        Import Transcript
      </button>
    </form>
  )
}
