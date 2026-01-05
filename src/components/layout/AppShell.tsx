import { useState, useCallback, useRef, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { ArrowLeft, MoreHorizontal } from 'lucide-react'
import { Sidebar } from './Sidebar'
import { NotesList } from './NotesList'
import { EditorPanel } from './EditorPanel'
import { MobileToolbar } from './MobileToolbar'
import { FolderList } from '@/components/folders/FolderList'
import { CircularButton } from '@/components/ui/CircularButton'
import { LargeTitle } from '@/components/ui/LargeTitle'
import { EdgeSwipeBack } from '@/components/ui/EdgeSwipeBack'
import { AIChatSidebar } from '@/components/ai/AIChatSidebar'
import { ImportDialog } from '@/components/import/ImportDialog'
import { ShortcutsModal } from '@/components/ui/ShortcutsModal'
import { SaveFeedback } from '@/components/ui/SaveFeedback'
import { useKeyboardShortcuts } from '@/hooks/useKeyboardShortcuts'
import { useCreateNote, useNotes, useSearchNotes } from '@/hooks/useNotes'
import { NotesListView } from '@/components/notes/NotesListView'
import { useFolders } from '@/hooks/useFolders'
import { useIsMobile, useMobileNavigation } from '@/hooks/useMobile'
import { useSpeechRecognition } from '@/hooks/useSpeechRecognition'

export function AppShell() {
  // undefined = "All Notes", string = specific folder ID
  const [selectedFolderId, setSelectedFolderId] = useState<string | undefined>(undefined)
  const [selectedNoteId, setSelectedNoteId] = useState<string | null>(null)
  const [searchQuery, setSearchQuery] = useState('')
  const [isAIChatOpen, setIsAIChatOpen] = useState(false)
  const [isImportDialogOpen, setIsImportDialogOpen] = useState(false)
  const [isShortcutsModalOpen, setIsShortcutsModalOpen] = useState(false)
  const [showSaveFeedback, setShowSaveFeedback] = useState(false)
  const [isTrashView, setIsTrashView] = useState(false)

  // Panel resize state (desktop only)
  const [sidebarWidth, setSidebarWidth] = useState(240) // w-60 = 240px
  const [notesListWidth, setNotesListWidth] = useState(288) // w-72 = 288px
  const isResizing = useRef<'sidebar' | 'notesList' | null>(null)

  const searchInputRef = useRef<HTMLInputElement>(null)
  const createNote = useCreateNote()

  const isMobile = useIsMobile()
  const { activeView, goBack, goToNotes, goToEditor, navigateTo, resetTo } = useMobileNavigation()
  const [previousView, setPreviousView] = useState<'folders' | 'notes'>('folders')

  // Get folder name for header
  const { data: folders } = useFolders()
  const selectedFolder = folders?.find((f) => f.id === selectedFolderId)
  const folderName = selectedFolder?.name || 'All Notes'

  // Get note count for header
  const { data: notes } = useNotes(selectedFolderId)
  const noteCount = notes?.length || 0

  // Search results
  const { data: searchResults } = useSearchNotes(searchQuery)
  const searchResultCount = searchResults?.length || 0

  // Speech recognition for voice search
  const { isListening, startListening, stopListening } = useSpeechRecognition({
    onTranscript: (transcript, isFinal) => {
      if (isFinal) {
        setSearchQuery(transcript)
      }
    },
  })

  const handleFolderSelect = (folderId: string | undefined) => {
    setSelectedFolderId(folderId)
    setSelectedNoteId(null)
    setSearchQuery('')
    setIsTrashView(false)
    if (isMobile) {
      goToNotes()
    }
  }

  const handleTrashSelect = () => {
    setIsTrashView(true)
    setSelectedFolderId(undefined)
    setSelectedNoteId(null)
    setSearchQuery('')
    if (isMobile) {
      goToNotes()
    }
  }

  const handleSearch = (query: string) => {
    setSearchQuery(query)
    // Navigate to search view when query is entered
    if (query && isMobile && activeView !== 'search') {
      setPreviousView(activeView === 'notes' ? 'notes' : 'folders')
      navigateTo('search')
    }
  }

  const handleSearchFocus = () => {
    if (isMobile && activeView !== 'search') {
      setPreviousView(activeView === 'notes' ? 'notes' : 'folders')
      navigateTo('search')
    }
  }

  const handleClearSearch = () => {
    setSearchQuery('')
    if (isMobile) {
      resetTo(previousView)
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

  // Panel resize handlers (desktop only)
  const handleResizeStart = useCallback((panel: 'sidebar' | 'notesList') => {
    isResizing.current = panel
    document.body.style.cursor = 'col-resize'
    document.body.style.userSelect = 'none'
  }, [])

  const handleResizeEnd = useCallback(() => {
    isResizing.current = null
    document.body.style.cursor = ''
    document.body.style.userSelect = ''
  }, [])

  const handleMouseMove = useCallback((e: MouseEvent) => {
    if (!isResizing.current) return

    if (isResizing.current === 'sidebar') {
      const newWidth = Math.max(180, Math.min(400, e.clientX))
      setSidebarWidth(newWidth)
    } else if (isResizing.current === 'notesList') {
      const newWidth = Math.max(200, Math.min(500, e.clientX - sidebarWidth))
      setNotesListWidth(newWidth)
    }
  }, [sidebarWidth])

  useEffect(() => {
    document.addEventListener('mousemove', handleMouseMove)
    document.addEventListener('mouseup', handleResizeEnd)
    return () => {
      document.removeEventListener('mousemove', handleMouseMove)
      document.removeEventListener('mouseup', handleResizeEnd)
    }
  }, [handleMouseMove, handleResizeEnd])

  // Mobile Layout - Apple Notes Style
  if (isMobile) {
    return (
      <div className="h-screen w-screen overflow-hidden bg-background">
        {/* Mobile Content Area */}
        <div
          className="h-full overflow-hidden"
          style={{ paddingBottom: 'calc(env(safe-area-inset-bottom) + 56px)' }}
        >
          <AnimatePresence mode="wait">
            {/* Folders View */}
            {activeView === 'folders' && (
              <motion.div
                key="folders"
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                transition={{ duration: 0.15 }}
                className="h-full"
              >
                <FolderList
                  onFolderSelect={handleFolderSelect}
                  onTrashSelect={handleTrashSelect}
                />
              </motion.div>
            )}

            {/* Notes List View */}
            {activeView === 'notes' && (
              <motion.div
                key="notes"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 20 }}
                transition={{ duration: 0.15 }}
                className="h-full"
              >
                <EdgeSwipeBack onBack={goBack}>
                  <div className="h-full flex flex-col">
                    {/* Fixed Header - won't scroll */}
                    <div className="flex-shrink-0">
                      {/* Mobile Notes Header */}
                      <div
                        className="flex items-center justify-between px-2"
                        style={{
                          paddingTop: 'calc(env(safe-area-inset-top) + 8px)',
                          minHeight: 'calc(44px + env(safe-area-inset-top))',
                        }}
                      >
                        <CircularButton onClick={goBack} size="md">
                          <ArrowLeft className="h-5 w-5" />
                        </CircularButton>
                        <CircularButton onClick={() => {}} size="md">
                          <MoreHorizontal className="h-5 w-5" />
                        </CircularButton>
                      </div>

                      {/* Large Title */}
                      <LargeTitle
                        title={isTrashView ? 'Recently Deleted' : folderName}
                        subtitle={`${noteCount} Note${noteCount !== 1 ? 's' : ''}`}
                        className="mb-2"
                      />
                    </div>

                    {/* Notes List - scrollable */}
                    <div className="flex-1 min-h-0 overflow-hidden">
                      <NotesList
                        folderId={selectedFolderId}
                        selectedNoteId={selectedNoteId}
                        onNoteSelect={handleNoteSelect}
                        searchQuery={searchQuery}
                        isTrashView={isTrashView}
                        isMobile={true}
                        hideHeader={true}
                      />
                    </div>
                  </div>
                </EdgeSwipeBack>
              </motion.div>
            )}

            {/* Search View */}
            {activeView === 'search' && (
              <motion.div
                key="search"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: 20 }}
                transition={{ duration: 0.15 }}
                className="h-full"
              >
                <EdgeSwipeBack onBack={handleClearSearch}>
                  <div className="h-full flex flex-col">
                    {/* Fixed Header - won't scroll */}
                    <div className="flex-shrink-0">
                      {/* Search Header */}
                      <div
                        className="flex items-center justify-between px-2"
                        style={{
                          paddingTop: 'calc(env(safe-area-inset-top) + 8px)',
                          minHeight: 'calc(44px + env(safe-area-inset-top))',
                        }}
                      >
                        <CircularButton onClick={handleClearSearch} size="md">
                          <ArrowLeft className="h-5 w-5" />
                        </CircularButton>
                      </div>

                      {/* Large Title */}
                      <LargeTitle
                        title="Search"
                        subtitle={searchQuery ? `${searchResultCount} result${searchResultCount !== 1 ? 's' : ''}` : 'Type to search'}
                        className="mb-2"
                      />
                    </div>

                    {/* Search Results - scrollable */}
                    <div className="flex-1 min-h-0 overflow-hidden">
                      {searchQuery.length >= 2 ? (
                        <NotesListView
                          searchQuery={searchQuery}
                          selectedNoteId={selectedNoteId}
                          onNoteSelect={handleNoteSelect}
                        />
                      ) : (
                        <div className="flex items-center justify-center h-full text-muted-foreground">
                          <p>Enter at least 2 characters to search</p>
                        </div>
                      )}
                    </div>
                  </div>
                </EdgeSwipeBack>
              </motion.div>
            )}

            {/* Editor View */}
            {activeView === 'editor' && (
              <motion.div
                key="editor"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 20 }}
                transition={{ duration: 0.15 }}
                className="h-full"
              >
                <EdgeSwipeBack onBack={goBack}>
                  <div className="h-full flex flex-col">
                    {/* Mobile Editor Header - fixed */}
                    <div
                      className="flex-shrink-0 flex items-center gap-2 border-b border-border px-2"
                      style={{
                        paddingTop: 'env(safe-area-inset-top)',
                        minHeight: 'calc(3.5rem + env(safe-area-inset-top))',
                      }}
                    >
                      <CircularButton onClick={goBack} size="md">
                        <ArrowLeft className="h-5 w-5" />
                      </CircularButton>
                      <span className="text-sm font-medium text-muted-foreground">
                        Back to Notes
                      </span>
                    </div>
                    {/* Editor content - scrollable */}
                    <div className="flex-1 min-h-0 overflow-hidden">
                      <EditorPanel
                        noteId={selectedNoteId}
                        onAIChatToggle={() => setIsAIChatOpen(!isAIChatOpen)}
                        isAIChatOpen={isAIChatOpen}
                        onNoteSelect={setSelectedNoteId}
                        isMobile={true}
                      />
                    </div>
                  </div>
                </EdgeSwipeBack>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Mobile Bottom Toolbar */}
        <MobileToolbar
          searchQuery={searchQuery}
          onSearchChange={handleSearch}
          onCreateNote={handleCreateNote}
          isListening={isListening}
          onStartListening={startListening}
          onStopListening={stopListening}
          onSearchFocus={handleSearchFocus}
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

  // Desktop Layout with resizable panels
  return (
    <div className="h-screen w-screen overflow-hidden flex bg-background">
      {/* Sidebar - resizable */}
      <div
        className="flex-shrink-0 border-r border-border relative"
        style={{ width: sidebarWidth }}
      >
        <Sidebar
          selectedFolderId={selectedFolderId}
          onFolderSelect={handleFolderSelect}
          onSearch={handleSearch}
          onImportClick={() => setIsImportDialogOpen(true)}
          searchInputRef={searchInputRef}
          isTrashSelected={isTrashView}
          onTrashSelect={handleTrashSelect}
        />
        {/* Resize handle */}
        <div
          className="absolute top-0 right-0 w-1 h-full cursor-col-resize hover:bg-primary/30 active:bg-primary/50 transition-colors z-10"
          onMouseDown={() => handleResizeStart('sidebar')}
        />
      </div>

      {/* Notes List - resizable */}
      <div
        className="flex-shrink-0 border-r border-border relative"
        style={{ width: notesListWidth }}
      >
        <NotesList
          folderId={selectedFolderId}
          selectedNoteId={selectedNoteId}
          onNoteSelect={handleNoteSelect}
          searchQuery={searchQuery}
          isTrashView={isTrashView}
        />
        {/* Resize handle */}
        <div
          className="absolute top-0 right-0 w-1 h-full cursor-col-resize hover:bg-primary/30 active:bg-primary/50 transition-colors z-10"
          onMouseDown={() => handleResizeStart('notesList')}
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
