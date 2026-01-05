import { createContext, useContext, useState, useCallback, useRef, useEffect, type ReactNode } from 'react'
import type { NotePreview } from '@/lib/types'

interface DragState {
  isDragging: boolean
  draggedNote: NotePreview | null
  dragPosition: { x: number; y: number }
}

interface DragContextValue extends DragState {
  startDrag: (note: NotePreview, position: { x: number; y: number }) => void
  updatePosition: (position: { x: number; y: number }) => void
  endDrag: () => void
  // For drop zones to register themselves
  registerDropZone: (id: string, element: HTMLElement) => void
  unregisterDropZone: (id: string) => void
  // Current hover target
  hoveredDropZone: string | null
}

const DragContext = createContext<DragContextValue | null>(null)

export function useDrag() {
  const context = useContext(DragContext)
  if (!context) {
    throw new Error('useDrag must be used within a DragProvider')
  }
  return context
}

// Optional hook that doesn't throw if context is missing (for conditional usage)
export function useDragOptional() {
  return useContext(DragContext)
}

interface DragProviderProps {
  children: ReactNode
}

export function DragProvider({ children }: DragProviderProps) {
  const [state, setState] = useState<DragState>({
    isDragging: false,
    draggedNote: null,
    dragPosition: { x: 0, y: 0 },
  })
  const [hoveredDropZone, setHoveredDropZone] = useState<string | null>(null)
  const dropZonesRef = useRef<Map<string, HTMLElement>>(new Map())

  const startDrag = useCallback((note: NotePreview, position: { x: number; y: number }) => {
    setState({
      isDragging: true,
      draggedNote: note,
      dragPosition: position,
    })
  }, [])

  const updatePosition = useCallback((position: { x: number; y: number }) => {
    setState(prev => ({
      ...prev,
      dragPosition: position,
    }))

    // Check which drop zone we're hovering over
    let foundZone: string | null = null
    dropZonesRef.current.forEach((element, id) => {
      const rect = element.getBoundingClientRect()
      if (
        position.x >= rect.left &&
        position.x <= rect.right &&
        position.y >= rect.top &&
        position.y <= rect.bottom
      ) {
        foundZone = id
      }
    })
    setHoveredDropZone(foundZone)
  }, [])

  const endDrag = useCallback(() => {
    setState({
      isDragging: false,
      draggedNote: null,
      dragPosition: { x: 0, y: 0 },
    })
    setHoveredDropZone(null)
  }, [])

  const registerDropZone = useCallback((id: string, element: HTMLElement) => {
    dropZonesRef.current.set(id, element)
  }, [])

  const unregisterDropZone = useCallback((id: string) => {
    dropZonesRef.current.delete(id)
  }, [])

  // Handle mouse up anywhere to end drag
  useEffect(() => {
    if (!state.isDragging) return

    const handleMouseUp = () => {
      // End drag if dropped outside any drop zone
      // Small delay to let drop zones handle it first
      setTimeout(() => {
        if (state.isDragging) {
          endDrag()
        }
      }, 50)
    }

    const handleMouseMove = (e: MouseEvent) => {
      updatePosition({ x: e.clientX, y: e.clientY })
    }

    window.addEventListener('mousemove', handleMouseMove)
    window.addEventListener('mouseup', handleMouseUp)

    return () => {
      window.removeEventListener('mousemove', handleMouseMove)
      window.removeEventListener('mouseup', handleMouseUp)
    }
  }, [state.isDragging, updatePosition, endDrag])

  const value: DragContextValue = {
    ...state,
    hoveredDropZone,
    startDrag,
    updatePosition,
    endDrag,
    registerDropZone,
    unregisterDropZone,
  }

  return (
    <DragContext.Provider value={value}>
      {children}
    </DragContext.Provider>
  )
}
