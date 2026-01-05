import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization, apikey',
};

interface SearchResult {
  note_id: string;
  title: string;
  preview: string;
  similarity: number;
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
    const { query, limit = 20 } = await req.json() as { query: string; limit?: number };

    if (!query || typeof query !== 'string' || query.trim().length < 2) {
      throw new Error('Query must be at least 2 characters');
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

    // Create Supabase client with user's auth
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

    // Generate embedding for the query using OpenAI
    const embeddingResponse = await fetch('https://api.openai.com/v1/embeddings', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${openaiApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'text-embedding-3-small',
        input: query.trim(),
      }),
    });

    if (!embeddingResponse.ok) {
      const errorData = await embeddingResponse.json();
      console.error('OpenAI embedding error:', errorData);
      throw new Error('Failed to generate embedding');
    }

    const embeddingData = await embeddingResponse.json();
    const queryEmbedding = embeddingData.data[0]?.embedding;

    if (!queryEmbedding) {
      throw new Error('No embedding returned');
    }

    // Search for similar chunks using pgvector
    // Using cosine distance (<=>), lower is more similar
    const { data: results, error: searchError } = await supabase.rpc(
      'match_note_chunks',
      {
        query_embedding: queryEmbedding,
        match_threshold: 0.3, // Minimum similarity threshold
        match_count: limit,
        user_id_filter: user.id,
      }
    );

    if (searchError) {
      console.error('Search error:', searchError);
      // Fallback to direct query if RPC doesn't exist
      const { data: fallbackResults, error: fallbackError } = await supabase
        .from('note_chunks')
        .select(`
          note_id,
          content,
          notes!inner(title, content_text, deleted_at)
        `)
        .eq('user_id', user.id)
        .is('notes.deleted_at', null)
        .limit(limit);

      if (fallbackError) {
        throw new Error('Search failed');
      }

      // Return fallback results without similarity scores
      const processedResults: SearchResult[] = [];
      const seenNotes = new Set<string>();

      for (const chunk of fallbackResults || []) {
        if (!seenNotes.has(chunk.note_id)) {
          seenNotes.add(chunk.note_id);
          processedResults.push({
            note_id: chunk.note_id,
            title: (chunk.notes as any)?.title || 'Untitled',
            preview: (chunk.notes as any)?.content_text?.substring(0, 200) || '',
            similarity: 0.5, // Placeholder
          });
        }
      }

      return new Response(JSON.stringify({ results: processedResults }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Process results - deduplicate by note_id, keeping highest similarity
    const noteMap = new Map<string, SearchResult>();

    for (const result of results || []) {
      const existing = noteMap.get(result.note_id);
      if (!existing || result.similarity > existing.similarity) {
        noteMap.set(result.note_id, {
          note_id: result.note_id,
          title: result.title || 'Untitled',
          preview: result.content_text?.substring(0, 200) || '',
          similarity: result.similarity,
        });
      }
    }

    const searchResults = Array.from(noteMap.values())
      .sort((a, b) => b.similarity - a.similarity)
      .slice(0, limit);

    return new Response(JSON.stringify({ results: searchResults }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    console.error('Semantic search error:', message);
    return new Response(JSON.stringify({ error: message }), {
      status: 400,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
