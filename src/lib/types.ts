// Database types aligned with Supabase schema

export interface Folder {
  id: string
  user_id: string
  name: string
  parent_id: string | null
  is_smart: boolean
  smart_query: Record<string, unknown> | null
  created_at: string
  updated_at: string
}

export interface Note {
  id: string
  user_id: string
  folder_id: string | null
  title: string
  content: unknown[] // BlockNote JSON blocks
  content_text: string
  source_type: 'manual' | 'chat_import' | 'youtube_transcript'
  source_url: string | null
  source_metadata: Record<string, unknown> | null
  is_pinned: boolean
  is_locked: boolean
  created_at: string
  updated_at: string
  deleted_at: string | null
}

export interface NoteChunk {
  id: string
  note_id: string
  user_id: string
  chunk_index: number
  content: string
  token_count: number | null
  embedding: number[] | null
  metadata: Record<string, unknown> | null
  created_at: string
}

export interface Tag {
  id: string
  user_id: string
  name: string
  color: string | null
  created_at: string
}

export interface NoteTag {
  note_id: string
  tag_id: string
  created_at: string
}

export interface Attachment {
  id: string
  note_id: string
  user_id: string
  file_name: string
  file_type: string
  file_size: number
  storage_path: string
  created_at: string
}

// UI State types
export interface FolderWithChildren extends Folder {
  children: FolderWithChildren[]
}

export interface NotePreview {
  id: string
  title: string
  preview: string
  updated_at: string
  is_pinned: boolean
  folder_id: string | null
}

export type DateGroup = 'pinned' | 'today' | 'yesterday' | 'previous7Days' | 'previous30Days' | 'older'

export interface GroupedNotes {
  pinned: NotePreview[]
  today: NotePreview[]
  yesterday: NotePreview[]
  previous7Days: NotePreview[]
  previous30Days: NotePreview[]
  older: NotePreview[]
}

// Form types
export interface CreateNoteInput {
  title?: string
  content?: unknown[]
  folder_id?: string | null
}

export interface UpdateNoteInput {
  title?: string
  content?: unknown[]
  content_text?: string
  folder_id?: string | null
  is_pinned?: boolean
}

export interface CreateFolderInput {
  name: string
  parent_id?: string | null
}

export interface UpdateFolderInput {
  name?: string
  parent_id?: string | null
}
