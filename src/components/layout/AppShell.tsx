import { useState, useCallback, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { ArrowLeft } from 'lucide-react'
import { Sidebar } from './Sidebar'
import { NotesList } from './NotesList'
import { EditorPanel } from './EditorPanel'
import { MobileNav } from './MobileNav'
import { MobileDrawer } from './MobileDrawer'
import { AIChatSidebar } from '@/components/ai/AIChatSidebar'
import { ImportDialog } from '@/components/import/ImportDialog'
import { ShortcutsModal } from '@/components/ui/ShortcutsModal'
import { SaveFeedback } from '@/components/ui/SaveFeedback'
import { useKeyboardShortcuts } from '@/hooks/useKeyboardShortcuts'
import { useCreateNote } from '@/hooks/useNotes'
import { useIsMobile, useMobileNavigation } from '@/hooks/useMobile'

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

  const isMobile = useIsMobile()
  const { activeView, navigateTo, goBack, goToList, goToEditor } = useMobileNavigation()

  const handleFolderSelect = (folderId: string | null) => {
    setSelectedFolderId(folderId)
    setSelectedNoteId(null)
    setSearchQuery('')
    setIsTrashView(false)
    if (isMobile) {
      goToList()
    }
  }

  const handleTrashSelect = () => {
    setIsTrashView(true)
    setSelectedFolderId(null)
    setSelectedNoteId(null)
    setSearchQuery('')
    if (isMobile) {
      goToList()
    }
  }

  const handleSearch = (query: string) => {
    setSearchQuery(query)
    if (query) {
      setSelectedFolderId(null)
    }
  }

  const handleNoteSelect = (noteId: string | null) => {
    setSelectedNoteId(noteId)
    if (noteId && isMobile) {
      goToEditor()
    }
  }

  const handleCreateNote = useCallback(async () => {
    try {
      const note = await createNote.mutateAsync({
        folder_id: selectedFolderId,
        title: '',
      })
      setSelectedNoteId(note.id)
      if (isMobile) {
        goToEditor()
      }
    } catch (error) {
      console.error('Failed to create note:', error)
    }
  }, [createNote, selectedFolderId, isMobile, goToEditor])

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

  // Mobile Layout
  if (isMobile) {
    return (
      <div className="h-screen w-screen overflow-hidden bg-background">
        {/* Mobile Content Area */}
        <div
          className="h-full overflow-hidden"
          style={{ paddingBottom: 'calc(env(safe-area-inset-bottom) + 64px)' }}
        >
          <AnimatePresence mode="wait">
            {activeView === 'list' && (
              <motion.div
                key="list"
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                transition={{ duration: 0.15 }}
                className="h-full"
              >
                <NotesList
                  folderId={selectedFolderId}
                  selectedNoteId={selectedNoteId}
                  onNoteSelect={handleNoteSelect}
                  searchQuery={searchQuery}
                  isTrashView={isTrashView}
                  isMobile={true}
                  onMenuClick={() => navigateTo('sidebar')}
                />
              </motion.div>
            )}

            {activeView === 'editor' && (
              <motion.div
                key="editor"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 20 }}
                transition={{ duration: 0.15 }}
                className="h-full flex flex-col"
              >
                {/* Mobile Editor Header */}
                <div
                  className="flex items-center gap-2 border-b border-border px-2"
                  style={{
                    paddingTop: 'env(safe-area-inset-top)',
                    minHeight: 'calc(3.5rem + env(safe-area-inset-top))'
                  }}
                >
                  <button
                    onClick={goBack}
                    className="flex h-10 w-10 items-center justify-center rounded-full text-muted-foreground active:bg-accent"
                  >
                    <ArrowLeft className="h-5 w-5" />
                  </button>
                  <span className="text-sm font-medium text-muted-foreground">Back to Notes</span>
                </div>
                <div className="flex-1 overflow-hidden">
                  <EditorPanel
                    noteId={selectedNoteId}
                    onAIChatToggle={() => setIsAIChatOpen(!isAIChatOpen)}
                    isAIChatOpen={isAIChatOpen}
                    onNoteSelect={setSelectedNoteId}
                    isMobile={true}
                  />
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Mobile Sidebar Drawer */}
        <MobileDrawer
          isOpen={activeView === 'sidebar'}
          onClose={goToList}
          title="Folders"
        >
          <Sidebar
            selectedFolderId={selectedFolderId}
            onFolderSelect={handleFolderSelect}
            onSearch={handleSearch}
            onImportClick={() => setIsImportDialogOpen(true)}
            searchInputRef={searchInputRef}
            isTrashSelected={isTrashView}
            onTrashSelect={handleTrashSelect}
            isMobile={true}
          />
        </MobileDrawer>

        {/* Mobile Bottom Navigation */}
        <MobileNav
          activeView={activeView}
          onNavigate={navigateTo}
          onCreateNote={handleCreateNote}
          hasSelectedNote={!!selectedNoteId}
        />

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

  // Desktop Layout (unchanged)
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
          onNoteSelect={handleNoteSelect}
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
