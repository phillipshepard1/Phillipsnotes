import { useState, useCallback, useRef } from 'react'
import { Sidebar } from './Sidebar'
import { NotesList } from './NotesList'
import { EditorPanel } from './EditorPanel'
import { AIChatSidebar } from '@/components/ai/AIChatSidebar'
import { ImportDialog } from '@/components/import/ImportDialog'
import { ShortcutsModal } from '@/components/ui/ShortcutsModal'
import { SaveFeedback } from '@/components/ui/SaveFeedback'
import { useKeyboardShortcuts } from '@/hooks/useKeyboardShortcuts'
import { useCreateNote } from '@/hooks/useNotes'

export function AppShell() {
  const [selectedFolderId, setSelectedFolderId] = useState<string | null>(null)
  const [selectedNoteId, setSelectedNoteId] = useState<string | null>(null)
  const [searchQuery, setSearchQuery] = useState('')
  const [isAIChatOpen, setIsAIChatOpen] = useState(false)
  const [isImportDialogOpen, setIsImportDialogOpen] = useState(false)
  const [isShortcutsModalOpen, setIsShortcutsModalOpen] = useState(false)
  const [showSaveFeedback, setShowSaveFeedback] = useState(false)
  const [isTrashView, setIsTrashView] = useState(false)

  const searchInputRef = useRef<HTMLInputElement>(null)
  const createNote = useCreateNote()

  const handleFolderSelect = (folderId: string | null) => {
    setSelectedFolderId(folderId)
    setSelectedNoteId(null)
    setSearchQuery('')
    setIsTrashView(false)
  }

  const handleTrashSelect = () => {
    setIsTrashView(true)
    setSelectedFolderId(null)
    setSelectedNoteId(null)
    setSearchQuery('')
  }

  const handleSearch = (query: string) => {
    setSearchQuery(query)
    if (query) {
      setSelectedFolderId(null)
    }
  }

  const handleCreateNote = useCallback(async () => {
    try {
      const note = await createNote.mutateAsync({
        folder_id: selectedFolderId,
        title: '',
      })
      setSelectedNoteId(note.id)
    } catch (error) {
      console.error('Failed to create note:', error)
    }
  }, [createNote, selectedFolderId])

  const handleFocusSearch = useCallback(() => {
    searchInputRef.current?.focus()
  }, [])

  const handleForceSave = useCallback(() => {
    setShowSaveFeedback(true)
  }, [])

  const handleShowShortcuts = useCallback(() => {
    setIsShortcutsModalOpen(true)
  }, [])

  const handleEscape = useCallback(() => {
    if (isShortcutsModalOpen) {
      setIsShortcutsModalOpen(false)
    } else if (isAIChatOpen) {
      setIsAIChatOpen(false)
    } else if (isImportDialogOpen) {
      setIsImportDialogOpen(false)
    } else if (searchQuery) {
      setSearchQuery('')
    }
  }, [isShortcutsModalOpen, isAIChatOpen, isImportDialogOpen, searchQuery])

  useKeyboardShortcuts({
    shortcuts: [
      { key: 'n', ctrl: true, description: 'New note', action: handleCreateNote },
      { key: 'k', ctrl: true, description: 'Focus search', action: handleFocusSearch },
      { key: 's', ctrl: true, description: 'Force save', action: handleForceSave },
      { key: '/', ctrl: true, description: 'Show shortcuts', action: handleShowShortcuts },
      { key: 'Escape', description: 'Close/clear', action: handleEscape },
    ],
  })

  return (
    <div className="h-screen w-screen overflow-hidden flex bg-background">
      {/* Sidebar - fixed width */}
      <div className="w-60 flex-shrink-0 border-r border-border">
        <Sidebar
          selectedFolderId={selectedFolderId}
          onFolderSelect={handleFolderSelect}
          onSearch={handleSearch}
          onImportClick={() => setIsImportDialogOpen(true)}
          searchInputRef={searchInputRef}
          isTrashSelected={isTrashView}
          onTrashSelect={handleTrashSelect}
        />
      </div>

      {/* Notes List - fixed width */}
      <div className="w-72 flex-shrink-0 border-r border-border">
        <NotesList
          folderId={selectedFolderId}
          selectedNoteId={selectedNoteId}
          onNoteSelect={setSelectedNoteId}
          searchQuery={searchQuery}
          isTrashView={isTrashView}
        />
      </div>

      {/* Editor - flexible */}
      <div className="flex-1 min-w-0">
        <EditorPanel
          noteId={selectedNoteId}
          onAIChatToggle={() => setIsAIChatOpen(!isAIChatOpen)}
          isAIChatOpen={isAIChatOpen}
          onNoteSelect={setSelectedNoteId}
        />
      </div>

      {/* AI Chat Sidebar */}
      <AIChatSidebar
        isOpen={isAIChatOpen}
        onClose={() => setIsAIChatOpen(false)}
        noteId={selectedNoteId || undefined}
        onNoteSelect={setSelectedNoteId}
      />

      {/* Import Dialog */}
      <ImportDialog
        open={isImportDialogOpen}
        onOpenChange={setIsImportDialogOpen}
        folderId={selectedFolderId}
        onNoteCreated={setSelectedNoteId}
      />

      {/* Shortcuts Modal */}
      <ShortcutsModal
        open={isShortcutsModalOpen}
        onOpenChange={setIsShortcutsModalOpen}
      />

      {/* Save Feedback Toast */}
      <SaveFeedback
        show={showSaveFeedback}
        onHide={() => setShowSaveFeedback(false)}
      />
    </div>
  )
}
