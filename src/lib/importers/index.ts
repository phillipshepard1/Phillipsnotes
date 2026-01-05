// Export importers - YouTube and text only

export { fetchYouTubeTranscript, transcriptToBlocks } from './youtube'
export type { YouTubeImportResult } from './youtube'

export interface ImportedNote {
  title: string
  content: unknown[]
  contentText: string
  sourceType: 'chat_import' | 'youtube_transcript' | 'text_import' | 'web_import'
  sourceUrl?: string
  sourceMetadata?: Record<string, unknown>
}
