import { BlockNoteEditor, Block } from '@blocknote/core'
import type { Note } from '@/lib/types'

// Export note content to markdown string
export async function blocksToMarkdown(
  editor: BlockNoteEditor,
  blocks: Block[]
): Promise<string> {
  return await editor.blocksToMarkdownLossy(blocks)
}

// Create a downloadable markdown file
export function downloadMarkdown(content: string, title: string): void {
  // Sanitize filename
  const filename = sanitizeFilename(title || 'Untitled') + '.md'

  const blob = new Blob([content], { type: 'text/markdown;charset=utf-8' })
  const url = URL.createObjectURL(blob)

  const link = document.createElement('a')
  link.href = url
  link.download = filename
  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)
  URL.revokeObjectURL(url)
}

// Export a note to markdown file
export async function exportNoteToMarkdown(
  editor: BlockNoteEditor,
  note: Note
): Promise<void> {
  const blocks = note.content as Block[]
  const markdown = await blocksToMarkdown(editor, blocks)

  // Add title as H1 at the beginning
  const titleLine = note.title ? `# ${note.title}\n\n` : ''
  const fullContent = titleLine + markdown

  downloadMarkdown(fullContent, note.title)
}

// Sanitize filename for download
function sanitizeFilename(name: string): string {
  return name
    .replace(/[/\\?%*:|"<>]/g, '-')  // Replace invalid chars
    .replace(/\s+/g, '_')            // Replace spaces with underscores
    .substring(0, 100)               // Limit length
    .trim()
}
