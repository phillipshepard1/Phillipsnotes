import { supabase } from '@/lib/supabase'
import type { Folder, CreateFolderInput, UpdateFolderInput } from '@/lib/types'

export async function getFolders(): Promise<Folder[]> {
  const { data, error } = await supabase
    .from('folders')
    .select('*')
    .order('name')

  if (error) throw error
  return data as Folder[]
}

export async function getFolder(id: string): Promise<Folder> {
  const { data, error } = await supabase
    .from('folders')
    .select('*')
    .eq('id', id)
    .single()

  if (error) throw error
  return data as Folder
}

export async function createFolder(input: CreateFolderInput): Promise<Folder> {
  const { data: userData } = await supabase.auth.getUser()
  if (!userData.user) throw new Error('Not authenticated')

  const { data, error } = await supabase
    .from('folders')
    .insert({
      user_id: userData.user.id,
      name: input.name,
      parent_id: input.parent_id || null,
    })
    .select()
    .single()

  if (error) throw error
  return data as Folder
}

export async function updateFolder(id: string, updates: UpdateFolderInput): Promise<Folder> {
  const { data, error } = await supabase
    .from('folders')
    .update(updates)
    .eq('id', id)
    .select()
    .single()

  if (error) throw error
  return data as Folder
}

export async function deleteFolder(id: string): Promise<void> {
  const { error } = await supabase
    .from('folders')
    .delete()
    .eq('id', id)

  if (error) throw error
}
