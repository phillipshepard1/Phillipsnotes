import { supabase } from '@/lib/supabase'
import type { Note, CreateNoteInput, UpdateNoteInput } from '@/lib/types'
import { extractTextPreview } from '@/lib/utils'

export async function getNotes(folderId?: string | null): Promise<Note[]> {
  let query = supabase
    .from('notes')
    .select('*')
    .is('deleted_at', null) // Exclude deleted notes
    .order('is_pinned', { ascending: false })
    .order('updated_at', { ascending: false })

  if (folderId !== undefined) {
    if (folderId === null) {
      query = query.is('folder_id', null)
    } else {
      query = query.eq('folder_id', folderId)
    }
  }

  const { data, error } = await query
  if (error) throw error
  return data as Note[]
}

export async function getAllNotes(): Promise<Note[]> {
  const { data, error } = await supabase
    .from('notes')
    .select('*')
    .is('deleted_at', null) // Exclude deleted notes
    .order('is_pinned', { ascending: false })
    .order('updated_at', { ascending: false })

  if (error) throw error
  return data as Note[]
}

export async function getTrashNotes(): Promise<Note[]> {
  const { data, error } = await supabase
    .from('notes')
    .select('*')
    .not('deleted_at', 'is', null) // Only deleted notes
    .order('deleted_at', { ascending: false })

  if (error) throw error
  return data as Note[]
}

export async function getNote(id: string): Promise<Note> {
  const { data, error } = await supabase
    .from('notes')
    .select('*')
    .eq('id', id)
    .single()

  if (error) throw error
  return data as Note
}

export async function createNote(input: CreateNoteInput): Promise<Note> {
  const { data: userData } = await supabase.auth.getUser()
  if (!userData.user) throw new Error('Not authenticated')

  const content = input.content || []
  const contentText = extractTextPreview(content, 10000)

  const { data, error } = await supabase
    .from('notes')
    .insert({
      user_id: userData.user.id,
      title: input.title || '',
      content,
      content_text: contentText,
      folder_id: input.folder_id || null,
    })
    .select()
    .single()

  if (error) throw error
  return data as Note
}

export async function updateNote(id: string, updates: UpdateNoteInput): Promise<Note> {
  const updateData: Record<string, unknown> = { ...updates }

  // If content is being updated, also update content_text
  if (updates.content) {
    updateData.content_text = extractTextPreview(updates.content, 10000)
  }

  const { data, error } = await supabase
    .from('notes')
    .update(updateData)
    .eq('id', id)
    .select()
    .single()

  if (error) throw error
  return data as Note
}

// Soft delete - moves note to trash
export async function deleteNote(id: string): Promise<void> {
  const { error } = await supabase
    .from('notes')
    .update({ deleted_at: new Date().toISOString() })
    .eq('id', id)

  if (error) throw error
}

// Restore note from trash
export async function restoreNote(id: string): Promise<Note> {
  const { data, error } = await supabase
    .from('notes')
    .update({ deleted_at: null })
    .eq('id', id)
    .select()
    .single()

  if (error) throw error
  return data as Note
}

// Permanently delete note (from trash)
export async function permanentlyDeleteNote(id: string): Promise<void> {
  const { error } = await supabase
    .from('notes')
    .delete()
    .eq('id', id)

  if (error) throw error
}

// Empty all notes in trash
export async function emptyTrash(): Promise<void> {
  const { error } = await supabase
    .from('notes')
    .delete()
    .not('deleted_at', 'is', null)

  if (error) throw error
}

export async function moveNote(noteId: string, folderId: string | null): Promise<Note> {
  return updateNote(noteId, { folder_id: folderId })
}

export async function togglePinNote(noteId: string, isPinned: boolean): Promise<Note> {
  return updateNote(noteId, { is_pinned: isPinned })
}

export async function searchNotes(query: string): Promise<Note[]> {
  const { data, error } = await supabase
    .from('notes')
    .select('*')
    .is('deleted_at', null) // Exclude deleted notes
    .or(`title.ilike.%${query}%,content_text.ilike.%${query}%`)
    .order('updated_at', { ascending: false })
    .limit(50)

  if (error) throw error
  return data as Note[]
}
