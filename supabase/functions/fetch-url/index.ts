import "jsr:@supabase/functions-js/edge-runtime.d.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization, apikey',
};

interface ExtractedArticle {
  title: string;
  content: string;
  author?: string;
  publishedDate?: string;
  summary?: string;
}

// Simple HTML text extractor (no external dependencies)
function extractTextFromHtml(html: string): { title: string; content: string } {
  // Extract title
  const titleMatch = html.match(/<title[^>]*>([^<]+)<\/title>/i);
  const ogTitleMatch = html.match(/<meta[^>]*property="og:title"[^>]*content="([^"]+)"/i);
  const title = ogTitleMatch?.[1] || titleMatch?.[1] || 'Untitled';

  // Remove script, style, nav, header, footer, aside tags
  let cleanHtml = html
    .replace(/<script[\s\S]*?<\/script>/gi, '')
    .replace(/<style[\s\S]*?<\/style>/gi, '')
    .replace(/<nav[\s\S]*?<\/nav>/gi, '')
    .replace(/<header[\s\S]*?<\/header>/gi, '')
    .replace(/<footer[\s\S]*?<\/footer>/gi, '')
    .replace(/<aside[\s\S]*?<\/aside>/gi, '')
    .replace(/<noscript[\s\S]*?<\/noscript>/gi, '')
    .replace(/<!--[\s\S]*?-->/g, '');

  // Try to find the main content area
  const articleMatch = cleanHtml.match(/<article[^>]*>([\s\S]*?)<\/article>/i);
  const mainMatch = cleanHtml.match(/<main[^>]*>([\s\S]*?)<\/main>/i);
  const contentMatch = cleanHtml.match(/<div[^>]*class="[^"]*content[^"]*"[^>]*>([\s\S]*?)<\/div>/i);

  let contentHtml = articleMatch?.[1] || mainMatch?.[1] || contentMatch?.[1] || cleanHtml;

  // Convert common HTML elements to text with formatting
  let text = contentHtml
    // Convert headers
    .replace(/<h1[^>]*>([\s\S]*?)<\/h1>/gi, '\n\n$1\n\n')
    .replace(/<h2[^>]*>([\s\S]*?)<\/h2>/gi, '\n\n$1\n\n')
    .replace(/<h3[^>]*>([\s\S]*?)<\/h3>/gi, '\n\n$1\n\n')
    .replace(/<h[4-6][^>]*>([\s\S]*?)<\/h[4-6]>/gi, '\n\n$1\n\n')
    // Convert paragraphs
    .replace(/<p[^>]*>([\s\S]*?)<\/p>/gi, '\n\n$1\n\n')
    // Convert list items
    .replace(/<li[^>]*>([\s\S]*?)<\/li>/gi, '\n• $1')
    // Convert line breaks
    .replace(/<br\s*\/?>/gi, '\n')
    // Remove remaining HTML tags
    .replace(/<[^>]+>/g, '')
    // Decode HTML entities
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&mdash;/g, '—')
    .replace(/&ndash;/g, '–')
    .replace(/&hellip;/g, '...')
    // Clean up whitespace
    .replace(/\n\s*\n\s*\n/g, '\n\n')
    .replace(/[ \t]+/g, ' ')
    .trim();

  return { title: title.trim(), content: text };
}

// Generate summary using OpenAI
async function generateSummary(content: string, title: string): Promise<string> {
  const openaiApiKey = Deno.env.get('OPENAI_API_KEY');
  if (!openaiApiKey) {
    throw new Error('OpenAI API key not configured');
  }

  // Truncate content if too long
  const maxContentLength = 12000;
  const truncatedContent = content.length > maxContentLength
    ? content.substring(0, maxContentLength) + '...'
    : content;

  const response = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${openaiApiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: 'gpt-4o-mini',
      messages: [
        {
          role: 'system',
          content: 'You are a helpful assistant that creates concise summaries. Summarize the key points of the article in 2-3 paragraphs. Focus on the main ideas and takeaways.'
        },
        {
          role: 'user',
          content: `Title: ${title}\n\nContent:\n${truncatedContent}`
        }
      ],
      temperature: 0.3,
      max_tokens: 500,
    }),
  });

  if (!response.ok) {
    console.error('OpenAI API error:', await response.text());
    throw new Error('Failed to generate summary');
  }

  const data = await response.json();
  return data.choices[0]?.message?.content || '';
}

Deno.serve(async (req: Request) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  if (req.method !== 'POST') {
    return new Response(JSON.stringify({ error: 'Method not allowed' }), {
      status: 405,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  try {
    const { url, includeSummary = false } = await req.json() as { url: string; includeSummary?: boolean };

    if (!url || typeof url !== 'string') {
      throw new Error('URL is required');
    }

    // Validate URL
    let parsedUrl: URL;
    try {
      parsedUrl = new URL(url);
    } catch {
      throw new Error('Invalid URL format');
    }

    // Fetch the page
    console.log(`Fetching URL: ${url}`);
    const response = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (compatible; NotesApp/1.0; +https://notes.app)',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
        'Accept-Language': 'en-US,en;q=0.5',
      },
    });

    if (!response.ok) {
      throw new Error(`Failed to fetch URL: ${response.status} ${response.statusText}`);
    }

    const contentType = response.headers.get('content-type') || '';
    if (!contentType.includes('text/html') && !contentType.includes('application/xhtml')) {
      throw new Error('URL does not return HTML content');
    }

    const html = await response.text();

    // Extract content
    const { title, content } = extractTextFromHtml(html);

    if (!content || content.length < 100) {
      throw new Error('Could not extract meaningful content from the page');
    }

    const result: ExtractedArticle = {
      title,
      content,
    };

    // Generate summary if requested
    if (includeSummary) {
      try {
        result.summary = await generateSummary(content, title);
      } catch (e) {
        console.error('Failed to generate summary:', e);
        // Continue without summary
      }
    }

    return new Response(JSON.stringify(result), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    console.error('Error fetching URL:', message);
    return new Response(JSON.stringify({ error: message }), {
      status: 400,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
