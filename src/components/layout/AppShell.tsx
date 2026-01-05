import { useState, useCallback, useRef, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { ArrowLeft, MoreHorizontal, Sparkles } from 'lucide-react'
import { Sidebar } from './Sidebar'
import { NotesList } from './NotesList'
import { EditorPanel } from './EditorPanel'
import { MobileToolbar } from './MobileToolbar'
import { FolderList } from '@/components/folders/FolderList'
import { CircularButton } from '@/components/ui/CircularButton'
import { EdgeSwipeBack } from '@/components/ui/EdgeSwipeBack'
import { NoteInfoSheet } from '@/components/editor/NoteInfoSheet'
import { AIChatSidebar } from '@/components/ai/AIChatSidebar'
import { AIFloatingButton } from '@/components/ai/AIFloatingButton'
import { ImportDialog } from '@/components/import/ImportDialog'
import { ShortcutsModal } from '@/components/ui/ShortcutsModal'
import { SaveFeedback } from '@/components/ui/SaveFeedback'
import { Toast, useToast } from '@/components/ui/Toast'
import { DragOverlay } from '@/components/ui/DragOverlay'
import { DragProvider } from '@/context/DragContext'
import { useKeyboardShortcuts } from '@/hooks/useKeyboardShortcuts'
import { useCreateNote, useNotes, useSearchNotes } from '@/hooks/useNotes'
import { useSemanticSearch } from '@/hooks/useAI'
import { NotesListView } from '@/components/notes/NotesListView'
import { SemanticSearchResults } from '@/components/search/SemanticSearchResults'
import { useFolders } from '@/hooks/useFolders'
import { useIsMobile, useMobileNavigation } from '@/hooks/useMobile'
import { useSpeechRecognition } from '@/hooks/useSpeechRecognition'
import { cn } from '@/lib/utils'

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
  const [isSmartSearch, setIsSmartSearch] = useState(false)
  const [isInfoSheetOpen, setIsInfoSheetOpen] = useState(false)
  const [autoSuggestTags, setAutoSuggestTags] = useState(false)

  // Panel resize state (desktop only)
  const [sidebarWidth, setSidebarWidth] = useState(240) // w-60 = 240px
  const [notesListWidth, setNotesListWidth] = useState(420) // wider default to show full note content
  const isResizing = useRef<'sidebar' | 'notesList' | null>(null)

  // Toast for drag-and-drop feedback
  const { toast, showToast, hideToast } = useToast()

  const handleNoteMoved = useCallback((message: string, type: 'success' | 'warning') => {
    showToast(message, type)
  }, [showToast])

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

  // Search results - text search
  const { data: searchResults } = useSearchNotes(searchQuery)

  // Semantic search
  const { results: semanticResults, isSearching: isSemanticSearching, search: semanticSearch } = useSemanticSearch()

  // Combined search results count
  const searchResultCount = isSmartSearch
    ? semanticResults?.length || 0
    : searchResults?.length || 0

  // Trigger semantic search when query changes and smart search is enabled
  useEffect(() => {
    if (isSmartSearch && searchQuery.length >= 2) {
      semanticSearch(searchQuery)
    }
  }, [isSmartSearch, searchQuery, semanticSearch])

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
                    {/* Fixed Header - Apple Notes style */}
                    <div
                      className="flex-shrink-0 px-4"
                      style={{ paddingTop: 'env(safe-area-inset-top)' }}
                    >
                      {/* Action buttons row */}
                      <div className="flex items-center justify-between h-11">
                        <CircularButton onClick={goBack} size="md">
                          <ArrowLeft className="h-5 w-5" />
                        </CircularButton>
                        <CircularButton onClick={() => {}} size="md">
                          <MoreHorizontal className="h-5 w-5" />
                        </CircularButton>
                      </div>

                      {/* Large Title - tight spacing */}
                      <h1 className="text-[34px] font-bold leading-tight tracking-tight text-foreground">
                        {isTrashView ? 'Recently Deleted' : folderName}
                      </h1>
                      <p className="text-[17px] text-muted-foreground mb-3">
                        {noteCount} Note{noteCount !== 1 ? 's' : ''}
                      </p>
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
                    {/* Fixed Header - Apple Notes style */}
                    <div
                      className="flex-shrink-0 px-4"
                      style={{ paddingTop: 'env(safe-area-inset-top)' }}
                    >
                      {/* Action buttons row */}
                      <div className="flex items-center justify-between h-11">
                        <CircularButton onClick={handleClearSearch} size="md">
                          <ArrowLeft className="h-5 w-5" />
                        </CircularButton>
                      </div>

                      {/* Large Title - tight spacing */}
                      <h1 className="text-[34px] font-bold leading-tight tracking-tight text-foreground">
                        Search
                      </h1>
                      <div className="flex items-center justify-between mb-3">
                        <p className="text-[17px] text-muted-foreground">
                          {searchQuery
                            ? `${searchResultCount} result${searchResultCount !== 1 ? 's' : ''}`
                            : 'Type to search'}
                        </p>
                        {/* Smart Search Toggle */}
                        <button
                          onClick={() => setIsSmartSearch(!isSmartSearch)}
                          className={cn(
                            'flex items-center gap-1.5 px-3 py-1 rounded-full text-sm font-medium transition-colors',
                            isSmartSearch
                              ? 'bg-primary text-primary-foreground'
                              : 'bg-muted text-muted-foreground'
                          )}
                        >
                          <Sparkles className="h-3.5 w-3.5" />
                          Smart
                        </button>
                      </div>
                    </div>

                    {/* Search Results - scrollable */}
                    <div className="flex-1 min-h-0 overflow-hidden">
                      {searchQuery.length >= 2 ? (
                        isSmartSearch ? (
                          <SemanticSearchResults
                            results={semanticResults}
                            isLoading={isSemanticSearching}
                            selectedNoteId={selectedNoteId}
                            onNoteSelect={handleNoteSelect}
                          />
                        ) : (
                          <NotesListView
                            searchQuery={searchQuery}
                            selectedNoteId={selectedNoteId}
                            onNoteSelect={handleNoteSelect}
                          />
                        )
                      ) : (
                        <div className="flex flex-col items-center justify-center h-full text-muted-foreground">
                          <p>Enter at least 2 characters to search</p>
                          {isSmartSearch && (
                            <p className="text-sm mt-1 text-primary">AI-powered search enabled</p>
                          )}
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
                      className="flex-shrink-0 flex items-center justify-between border-b border-border px-2"
                      style={{
                        paddingTop: 'env(safe-area-inset-top)',
                        minHeight: 'calc(3.5rem + env(safe-area-inset-top))',
                      }}
                    >
                      <div className="flex items-center gap-2">
                        <CircularButton onClick={goBack} size="md">
                          <ArrowLeft className="h-5 w-5" />
                        </CircularButton>
                        <span className="text-sm font-medium text-muted-foreground">
                          Notes
                        </span>
                      </div>
                      {/* AI and Info buttons */}
                      {selectedNoteId && (
                        <div className="flex items-center gap-1">
                          <button
                            onClick={() => setIsAIChatOpen(!isAIChatOpen)}
                            className="flex items-center justify-center h-9 w-9 rounded-full text-muted-foreground hover:text-foreground hover:bg-secondary transition-colors"
                            title="AI Assistant"
                          >
                            <Sparkles className="h-5 w-5" />
                          </button>
                          <NoteInfoSheet
                            noteId={selectedNoteId}
                            onNoteSelect={(id) => {
                              setSelectedNoteId(id)
                            }}
                            isMobile={true}
                            open={isInfoSheetOpen}
                            onOpenChange={(open) => {
                              setIsInfoSheetOpen(open)
                              if (!open) setAutoSuggestTags(false)
                            }}
                            autoSuggestTags={autoSuggestTags}
                          />
                        </div>
                      )}
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
          onImportClick={() => setIsImportDialogOpen(true)}
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

        {/* AI Floating Action Button - only in editor view */}
        {activeView === 'editor' && selectedNoteId && !isAIChatOpen && (
          <AIFloatingButton
            onAskAI={() => setIsAIChatOpen(true)}
            onSummarize={() => {
              // TODO: Implement summarize action
              setIsAIChatOpen(true)
            }}
            onImproveWriting={() => {
              // TODO: Implement improve writing action
              setIsAIChatOpen(true)
            }}
            onSuggestTags={() => {
              setAutoSuggestTags(true)
              setIsInfoSheetOpen(true)
            }}
          />
        )}

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
    <DragProvider>
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
          onNoteMoved={handleNoteMoved}
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

      {/* Drag-and-drop overlay */}
      <DragOverlay />

      {/* Drag-and-drop toast notifications */}
      <Toast
        message={toast.message}
        type={toast.type}
        show={toast.show}
        onHide={hideToast}
      />
    </div>
    </DragProvider>
  )
}
