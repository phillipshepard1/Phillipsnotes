import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization, apikey',
};

interface RelatedNote {
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
    const { noteId, limit = 5 } = await req.json() as { noteId: string; limit?: number };

    if (!noteId || typeof noteId !== 'string') {
      throw new Error('Note ID is required');
    }

    // Get API keys from environment
    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');

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

    // Get embeddings from the source note's chunks
    const { data: sourceChunks, error: sourceError } = await supabase
      .from('note_chunks')
      .select('embedding')
      .eq('note_id', noteId)
      .eq('user_id', user.id)
      .not('embedding', 'is', null)
      .limit(3); // Use first 3 chunks for comparison

    if (sourceError) {
      console.error('Source chunks error:', sourceError);
      throw new Error('Failed to get note embeddings');
    }

    if (!sourceChunks || sourceChunks.length === 0) {
      // No embeddings for this note yet
      return new Response(JSON.stringify({ results: [] }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Use the first chunk's embedding as the primary search vector
    const primaryEmbedding = sourceChunks[0].embedding;

    // Find similar chunks from OTHER notes
    const { data: similarChunks, error: searchError } = await supabase.rpc(
      'find_related_notes',
      {
        source_note_id: noteId,
        query_embedding: primaryEmbedding,
        match_threshold: 0.5,
        match_count: limit * 2, // Get more to account for deduplication
        user_id_filter: user.id,
      }
    );

    if (searchError) {
      console.error('Related notes search error:', searchError);
      // Fallback to simple approach
      const { data: fallbackResults, error: fallbackError } = await supabase
        .from('notes')
        .select('id, title, content_text')
        .eq('user_id', user.id)
        .neq('id', noteId)
        .is('deleted_at', null)
        .order('updated_at', { ascending: false })
        .limit(limit);

      if (fallbackError) {
        return new Response(JSON.stringify({ results: [] }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      const fallbackRelated: RelatedNote[] = (fallbackResults || []).map(note => ({
        note_id: note.id,
        title: note.title || 'Untitled',
        preview: note.content_text?.substring(0, 150) || '',
        similarity: 0.5, // Placeholder
      }));

      return new Response(JSON.stringify({ results: fallbackRelated }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Deduplicate and process results
    const noteMap = new Map<string, RelatedNote>();

    for (const result of similarChunks || []) {
      const existing = noteMap.get(result.note_id);
      if (!existing || result.similarity > existing.similarity) {
        noteMap.set(result.note_id, {
          note_id: result.note_id,
          title: result.title || 'Untitled',
          preview: result.content_text?.substring(0, 150) || '',
          similarity: result.similarity,
        });
      }
    }

    const relatedNotes = Array.from(noteMap.values())
      .sort((a, b) => b.similarity - a.similarity)
      .slice(0, limit);

    return new Response(JSON.stringify({ results: relatedNotes }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    console.error('Related notes error:', message);
    return new Response(JSON.stringify({ error: message }), {
      status: 400,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
