import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization, apikey',
};

type SuggestMode = 'title' | 'tags' | 'both';

interface SuggestResult {
  title?: string;
  tags?: string[];
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
    const { noteId, mode = 'both' } = await req.json() as { noteId: string; mode?: SuggestMode };

    if (!noteId || typeof noteId !== 'string') {
      throw new Error('Note ID is required');
    }

    // Get API keys from environment
    const openaiApiKey = Deno.env.get('OPENAI_API_KEY');
    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');

    if (!openaiApiKey) {
      throw new Error('OpenAI API key not configured');
    }
    if (!supabaseUrl || !supabaseServiceKey) {
      throw new Error('Supabase not configured');
    }

    // Get user from authorization header
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      throw new Error('Authorization required');
    }

    // Create Supabase client
    const supabase = createClient(supabaseUrl, supabaseServiceKey, {
      global: {
        headers: { Authorization: authHeader },
      },
    });

    // Get current user
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      throw new Error('Unauthorized');
    }

    // Get note content
    const { data: note, error: noteError } = await supabase
      .from('notes')
      .select('title, content_text')
      .eq('id', noteId)
      .eq('user_id', user.id)
      .single();

    if (noteError || !note) {
      throw new Error('Note not found');
    }

    if (!note.content_text || note.content_text.trim().length < 10) {
      throw new Error('Note content is too short to generate suggestions');
    }

    // Get existing tags for context
    let existingTags: string[] = [];
    if (mode === 'tags' || mode === 'both') {
      const { data: tags } = await supabase
        .from('tags')
        .select('name')
        .eq('user_id', user.id);
      existingTags = tags?.map(t => t.name) || [];
    }

    // Build the prompt based on mode
    let systemPrompt = '';
    if (mode === 'title') {
      systemPrompt = `You are a note title generator. Given note content, generate a concise, descriptive title.

Rules:
- Maximum 60 characters
- Be specific and descriptive
- Use title case
- No quotes or special formatting
- Return ONLY the title text, nothing else`;
    } else if (mode === 'tags') {
      systemPrompt = `You are a note tag suggester. Given note content, suggest relevant tags for organizing.

Rules:
- Suggest 3-5 tags maximum
- Tags should be lowercase, single words or hyphenated-phrases
- Use existing tags when appropriate: ${existingTags.slice(0, 20).join(', ') || 'none yet'}
- Focus on topics, themes, and categories
- Return ONLY a JSON array of tag strings, e.g.: ["tag1", "tag2", "tag3"]`;
    } else {
      systemPrompt = `You are a note assistant. Given note content, generate both a title and relevant tags.

Rules for title:
- Maximum 60 characters
- Be specific and descriptive
- Use title case

Rules for tags:
- Suggest 3-5 tags maximum
- Tags should be lowercase, single words or hyphenated-phrases
- Use existing tags when appropriate: ${existingTags.slice(0, 20).join(', ') || 'none yet'}
- Focus on topics, themes, and categories

Return a JSON object: {"title": "Your Title", "tags": ["tag1", "tag2", "tag3"]}`;
    }

    // Truncate content if too long
    const contentForAI = note.content_text.substring(0, 2000);

    // Call OpenAI
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${openaiApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'gpt-4o-mini',
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: contentForAI },
        ],
        temperature: 0.5,
        max_tokens: 200,
      }),
    });

    if (!response.ok) {
      const errorData = await response.json();
      console.error('OpenAI API error:', errorData);
      throw new Error('Failed to generate suggestions');
    }

    const data = await response.json();
    const content = data.choices[0]?.message?.content?.trim();

    if (!content) {
      throw new Error('No response from AI');
    }

    // Parse the response based on mode
    let result: SuggestResult = {};

    if (mode === 'title') {
      result.title = content.replace(/^["']|["']$/g, '').trim();
    } else if (mode === 'tags') {
      try {
        const parsed = JSON.parse(content);
        result.tags = Array.isArray(parsed) ? parsed.filter(t => typeof t === 'string') : [];
      } catch {
        // Try to extract tags from plain text
        result.tags = content
          .replace(/[\[\]"]/g, '')
          .split(',')
          .map((t: string) => t.trim().toLowerCase())
          .filter((t: string) => t.length > 0);
      }
    } else {
      try {
        // Remove markdown code fences if present
        const cleanedContent = content
          .replace(/^```json\n?/i, '')
          .replace(/\n?```$/i, '')
          .trim();
        const parsed = JSON.parse(cleanedContent);
        result.title = parsed.title;
        result.tags = Array.isArray(parsed.tags) ? parsed.tags.filter((t: unknown) => typeof t === 'string') : [];
      } catch {
        console.error('Failed to parse AI response:', content);
        throw new Error('Failed to parse AI suggestions');
      }
    }

    return new Response(JSON.stringify(result), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    console.error('AI suggest error:', message);
    return new Response(JSON.stringify({ error: message }), {
      status: 400,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
