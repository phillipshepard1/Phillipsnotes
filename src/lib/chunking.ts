// Text chunking utilities for RAG embeddings

export interface TextChunk {
  index: number
  content: string
  tokenCount: number
}

// Simple token estimation (approximately 4 chars per token for English)
function estimateTokens(text: string): number {
  return Math.ceil(text.length / 4)
}

/**
 * Chunk text content for embedding
 * Uses overlapping chunks to preserve context across boundaries
 */
export function chunkText(
  text: string,
  options: {
    maxChunkSize?: number // Max chars per chunk
    overlap?: number // Overlap chars between chunks
    minChunkSize?: number // Minimum chunk size to include
  } = {}
): TextChunk[] {
  const {
    maxChunkSize = 500,
    overlap = 100,
    minChunkSize = 50,
  } = options

  if (!text || text.trim().length === 0) {
    return []
  }

  const chunks: TextChunk[] = []
  let startIndex = 0
  let chunkIndex = 0

  while (startIndex < text.length) {
    let endIndex = startIndex + maxChunkSize

    // If we're not at the end, try to break at a sentence or word boundary
    if (endIndex < text.length) {
      // Look for sentence boundary (.!?) within the last 100 chars
      const searchStart = Math.max(startIndex, endIndex - 100)
      const searchText = text.slice(searchStart, endIndex)

      // Try sentence boundary first
      const sentenceMatch = searchText.match(/[.!?]\s+(?=[A-Z])/g)
      if (sentenceMatch) {
        const lastSentence = searchText.lastIndexOf(sentenceMatch[sentenceMatch.length - 1])
        if (lastSentence !== -1) {
          endIndex = searchStart + lastSentence + sentenceMatch[sentenceMatch.length - 1].length
        }
      } else {
        // Fall back to word boundary
        const lastSpace = text.lastIndexOf(' ', endIndex)
        if (lastSpace > startIndex + minChunkSize) {
          endIndex = lastSpace
        }
      }
    } else {
      endIndex = text.length
    }

    const chunkContent = text.slice(startIndex, endIndex).trim()

    if (chunkContent.length >= minChunkSize) {
      chunks.push({
        index: chunkIndex,
        content: chunkContent,
        tokenCount: estimateTokens(chunkContent),
      })
      chunkIndex++
    }

    // Move start index, accounting for overlap
    startIndex = endIndex - overlap
    if (startIndex >= text.length - minChunkSize) {
      break
    }
  }

  return chunks
}

/**
 * Extract plain text from BlockNote JSON content
 */
export function extractTextFromBlocks(blocks: unknown[]): string {
  if (!Array.isArray(blocks)) {
    return ''
  }

  const textParts: string[] = []

  function extractText(node: unknown): void {
    if (!node || typeof node !== 'object') return

    const obj = node as Record<string, unknown>

    // Handle text content
    if (obj.type === 'text' && typeof obj.text === 'string') {
      textParts.push(obj.text)
      return
    }

    // Handle inline content
    if (Array.isArray(obj.content)) {
      for (const item of obj.content) {
        extractText(item)
      }
    }

    // Handle children blocks
    if (Array.isArray(obj.children)) {
      for (const child of obj.children) {
        extractText(child)
      }
    }

    // Add newline after block-level elements
    if (obj.type && ['paragraph', 'heading', 'bulletListItem', 'numberedListItem', 'checkListItem'].includes(obj.type as string)) {
      textParts.push('\n')
    }
  }

  for (const block of blocks) {
    extractText(block)
  }

  return textParts.join('').trim()
}

/**
 * Prepare note content for embedding
 * Returns chunks with the note title prepended to each for context
 */
export function prepareNoteChunks(
  noteId: string,
  title: string,
  contentText: string
): Array<{ noteId: string; index: number; content: string; tokenCount: number }> {
  // Prepend title to content for better context in embeddings
  const fullText = title ? `${title}\n\n${contentText}` : contentText

  const chunks = chunkText(fullText)

  return chunks.map(chunk => ({
    noteId,
    index: chunk.index,
    content: chunk.content,
    tokenCount: chunk.tokenCount,
  }))
}
