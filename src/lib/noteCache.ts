import { openDB, DBSchema, IDBPDatabase } from 'idb'
import type { Note, Tag, NoteTag, Folder } from './types'

// IndexedDB schema
interface NoteCacheDB extends DBSchema {
  notes: {
    key: string
    value: Note
    indexes: {
      'by-folder': string
      'by-updated': string
      'by-deleted': string
    }
  }
  tags: {
    key: string
    value: Tag
  }
  noteTags: {
    key: [string, string] // composite: note_id + tag_id
    value: NoteTag
    indexes: {
      'by-note': string
      'by-tag': string
    }
  }
  folders: {
    key: string
    value: Folder
    indexes: {
      'by-parent': string
    }
  }
  metadata: {
    key: string
    value: {
      key: string
      value: unknown
      updatedAt: string
    }
  }
}

const DB_NAME = 'phillips-notes-cache'
const DB_VERSION = 1

let dbPromise: Promise<IDBPDatabase<NoteCacheDB>> | null = null

// Initialize the database
export async function initDB(): Promise<IDBPDatabase<NoteCacheDB>> {
  if (dbPromise) return dbPromise

  dbPromise = openDB<NoteCacheDB>(DB_NAME, DB_VERSION, {
    upgrade(db) {
      // Notes store
      if (!db.objectStoreNames.contains('notes')) {
        const notesStore = db.createObjectStore('notes', { keyPath: 'id' })
        notesStore.createIndex('by-folder', 'folder_id')
        notesStore.createIndex('by-updated', 'updated_at')
        notesStore.createIndex('by-deleted', 'deleted_at')
      }

      // Tags store
      if (!db.objectStoreNames.contains('tags')) {
        db.createObjectStore('tags', { keyPath: 'id' })
      }

      // NoteTags store (junction table)
      if (!db.objectStoreNames.contains('noteTags')) {
        const noteTagsStore = db.createObjectStore('noteTags', { keyPath: ['note_id', 'tag_id'] })
        noteTagsStore.createIndex('by-note', 'note_id')
        noteTagsStore.createIndex('by-tag', 'tag_id')
      }

      // Folders store
      if (!db.objectStoreNames.contains('folders')) {
        const foldersStore = db.createObjectStore('folders', { keyPath: 'id' })
        foldersStore.createIndex('by-parent', 'parent_id')
      }

      // Metadata store for sync timestamps
      if (!db.objectStoreNames.contains('metadata')) {
        db.createObjectStore('metadata', { keyPath: 'key' })
      }
    }
  })

  return dbPromise
}

// Notes operations
export async function cacheNotes(notes: Note[]): Promise<void> {
  const db = await initDB()
  const tx = db.transaction('notes', 'readwrite')
  await Promise.all([
    ...notes.map(note => tx.store.put(note)),
    tx.done
  ])
  await setLastSyncTime('notes')
}

export async function getCachedNotes(): Promise<Note[]> {
  const db = await initDB()
  // Get all non-deleted notes, sorted by updated_at descending
  const notes = await db.getAllFromIndex('notes', 'by-deleted', null)
  return notes.sort((a, b) =>
    new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime()
  )
}

export async function getCachedNote(id: string): Promise<Note | undefined> {
  const db = await initDB()
  return db.get('notes', id)
}

export async function setCachedNote(note: Note): Promise<void> {
  const db = await initDB()
  await db.put('notes', note)
}

export async function deleteCachedNote(id: string): Promise<void> {
  const db = await initDB()
  await db.delete('notes', id)
}

export async function getNotesByFolder(folderId: string | null): Promise<Note[]> {
  const db = await initDB()
  const notes = await db.getAllFromIndex('notes', 'by-folder', folderId)
  return notes.filter(n => !n.deleted_at).sort((a, b) =>
    new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime()
  )
}

// Tags operations
export async function cacheTags(tags: Tag[]): Promise<void> {
  const db = await initDB()
  const tx = db.transaction('tags', 'readwrite')
  await Promise.all([
    ...tags.map(tag => tx.store.put(tag)),
    tx.done
  ])
  await setLastSyncTime('tags')
}

export async function getCachedTags(): Promise<Tag[]> {
  const db = await initDB()
  return db.getAll('tags')
}

// NoteTags operations
export async function cacheNoteTags(noteTags: NoteTag[]): Promise<void> {
  const db = await initDB()
  const tx = db.transaction('noteTags', 'readwrite')
  await Promise.all([
    ...noteTags.map(nt => tx.store.put(nt)),
    tx.done
  ])
}

export async function getTagsForNote(noteId: string): Promise<string[]> {
  const db = await initDB()
  const noteTags = await db.getAllFromIndex('noteTags', 'by-note', noteId)
  return noteTags.map(nt => nt.tag_id)
}

// Folders operations
export async function cacheFolders(folders: Folder[]): Promise<void> {
  const db = await initDB()
  const tx = db.transaction('folders', 'readwrite')
  await Promise.all([
    ...folders.map(folder => tx.store.put(folder)),
    tx.done
  ])
  await setLastSyncTime('folders')
}

export async function getCachedFolders(): Promise<Folder[]> {
  const db = await initDB()
  return db.getAll('folders')
}

// Metadata operations
async function setLastSyncTime(key: string): Promise<void> {
  const db = await initDB()
  await db.put('metadata', {
    key: `lastSync_${key}`,
    value: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  })
}

export async function getLastSyncTime(key: string): Promise<string | null> {
  const db = await initDB()
  const meta = await db.get('metadata', `lastSync_${key}`)
  return meta?.value as string | null
}

// Search in cached notes - instant local search
export async function searchCachedNotes(query: string): Promise<Note[]> {
  if (!query.trim()) return getCachedNotes()

  const db = await initDB()
  const allNotes = await db.getAllFromIndex('notes', 'by-deleted', null)

  const lowerQuery = query.toLowerCase()

  return allNotes.filter(note => {
    const titleMatch = note.title.toLowerCase().includes(lowerQuery)
    const contentMatch = note.content_text?.toLowerCase().includes(lowerQuery) ?? false
    return titleMatch || contentMatch
  }).sort((a, b) =>
    new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime()
  )
}

// Clear all cached data
export async function clearCache(): Promise<void> {
  const db = await initDB()
  const tx = db.transaction(['notes', 'tags', 'noteTags', 'folders', 'metadata'], 'readwrite')
  await Promise.all([
    tx.objectStore('notes').clear(),
    tx.objectStore('tags').clear(),
    tx.objectStore('noteTags').clear(),
    tx.objectStore('folders').clear(),
    tx.objectStore('metadata').clear(),
    tx.done
  ])
}

// Check if cache has data
export async function hasCachedData(): Promise<boolean> {
  const db = await initDB()
  const count = await db.count('notes')
  return count > 0
}
