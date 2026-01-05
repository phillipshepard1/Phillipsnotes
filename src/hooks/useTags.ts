import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import * as tagsApi from '@/api/tags'

// Get all tags
export function useTags() {
  return useQuery({
    queryKey: ['tags'],
    queryFn: tagsApi.getTags,
  })
}

// Get a single tag
export function useTag(id: string | null) {
  return useQuery({
    queryKey: ['tag', id],
    queryFn: () => tagsApi.getTag(id!),
    enabled: !!id,
  })
}

// Get tags for a specific note
export function useNoteTags(noteId: string | null) {
  return useQuery({
    queryKey: ['noteTags', noteId],
    queryFn: () => tagsApi.getNoteTags(noteId!),
    enabled: !!noteId,
  })
}

// Create a new tag
export function useCreateTag() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (input: tagsApi.CreateTagInput) => tagsApi.createTag(input),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tags'] })
    },
  })
}

// Update a tag
export function useUpdateTag() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({ id, updates }: { id: string; updates: tagsApi.UpdateTagInput }) =>
      tagsApi.updateTag(id, updates),
    onSuccess: (data) => {
      queryClient.setQueryData(['tag', data.id], data)
      queryClient.invalidateQueries({ queryKey: ['tags'] })
      queryClient.invalidateQueries({ queryKey: ['noteTags'] })
    },
  })
}

// Delete a tag
export function useDeleteTag() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: tagsApi.deleteTag,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tags'] })
      queryClient.invalidateQueries({ queryKey: ['noteTags'] })
    },
  })
}

// Add tag to note
export function useAddTagToNote() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({ noteId, tagId }: { noteId: string; tagId: string }) =>
      tagsApi.addTagToNote(noteId, tagId),
    onSuccess: (_, { noteId }) => {
      queryClient.invalidateQueries({ queryKey: ['noteTags', noteId] })
    },
  })
}

// Remove tag from note
export function useRemoveTagFromNote() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({ noteId, tagId }: { noteId: string; tagId: string }) =>
      tagsApi.removeTagFromNote(noteId, tagId),
    onSuccess: (_, { noteId }) => {
      queryClient.invalidateQueries({ queryKey: ['noteTags', noteId] })
    },
  })
}
