// YouTube transcript importer

export interface YouTubeImportResult {
  title: string
  transcript: string
  videoId: string
  url: string
  channelName?: string
  channelUrl?: string
  summary?: string
}

export async function fetchYouTubeTranscript(
  url: string,
  includeTimestamps = true,
  includeSummary = false
): Promise<YouTubeImportResult> {
  const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
  const functionUrl = `${supabaseUrl}/functions/v1/youtube-transcript`

  const response = await fetch(functionUrl, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ url, includeTimestamps, includeSummary }),
  })

  if (!response.ok) {
    const errorData = await response.json()
    throw new Error(errorData.error || 'Failed to fetch transcript')
  }

  const data = await response.json()

  // Ensure we always have a title - fallback to a descriptive default
  const title = data.title && data.title.trim() !== ''
    ? data.title
    : `YouTube Transcript - ${data.videoId}`

  return {
    title,
    transcript: data.transcript,
    videoId: data.videoId,
    url: data.url,
    channelName: data.channelName,
    channelUrl: data.channelUrl,
    summary: data.summary,
  }
}

// Parse summary markdown into BlockNote blocks
function parseSummaryToBlocks(summary: string): unknown[] {
  const blocks: unknown[] = []
  const lines = summary.split('\n')

  for (const line of lines) {
    const trimmed = line.trim()
    if (!trimmed) continue

    // Bold headers like **Overview** or **Key Points**
    if (trimmed.startsWith('**') && trimmed.endsWith('**')) {
      const headerText = trimmed.slice(2, -2)
      blocks.push({
        type: 'heading',
        props: { level: 3 },
        content: [{ type: 'text', text: headerText }],
      })
    }
    // Bullet points
    else if (trimmed.startsWith('•') || trimmed.startsWith('-') || trimmed.startsWith('*')) {
      const bulletText = trimmed.replace(/^[•\-*]\s*/, '')
      blocks.push({
        type: 'bulletListItem',
        content: [{ type: 'text', text: bulletText }],
      })
    }
    // Regular paragraphs
    else {
      blocks.push({
        type: 'paragraph',
        content: [{ type: 'text', text: trimmed }],
      })
    }
  }

  return blocks
}

// Convert transcript to BlockNote blocks with optional summary and metadata
export function transcriptToBlocks(
  transcript: string,
  metadata?: {
    url?: string
    channelName?: string
    channelUrl?: string
    summary?: string
  }
): unknown[] {
  const blocks: unknown[] = []

  // Add summary section at the top if provided
  if (metadata?.summary) {
    const summaryBlocks = parseSummaryToBlocks(metadata.summary)
    blocks.push(...summaryBlocks)

    // Add separator between summary and transcript
    blocks.push({
      type: 'paragraph',
      content: [],
    })
    blocks.push({
      type: 'heading',
      props: { level: 2 },
      content: [{ type: 'text', text: 'Full Transcript' }],
    })
    blocks.push({
      type: 'paragraph',
      content: [],
    })
  }

  // Add transcript paragraphs
  const lines = transcript.split('\n')
  for (const line of lines) {
    if (line.trim()) {
      blocks.push({
        type: 'paragraph',
        content: [{ type: 'text', text: line }],
      })
    }
  }

  // Add metadata footer if provided
  if (metadata && (metadata.url || metadata.channelName)) {
    // Add a horizontal rule separator
    blocks.push({
      type: 'paragraph',
      content: [{ type: 'text', text: '---' }],
    })

    // Add source info header
    blocks.push({
      type: 'paragraph',
      content: [
        { type: 'text', text: 'Source Information', styles: { bold: true } },
      ],
    })

    // Video link
    if (metadata.url) {
      blocks.push({
        type: 'paragraph',
        content: [
          { type: 'text', text: 'Video: ' },
          {
            type: 'link',
            href: metadata.url,
            content: [{ type: 'text', text: metadata.url }],
          },
        ],
      })
    }

    // Channel info
    if (metadata.channelName) {
      if (metadata.channelUrl) {
        blocks.push({
          type: 'paragraph',
          content: [
            { type: 'text', text: 'Channel: ' },
            {
              type: 'link',
              href: metadata.channelUrl,
              content: [{ type: 'text', text: metadata.channelName }],
            },
          ],
        })
      } else {
        blocks.push({
          type: 'paragraph',
          content: [{ type: 'text', text: `Channel: ${metadata.channelName}` }],
        })
      }
    }

    // Import date
    blocks.push({
      type: 'paragraph',
      content: [
        {
          type: 'text',
          text: `Imported: ${new Date().toLocaleDateString('en-US', {
            year: 'numeric',
            month: 'long',
            day: 'numeric',
          })}`,
        },
      ],
    })
  }

  return blocks
}
