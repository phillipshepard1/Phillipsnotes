-- Migration: Add vector search functions for semantic search and related notes
-- Run this in your Supabase SQL Editor

-- Function to match note chunks by embedding similarity
CREATE OR REPLACE FUNCTION match_note_chunks(
  query_embedding vector(1536),
  match_threshold float DEFAULT 0.3,
  match_count int DEFAULT 20,
  user_id_filter uuid DEFAULT NULL
)
RETURNS TABLE (
  note_id uuid,
  title text,
  content_text text,
  similarity float
)
LANGUAGE plpgsql
AS $$
BEGIN
  RETURN QUERY
  SELECT DISTINCT ON (nc.note_id)
    nc.note_id,
    n.title,
    n.content_text,
    1 - (nc.embedding <=> query_embedding) AS similarity
  FROM note_chunks nc
  JOIN notes n ON n.id = nc.note_id
  WHERE
    nc.embedding IS NOT NULL
    AND n.deleted_at IS NULL
    AND (user_id_filter IS NULL OR nc.user_id = user_id_filter)
    AND 1 - (nc.embedding <=> query_embedding) > match_threshold
  ORDER BY nc.note_id, similarity DESC
  LIMIT match_count;
END;
$$;

-- Function to find related notes based on embedding similarity
CREATE OR REPLACE FUNCTION find_related_notes(
  source_note_id uuid,
  query_embedding vector(1536),
  match_threshold float DEFAULT 0.5,
  match_count int DEFAULT 10,
  user_id_filter uuid DEFAULT NULL
)
RETURNS TABLE (
  note_id uuid,
  title text,
  content_text text,
  similarity float
)
LANGUAGE plpgsql
AS $$
BEGIN
  RETURN QUERY
  SELECT DISTINCT ON (nc.note_id)
    nc.note_id,
    n.title,
    n.content_text,
    1 - (nc.embedding <=> query_embedding) AS similarity
  FROM note_chunks nc
  JOIN notes n ON n.id = nc.note_id
  WHERE
    nc.embedding IS NOT NULL
    AND nc.note_id != source_note_id  -- Exclude the source note
    AND n.deleted_at IS NULL
    AND (user_id_filter IS NULL OR nc.user_id = user_id_filter)
    AND 1 - (nc.embedding <=> query_embedding) > match_threshold
  ORDER BY nc.note_id, similarity DESC
  LIMIT match_count;
END;
$$;

-- Grant execute permissions
GRANT EXECUTE ON FUNCTION match_note_chunks TO authenticated;
GRANT EXECUTE ON FUNCTION find_related_notes TO authenticated;
