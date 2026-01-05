import { Dialog, DialogContent, DialogHeader, DialogBody } from './dialog'
import { getModifierKey } from '@/hooks/useKeyboardShortcuts'
import { cn } from '@/lib/utils'

interface ShortcutsModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
}

const shortcuts = [
  { keys: ['N'], mod: true, description: 'Create new note' },
  { keys: ['K'], mod: true, description: 'Focus search' },
  { keys: ['S'], mod: true, description: 'Force save current note' },
  { keys: ['/'], mod: true, description: 'Show keyboard shortcuts' },
  { keys: ['Escape'], mod: false, description: 'Close modal / Clear selection' },
]

export function ShortcutsModal({ open, onOpenChange }: ShortcutsModalProps) {
  const mod = getModifierKey()

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-sm">
        <DialogHeader onClose={() => onOpenChange(false)}>
          Keyboard Shortcuts
        </DialogHeader>
        <DialogBody>
          <div className="space-y-2">
            {shortcuts.map((shortcut, i) => (
              <div
                key={i}
                className="flex items-center justify-between py-1.5"
              >
                <span className="text-sm text-foreground">
                  {shortcut.description}
                </span>
                <div className="flex items-center gap-1">
                  {shortcut.mod && (
                    <kbd
                      className={cn(
                        'px-2 py-0.5 text-xs rounded',
                        'bg-muted text-muted-foreground',
                        'border border-border'
                      )}
                    >
                      {mod}
                    </kbd>
                  )}
                  {shortcut.keys.map((key, j) => (
                    <kbd
                      key={j}
                      className={cn(
                        'px-2 py-0.5 text-xs rounded',
                        'bg-muted text-muted-foreground',
                        'border border-border'
                      )}
                    >
                      {key}
                    </kbd>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </DialogBody>
      </DialogContent>
    </Dialog>
  )
}
