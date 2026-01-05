import { useState } from 'react'
import { Globe, Download, Sparkles } from 'lucide-react'
import { cn } from '@/lib/utils'

interface WebImportProps {
  onImport: (url: string, includeSummary: boolean) => Promise<void>
  disabled?: boolean
}

export function WebImport({ onImport, disabled }: WebImportProps) {
  const [url, setUrl] = useState('')
  const [includeSummary, setIncludeSummary] = useState(true)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!url.trim() || disabled) return
    await onImport(url.trim(), includeSummary)
  }

  // Basic URL validation
  const isValidUrl = url.trim() && (
    url.startsWith('http://') ||
    url.startsWith('https://') ||
    url.includes('.')
  )

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <label htmlFor="web-url" className="block text-sm font-medium text-foreground mb-1">
          Web URL
        </label>
        <div className="relative">
          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
            <Globe className="h-5 w-5 text-muted-foreground" />
          </div>
          <input
            type="text"
            id="web-url"
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            disabled={disabled}
            placeholder="https://example.com/article"
            className={cn(
              'block w-full pl-10 pr-3 py-2 border border-border rounded-lg bg-background',
              'focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent',
              'placeholder:text-muted-foreground',
              'disabled:bg-muted disabled:text-muted-foreground'
            )}
          />
        </div>
        <p className="mt-1 text-xs text-muted-foreground">
          Paste a URL to import article content, blog posts, or documentation
        </p>
      </div>

      <div className="space-y-2">
        <div className="flex items-center gap-2">
          <input
            type="checkbox"
            id="include-summary-web"
            checked={includeSummary}
            onChange={(e) => setIncludeSummary(e.target.checked)}
            disabled={disabled}
            className="h-4 w-4 text-primary focus:ring-primary border-border rounded"
          />
          <label htmlFor="include-summary-web" className="flex items-center gap-1 text-sm text-foreground">
            <Sparkles className="w-4 h-4" />
            Include AI summary
          </label>
        </div>
      </div>

      <button
        type="submit"
        disabled={disabled || !isValidUrl}
        className={cn(
          'w-full flex items-center justify-center gap-2 px-4 py-2 rounded-lg',
          'bg-primary text-primary-foreground font-medium',
          'hover:bg-primary/90 transition-colors',
          'disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:bg-primary'
        )}
      >
        <Download className="w-4 h-4" />
        Import Article
      </button>
    </form>
  )
}
