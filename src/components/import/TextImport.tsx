import { useState } from 'react'
import { Download, MessageSquare, AlertTriangle } from 'lucide-react'
import { cn } from '@/lib/utils'

interface TextImportProps {
  onImport: (text: string, formatAsChat: boolean) => Promise<void>
  disabled?: boolean
}

const PLACEHOLDER_TEXT = `Example format:

You: What is the capital of France?

ChatGPT: The capital of France is Paris. It's known as the "City of Light" and is famous for landmarks like the Eiffel Tower and the Louvre Museum.

You: Tell me more about the Eiffel Tower.

ChatGPT: The Eiffel Tower is a wrought-iron lattice tower on the Champ de Mars in Paris...`

export function TextImport({ onImport, disabled }: TextImportProps) {
  const [text, setText] = useState('')
  const [formatAsChat, setFormatAsChat] = useState(true)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!text.trim() || disabled) return
    await onImport(text.trim(), formatAsChat)
  }

  const hasContent = text.trim().length > 0
  const wordCount = text.trim() ? text.trim().split(/\s+/).length : 0
  const isLongText = wordCount > 3000
  const showLongTextWarning = isLongText && formatAsChat

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <label htmlFor="paste-text" className="block text-sm font-medium text-gray-700 mb-1">
          Paste conversation text
        </label>
        <textarea
          id="paste-text"
          value={text}
          onChange={(e) => setText(e.target.value)}
          disabled={disabled}
          placeholder={PLACEHOLDER_TEXT}
          rows={10}
          className={cn(
            'block w-full px-3 py-2 border border-gray-200 rounded-lg',
            'focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent',
            'placeholder:text-gray-400 font-mono text-sm',
            'disabled:bg-gray-50 disabled:text-gray-500',
            'resize-y min-h-[200px]'
          )}
        />
        {hasContent && (
          <p className="mt-1 text-xs text-gray-500">
            {wordCount.toLocaleString()} words
          </p>
        )}
      </div>

      {showLongTextWarning && (
        <div className="flex items-start gap-2 p-3 bg-amber-50 border border-amber-200 rounded-lg">
          <AlertTriangle className="w-4 h-4 text-amber-600 flex-shrink-0 mt-0.5" />
          <div className="text-sm">
            <p className="font-medium text-amber-800">Long text detected</p>
            <p className="text-amber-700 mt-0.5">
              This text is very long ({wordCount.toLocaleString()} words). If it&apos;s an article rather than a conversation, consider unchecking &quot;Format as AI conversation&quot; to import as plain text.
            </p>
          </div>
        </div>
      )}

      <div className="flex items-start gap-3 p-3 bg-gray-50 rounded-lg">
        <input
          type="checkbox"
          id="format-as-chat"
          checked={formatAsChat}
          onChange={(e) => setFormatAsChat(e.target.checked)}
          disabled={disabled}
          className="mt-0.5 h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
        />
        <div>
          <label htmlFor="format-as-chat" className="flex items-center gap-1.5 text-sm font-medium text-gray-700 cursor-pointer">
            <MessageSquare className="w-4 h-4" />
            Format as AI conversation
          </label>
          <p className="mt-0.5 text-xs text-gray-500">
            AI will detect speakers (You, ChatGPT, Claude, etc.) and format as a structured conversation
          </p>
        </div>
      </div>

      <button
        type="submit"
        disabled={disabled || !hasContent}
        className={cn(
          'w-full flex items-center justify-center gap-2 px-4 py-2 rounded-lg',
          'bg-blue-500 text-white font-medium',
          'hover:bg-blue-600 transition-colors',
          'disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:bg-blue-500'
        )}
      >
        <Download className="w-4 h-4" />
        Import Text
      </button>
    </form>
  )
}
