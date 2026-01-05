import { useEffect, useCallback, useRef } from 'react'

export interface Shortcut {
  key: string
  ctrl?: boolean
  meta?: boolean
  shift?: boolean
  alt?: boolean
  description: string
  action: () => void
}

interface UseKeyboardShortcutsOptions {
  shortcuts: Shortcut[]
  enabled?: boolean
}

export function useKeyboardShortcuts({ shortcuts, enabled = true }: UseKeyboardShortcutsOptions) {
  const shortcutsRef = useRef(shortcuts)
  shortcutsRef.current = shortcuts

  const handleKeyDown = useCallback((e: KeyboardEvent) => {
    // Don't trigger shortcuts when typing in inputs/textareas
    const target = e.target as HTMLElement
    const isEditable =
      target.tagName === 'INPUT' ||
      target.tagName === 'TEXTAREA' ||
      target.isContentEditable ||
      target.closest('[data-blocknote-editor]')

    for (const shortcut of shortcutsRef.current) {
      const keyMatch = e.key.toLowerCase() === shortcut.key.toLowerCase()

      // For Cmd/Ctrl shortcuts, check either modifier
      const ctrlOrMetaRequired = shortcut.ctrl || shortcut.meta
      const hasCtrlOrMeta = e.ctrlKey || e.metaKey

      if (ctrlOrMetaRequired && !hasCtrlOrMeta) continue
      if (!ctrlOrMetaRequired && hasCtrlOrMeta) continue

      const shiftMatch = shortcut.shift ? e.shiftKey : !e.shiftKey
      const altMatch = shortcut.alt ? e.altKey : !e.altKey

      if (keyMatch && shiftMatch && altMatch) {
        // Skip if in editable area unless it's a global shortcut (with modifier)
        if (isEditable && !ctrlOrMetaRequired && shortcut.key !== 'Escape') continue

        e.preventDefault()
        shortcut.action()
        return
      }
    }
  }, [])

  useEffect(() => {
    if (!enabled) return

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [handleKeyDown, enabled])
}

// Platform-aware modifier key display
export function getModifierKey(): string {
  if (typeof navigator !== 'undefined') {
    return navigator.platform.includes('Mac') ? '⌘' : 'Ctrl'
  }
  return 'Ctrl'
}

// Format shortcut for display
export function formatShortcut(shortcut: Omit<Shortcut, 'action' | 'description'>): string {
  const parts: string[] = []
  const mod = getModifierKey()

  if (shortcut.ctrl || shortcut.meta) parts.push(mod)
  if (shortcut.shift) parts.push('Shift')
  if (shortcut.alt) parts.push('Alt')
  parts.push(shortcut.key.toUpperCase())

  return parts.join('+')
}
