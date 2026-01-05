import { useState, useEffect, useCallback } from 'react'

const MOBILE_BREAKPOINT = 768
const TABLET_BREAKPOINT = 1024

export type MobileView = 'sidebar' | 'list' | 'editor'

export function useIsMobile() {
  const [isMobile, setIsMobile] = useState(false)

  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < MOBILE_BREAKPOINT)
    }

    checkMobile()
    window.addEventListener('resize', checkMobile)
    return () => window.removeEventListener('resize', checkMobile)
  }, [])

  return isMobile
}

export function useIsTablet() {
  const [isTablet, setIsTablet] = useState(false)

  useEffect(() => {
    const checkTablet = () => {
      const width = window.innerWidth
      setIsTablet(width >= MOBILE_BREAKPOINT && width < TABLET_BREAKPOINT)
    }

    checkTablet()
    window.addEventListener('resize', checkTablet)
    return () => window.removeEventListener('resize', checkTablet)
  }, [])

  return isTablet
}

export function useMobileNavigation(initialView: MobileView = 'list') {
  const [activeView, setActiveView] = useState<MobileView>(initialView)
  const isMobile = useIsMobile()

  const navigateTo = useCallback((view: MobileView) => {
    setActiveView(view)
  }, [])

  const goToSidebar = useCallback(() => setActiveView('sidebar'), [])
  const goToList = useCallback(() => setActiveView('list'), [])
  const goToEditor = useCallback(() => setActiveView('editor'), [])

  // When a note is selected on mobile, automatically go to editor
  const selectNoteAndNavigate = useCallback((noteId: string | null, onSelect: (id: string | null) => void) => {
    onSelect(noteId)
    if (noteId && isMobile) {
      setActiveView('editor')
    }
  }, [isMobile])

  // Go back from editor to list
  const goBack = useCallback(() => {
    if (activeView === 'editor') {
      setActiveView('list')
    } else if (activeView === 'sidebar') {
      setActiveView('list')
    }
  }, [activeView])

  return {
    activeView,
    navigateTo,
    goToSidebar,
    goToList,
    goToEditor,
    goBack,
    selectNoteAndNavigate,
    isMobile,
  }
}

// Hook to detect if app is running as installed PWA
export function useIsStandalone() {
  const [isStandalone, setIsStandalone] = useState(false)

  useEffect(() => {
    const checkStandalone = () => {
      const standalone = window.matchMedia('(display-mode: standalone)').matches
        || (window.navigator as Navigator & { standalone?: boolean }).standalone === true
      setIsStandalone(standalone)
    }

    checkStandalone()
  }, [])

  return isStandalone
}
