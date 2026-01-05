import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import * as notesApi from '@/api/notes'
import type { Note, CreateNoteInput, UpdateNoteInput, NotePreview } from '@/lib/types'
import { extractTextPreview } from '@/lib/utils'

// Transform Note to NotePreview
function toNotePreview(note: Note): NotePreview {
  return {
    id: note.id,
    title: note.title || 'Untitled',
    preview: note.content_text || extractTextPreview(note.content as unknown[], 100),
    updated_at: note.updated_at,
    is_pinned: note.is_pinned,
    folder_id: note.folder_id,
  }
}

export function useNotes(folderId?: string | null) {
  return useQuery({
    queryKey: ['notes', { folderId }],
    queryFn: () => folderId === undefined
      ? notesApi.getAllNotes()
      : notesApi.getNotes(folderId),
    select: (notes) => notes.map(toNotePreview),
  })
}

export function useAllNotes() {
  return useQuery({
    queryKey: ['notes', 'all'],
    queryFn: notesApi.getAllNotes,
    select: (notes) => notes.map(toNotePreview),
  })
}

export function useNote(id: string | null) {
  return useQuery({
    queryKey: ['note', id],
    queryFn: () => notesApi.getNote(id!),
    enabled: !!id,
  })
}

export function useCreateNote() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (input: CreateNoteInput) => notesApi.createNote(input),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notes'] })
    },
  })
}

export function useUpdateNote() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({ id, updates }: { id: string; updates: UpdateNoteInput }) =>
      notesApi.updateNote(id, updates),
    onSuccess: (data) => {
      queryClient.setQueryData(['note', data.id], data)
      queryClient.invalidateQueries({ queryKey: ['notes'] })
    },
  })
}

export function useDeleteNote() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: notesApi.deleteNote,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notes'] })
      queryClient.invalidateQueries({ queryKey: ['trash'] })
    },
  })
}

// Trash-related hooks
export function useTrashNotes() {
  return useQuery({
    queryKey: ['trash'],
    queryFn: notesApi.getTrashNotes,
    select: (notes) => notes.map(toNotePreview),
  })
}

export function useRestoreNote() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: notesApi.restoreNote,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notes'] })
      queryClient.invalidateQueries({ queryKey: ['trash'] })
    },
  })
}

export function usePermanentlyDeleteNote() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: notesApi.permanentlyDeleteNote,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['trash'] })
    },
  })
}

export function useEmptyTrash() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: notesApi.emptyTrash,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['trash'] })
    },
  })
}

export function useMoveNote() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({ noteId, folderId }: { noteId: string; folderId: string | null }) =>
      notesApi.moveNote(noteId, folderId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notes'] })
    },
  })
}

export function useTogglePinNote() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({ noteId, isPinned }: { noteId: string; isPinned: boolean }) =>
      notesApi.togglePinNote(noteId, isPinned),
    onSuccess: (data) => {
      queryClient.setQueryData(['note', data.id], data)
      queryClient.invalidateQueries({ queryKey: ['notes'] })
    },
  })
}

export function useSearchNotes(query: string) {
  return useQuery({
    queryKey: ['notes', 'search', query],
    queryFn: () => notesApi.searchNotes(query),
    select: (notes) => notes.map(toNotePreview),
    enabled: query.length >= 2,
  })
}
