import { type ClassValue, clsx } from 'clsx'
import { twMerge } from 'tailwind-merge'

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

/**
 * Extract first line of text from BlockNote content to use as title
 */
export function extractFirstLine(content: unknown[], maxLength = 100): string {
  if (!Array.isArray(content) || content.length === 0) return 'New Note'

  const firstBlock = content[0] as Record<string, unknown> | null
  if (!firstBlock || typeof firstBlock !== 'object') return 'New Note'

  // Extract text from the first block's content array
  const blockContent = firstBlock.content
  if (!Array.isArray(blockContent)) return 'New Note'

  const textParts: string[] = []
  for (const item of blockContent) {
    if (typeof item === 'object' && item !== null) {
      const i = item as Record<string, unknown>
      if (typeof i.text === 'string') {
        textParts.push(i.text)
      }
    }
  }

  const text = textParts.join('').trim()
  if (!text) return 'New Note'

  return text.length > maxLength ? text.slice(0, maxLength) : text
}

/**
 * Extract plain text preview from BlockNote content
 */
export function extractTextPreview(content: unknown[], maxLength = 100): string {
  if (!Array.isArray(content)) return ''

  const textParts: string[] = []

  function extractFromBlock(block: unknown): void {
    if (!block || typeof block !== 'object') return

    const b = block as Record<string, unknown>

    // Extract from content array (inline content)
    if (Array.isArray(b.content)) {
      for (const item of b.content) {
        if (typeof item === 'object' && item !== null) {
          const i = item as Record<string, unknown>
          if (typeof i.text === 'string') {
            textParts.push(i.text)
          }
        }
      }
    }

    // Recurse into children
    if (Array.isArray(b.children)) {
      for (const child of b.children) {
        extractFromBlock(child)
      }
    }
  }

  for (const block of content) {
    extractFromBlock(block)
    if (textParts.join(' ').length >= maxLength) break
  }

  const text = textParts.join(' ').trim()
  return text.length > maxLength ? text.slice(0, maxLength) + '...' : text
}

/**
 * Debounce function
 */
export function debounce<T extends (...args: unknown[]) => unknown>(
  fn: T,
  delay: number
): (...args: Parameters<T>) => void {
  let timeoutId: ReturnType<typeof setTimeout> | null = null

  return (...args: Parameters<T>) => {
    if (timeoutId) clearTimeout(timeoutId)
    timeoutId = setTimeout(() => fn(...args), delay)
  }
}
