import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import * as foldersApi from '@/api/folders'
import type { Folder, FolderWithChildren, CreateFolderInput, UpdateFolderInput } from '@/lib/types'

// Build tree structure from flat folder list
function buildFolderTree(folders: Folder[]): FolderWithChildren[] {
  const folderMap = new Map<string, FolderWithChildren>()
  const roots: FolderWithChildren[] = []

  // First pass: create all nodes
  for (const folder of folders) {
    folderMap.set(folder.id, { ...folder, children: [] })
  }

  // Second pass: build tree
  for (const folder of folders) {
    const node = folderMap.get(folder.id)!
    if (folder.parent_id) {
      const parent = folderMap.get(folder.parent_id)
      if (parent) {
        parent.children.push(node)
      } else {
        // Parent doesn't exist, treat as root
        roots.push(node)
      }
    } else {
      roots.push(node)
    }
  }

  // Sort children alphabetically
  const sortChildren = (folders: FolderWithChildren[]) => {
    folders.sort((a, b) => a.name.localeCompare(b.name))
    for (const folder of folders) {
      sortChildren(folder.children)
    }
  }
  sortChildren(roots)

  return roots
}

export function useFolders() {
  return useQuery({
    queryKey: ['folders'],
    queryFn: foldersApi.getFolders,
    select: buildFolderTree,
  })
}

export function useFoldersFlat() {
  return useQuery({
    queryKey: ['folders'],
    queryFn: foldersApi.getFolders,
  })
}

export function useFolder(id: string | null | undefined) {
  return useQuery({
    queryKey: ['folder', id],
    queryFn: () => foldersApi.getFolder(id!),
    enabled: !!id,
  })
}

export function useCreateFolder() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (input: CreateFolderInput) => foldersApi.createFolder(input),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['folders'] })
    },
  })
}

export function useUpdateFolder() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({ id, updates }: { id: string; updates: UpdateFolderInput }) =>
      foldersApi.updateFolder(id, updates),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['folders'] })
    },
  })
}

export function useDeleteFolder() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: foldersApi.deleteFolder,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['folders'] })
    },
  })
}
