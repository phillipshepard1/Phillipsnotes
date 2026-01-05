# Embedding Implementation Journey

This document chronicles the implementation of AI-powered note embeddings in Phillips Notes, including all challenges encountered and solutions discovered.

## Overview

**Goal:** Enable AI chat to search through user notes using semantic similarity (RAG - Retrieval Augmented Generation).

**Architecture:**
```
┌─────────────┐     ┌──────────────┐     ┌─────────────┐     ┌──────────┐
│ Note Editor │────▶│ embed-note   │────▶│ note_chunks │────▶│ ai-chat  │
│ (Frontend)  │     │ (Edge Func)  │     │ (pgvector)  │     │ (RAG)    │
└─────────────┘     └──────────────┘     └─────────────┘     └──────────┘
      │                    │                    │                  │
      │              Generate 384-dim      Store vector       Query with
      │              embedding             embeddings         semantic search
      └──────────────────────────────────────────────────────────────┘
```

---

## The Problem: 546 Errors

### Initial Symptoms
- `embed-note` Edge Function crashed with status **546** (resource limit exceeded)
- `ai-chat` function worked fine (status 200)
- `note_chunks` table remained empty
- AI responses: "No relevant notes found"

### What 546 Means
Supabase Edge Functions have strict resource limits:
- **CPU Time:** 2 seconds (hard limit)
- **Memory:** 256 MB
- **Wall Clock:** 150 seconds (free tier) / 400 seconds (paid)

Status 546 indicates the worker crashed due to exceeding these limits.

---

## Attempt 1: OpenAI Embeddings with JSON.stringify Fix

### Hypothesis
Research indicated that pgvector requires embeddings in string format `[0.1,0.2,...]`, not JavaScript arrays which get converted to PostgreSQL SET syntax `{0.1,0.2,...}`.

### Changes Made
```typescript
// BEFORE (crashed):
embedding: embedding  // number[]

// AFTER:
embedding: JSON.stringify(embedding)  // string "[0.1,0.2,...]"
```

### Result: Still 546
- Version 5: 546 at ~700ms
- Version 6: 546 at ~1400ms

The JSON.stringify fix was correct for pgvector, but wasn't the root cause of the crash.

---

## Attempt 2: Native Supabase.ai Embeddings

### Hypothesis
OpenAI API calls were consuming too much time/resources. Supabase offers native embedding via `Supabase.ai.Session('gte-small')` which runs on-edge.

### Changes Made

**Database Migration:**
```sql
-- Changed from 1536 dimensions (OpenAI) to 384 dimensions (gte-small)
ALTER TABLE note_chunks ALTER COLUMN embedding TYPE vector(384);
```

**Edge Function:**
```typescript
// Instead of OpenAI fetch:
const embeddingModel = new Supabase.ai.Session('gte-small');
const embedding = await embeddingModel.run(text, {
  mean_pool: true,
  normalize: true,
});
```

### Result: Still 546
- Version 7: 546 at ~880ms
- Version 8 (lazy init): 546 at ~940ms

Native embeddings weren't the issue either.

---

## Attempt 3: Isolating the Problem

### Test Function
Created a minimal `test-embedding` function:

```typescript
Deno.serve(async (req) => {
  const model = new Supabase.ai.Session('gte-small');
  const embedding = await model.run('hello world', {
    mean_pool: true,
    normalize: true,
  });
  return Response.json({ success: true, length: embedding.length });
});
```

### Result: 200 OK at 693ms

This proved `Supabase.ai.Session` works fine in isolation. The problem was the **combination of operations** in embed-note.

---

## Root Cause Analysis

Comparing the two functions:

| Operation | test-embedding | embed-note (v8) |
|-----------|---------------|-----------------|
| Create Supabase client | No | Yes (x2) |
| Parse auth header | No | Yes |
| Validate user | No | Yes (getUser API call) |
| Query database | No | Yes (get note) |
| Text chunking | No | Yes (loop) |
| Generate embeddings | 1 | Multiple (per chunk) |
| Delete old chunks | No | Yes |
| Insert new chunks | No | Yes |

**Total time budget:** ~2000ms CPU
**test-embedding used:** ~693ms
**embed-note used:** ~900ms before crash

The cumulative CPU time of all operations exceeded the limit.

---

## The Solution: Radical Simplification (Version 9)

### Key Optimizations

1. **Module-level embedding model initialization**
   ```typescript
   // Initialize BEFORE any request handling
   const embeddingModel = new Supabase.ai.Session('gte-small');
   ```

2. **Skip full auth validation**
   ```typescript
   // Instead of supabase.auth.getUser() API call:
   const token = authHeader.replace('Bearer ', '');
   const payload = JSON.parse(atob(token.split('.')[1]));
   const userId = payload.sub;
   ```

3. **Single chunk per note**
   ```typescript
   // Instead of complex chunking with loops:
   const text = (note.title || '') + '\n' + (note.content_text || '').slice(0, 500);
   ```

4. **Minimal database operations**
   - One SELECT (get note)
   - One DELETE (remove old chunks)
   - One INSERT (add new chunk)

### Final Working Code

```typescript
import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Initialize at module level - CRITICAL for performance
const embeddingModel = new Supabase.ai.Session('gte-small');

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Fast auth: decode JWT directly (skip API call)
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: 'Missing authorization header' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }
    const token = authHeader.replace('Bearer ', '');
    const payload = JSON.parse(atob(token.split('.')[1]));
    const userId = payload.sub;

    const { noteId } = await req.json();
    if (!noteId) throw new Error('noteId is required');

    // Get note
    const { data: note, error: noteError } = await supabase
      .from('notes')
      .select('id, user_id, title, content_text')
      .eq('id', noteId)
      .single();

    if (noteError || !note) throw new Error('Note not found');
    if (note.user_id !== userId) throw new Error('Unauthorized');

    // Simple text extraction (first 500 chars)
    const text = (note.title || '') + '\n' + (note.content_text || '').slice(0, 500);

    if (!text.trim()) {
      await supabase.from('note_chunks').delete().eq('note_id', noteId);
      return new Response(JSON.stringify({ success: true, chunksProcessed: 0 }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Generate single embedding
    const embedding = await embeddingModel.run(text, {
      mean_pool: true,
      normalize: true,
    });

    // Atomic update: delete old, insert new
    await supabase.from('note_chunks').delete().eq('note_id', noteId);

    const { error: insertError } = await supabase
      .from('note_chunks')
      .insert({
        note_id: noteId,
        user_id: userId,
        chunk_index: 0,
        content: text,
        token_count: Math.ceil(text.length / 4),
        embedding: JSON.stringify(embedding),
      });

    if (insertError) throw new Error(`Failed to insert: ${insertError.message}`);

    return new Response(
      JSON.stringify({ success: true, chunksProcessed: 1 }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    return new Response(
      JSON.stringify({ error: message }),
      { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
```

### Result: 200 OK at 570ms

---

## Version History

| Version | Approach | Status | Time | Issue |
|---------|----------|--------|------|-------|
| v3 | OpenAI embeddings | 546 | ~1200ms | API calls too slow |
| v4 | OpenAI + retry logic | 546 | ~1000ms | More complexity = worse |
| v5 | JSON.stringify fix | 546 | ~700ms | Right fix, wrong problem |
| v6 | Verified JSON format | 546 | ~1400ms | Still too much work |
| v7 | Native Supabase.ai | 546 | ~880ms | Session init in handler |
| v8 | Lazy init pattern | 546 | ~940ms | Still too late |
| **v9** | **Radical simplification** | **200** | **570ms** | **Success!** |

---

## Key Lessons Learned

### 1. Edge Function Limits Are Real
Supabase Edge Functions have a 2-second CPU limit. This sounds like a lot but disappears quickly when you:
- Initialize libraries
- Make API calls
- Run loops
- Do I/O operations

### 2. Module-Level Initialization Matters
```typescript
// GOOD: Initialized once when worker boots
const model = new Supabase.ai.Session('gte-small');

// BAD: Initialized on every request
Deno.serve(async (req) => {
  const model = new Supabase.ai.Session('gte-small'); // Too late!
});
```

### 3. Skip What You Can Skip
Full auth validation via `supabase.auth.getUser()` is an API call. If you already have a valid JWT from the Authorization header, you can decode it directly:
```typescript
const payload = JSON.parse(atob(token.split('.')[1]));
const userId = payload.sub;
```

### 4. Native > External APIs
`Supabase.ai.Session` (on-edge) is faster than OpenAI API calls (network round-trip), but the bigger win was reducing the number of operations.

### 5. Simpler Is Faster
Instead of complex chunking logic with multiple embeddings, one chunk per note was sufficient for our use case and fits within resource limits.

---

## Future Improvements

If longer notes require multiple chunks:

1. **Frontend chunking:** Split text in the browser, call embed-note per chunk
2. **Queue-based processing:** Use Supabase Database Webhooks to trigger a background job
3. **Postgres trigger:** Generate embeddings directly in the database using pg_vectorize extension

---

## Related Files

- `supabase/functions/embed-note/index.ts` - Embedding generation
- `supabase/functions/ai-chat/index.ts` - RAG query handler
- `src/hooks/useAI.ts` - Frontend AI hooks
- `src/components/ai/AIChatSidebar.tsx` - Chat UI

---

## Database Schema

```sql
CREATE TABLE note_chunks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  note_id UUID REFERENCES notes(id) ON DELETE CASCADE,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  chunk_index INTEGER NOT NULL,
  content TEXT NOT NULL,
  token_count INTEGER,
  embedding vector(384),  -- gte-small dimensions
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX note_chunks_embedding_idx
  ON note_chunks USING hnsw (embedding vector_cosine_ops);
```

---

*Document created: January 2026*
*Last working version: embed-note v9, ai-chat v4*
