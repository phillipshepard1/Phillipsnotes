import { supabase } from '@/lib/supabase'
import type { Tag, NoteTag } from '@/lib/types'

export interface CreateTagInput {
  name: string
  color?: string
}

export interface UpdateTagInput {
  name?: string
  color?: string
}

// Get all tags for the current user
export async function getTags(): Promise<Tag[]> {
  const { data, error } = await supabase
    .from('tags')
    .select('*')
    .order('name', { ascending: true })

  if (error) throw error
  return data as Tag[]
}

// Get a single tag
export async function getTag(id: string): Promise<Tag> {
  const { data, error } = await supabase
    .from('tags')
    .select('*')
    .eq('id', id)
    .single()

  if (error) throw error
  return data as Tag
}

// Create a new tag
export async function createTag(input: CreateTagInput): Promise<Tag> {
  const { data: userData } = await supabase.auth.getUser()
  if (!userData.user) throw new Error('Not authenticated')

  const { data, error } = await supabase
    .from('tags')
    .insert({
      user_id: userData.user.id,
      name: input.name,
      color: input.color || null,
    })
    .select()
    .single()

  if (error) throw error
  return data as Tag
}

// Update a tag
export async function updateTag(id: string, updates: UpdateTagInput): Promise<Tag> {
  const { data, error } = await supabase
    .from('tags')
    .update(updates)
    .eq('id', id)
    .select()
    .single()

  if (error) throw error
  return data as Tag
}

// Delete a tag
export async function deleteTag(id: string): Promise<void> {
  const { error } = await supabase
    .from('tags')
    .delete()
    .eq('id', id)

  if (error) throw error
}

// Get tags for a specific note
export async function getNoteTags(noteId: string): Promise<Tag[]> {
  const { data, error } = await supabase
    .from('note_tags')
    .select('tag_id, tags(*)')
    .eq('note_id', noteId)

  if (error) throw error
  return (data as unknown as Array<{ tag_id: string; tags: Tag }>).map(row => row.tags)
}

// Add a tag to a note
export async function addTagToNote(noteId: string, tagId: string): Promise<NoteTag> {
  const { data, error } = await supabase
    .from('note_tags')
    .insert({ note_id: noteId, tag_id: tagId })
    .select()
    .single()

  if (error) throw error
  return data as NoteTag
}

// Remove a tag from a note
export async function removeTagFromNote(noteId: string, tagId: string): Promise<void> {
  const { error } = await supabase
    .from('note_tags')
    .delete()
    .eq('note_id', noteId)
    .eq('tag_id', tagId)

  if (error) throw error
}

// Get notes with a specific tag
export async function getNotesByTag(tagId: string): Promise<string[]> {
  const { data, error } = await supabase
    .from('note_tags')
    .select('note_id')
    .eq('tag_id', tagId)

  if (error) throw error
  return data.map(row => row.note_id)
}

// Predefined tag colors
export const TAG_COLORS = [
  { name: 'red', bg: 'bg-red-100 dark:bg-red-900/30', text: 'text-red-700 dark:text-red-400', value: 'red' },
  { name: 'orange', bg: 'bg-orange-100 dark:bg-orange-900/30', text: 'text-orange-700 dark:text-orange-400', value: 'orange' },
  { name: 'yellow', bg: 'bg-yellow-100 dark:bg-yellow-900/30', text: 'text-yellow-700 dark:text-yellow-400', value: 'yellow' },
  { name: 'green', bg: 'bg-green-100 dark:bg-green-900/30', text: 'text-green-700 dark:text-green-400', value: 'green' },
  { name: 'blue', bg: 'bg-blue-100 dark:bg-blue-900/30', text: 'text-blue-700 dark:text-blue-400', value: 'blue' },
  { name: 'purple', bg: 'bg-purple-100 dark:bg-purple-900/30', text: 'text-purple-700 dark:text-purple-400', value: 'purple' },
  { name: 'pink', bg: 'bg-pink-100 dark:bg-pink-900/30', text: 'text-pink-700 dark:text-pink-400', value: 'pink' },
  { name: 'gray', bg: 'bg-gray-100 dark:bg-gray-800', text: 'text-gray-700 dark:text-gray-400', value: 'gray' },
] as const

export function getTagColorClasses(color: string | null): { bg: string; text: string } {
  const found = TAG_COLORS.find(c => c.value === color)
  return found || TAG_COLORS[7] // default to gray
}
