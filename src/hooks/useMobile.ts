import { useState, useEffect, useCallback } from 'react'

const MOBILE_BREAKPOINT = 768
const TABLET_BREAKPOINT = 1024

// New: Apple Notes-style navigation views
export type MobileView = 'folders' | 'notes' | 'editor' | 'search'

// Legacy type for backwards compatibility during transition
export type LegacyMobileView = 'sidebar' | 'list' | 'editor'

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

// Stack-based navigation for Apple Notes-style UX
export function useMobileNavigation(initialView: MobileView = 'folders') {
  const [navigationStack, setNavigationStack] = useState<MobileView[]>([initialView])
  const isMobile = useIsMobile()

  // Current view is the top of the stack
  const activeView = navigationStack[navigationStack.length - 1]

  // Can go back if there's more than one item in the stack
  const canGoBack = navigationStack.length > 1

  // Push a new view onto the stack
  const navigateTo = useCallback((view: MobileView) => {
    setNavigationStack((stack) => {
      // Don't push if we're already on this view
      if (stack[stack.length - 1] === view) return stack
      return [...stack, view]
    })
  }, [])

  // Pop the stack (go back)
  const goBack = useCallback(() => {
    setNavigationStack((stack) => {
      if (stack.length <= 1) return stack
      return stack.slice(0, -1)
    })
  }, [])

  // Reset to a specific view (clears stack)
  const resetTo = useCallback((view: MobileView) => {
    setNavigationStack([view])
  }, [])

  // Convenience methods
  const goToFolders = useCallback(() => resetTo('folders'), [resetTo])
  const goToNotes = useCallback(() => navigateTo('notes'), [navigateTo])
  const goToEditor = useCallback(() => navigateTo('editor'), [navigateTo])

  // Legacy compatibility aliases
  const goToSidebar = goToFolders
  const goToList = goToNotes

  return {
    activeView,
    navigationStack,
    canGoBack,
    navigateTo,
    goBack,
    resetTo,
    goToFolders,
    goToNotes,
    goToEditor,
    // Legacy aliases
    goToSidebar,
    goToList,
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
