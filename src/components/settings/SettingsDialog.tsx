import { Moon, Sun, Monitor, Settings, Check } from 'lucide-react'
import { Dialog, DialogContent, DialogHeader, DialogBody } from '@/components/ui/dialog'
import { useTheme } from '@/hooks/useTheme'
import { cn } from '@/lib/utils'

interface SettingsDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function SettingsDialog({ open, onOpenChange }: SettingsDialogProps) {
  const { theme, setTheme } = useTheme()

  const themeOptions = [
    { value: 'light' as const, label: 'Light', icon: Sun },
    { value: 'dark' as const, label: 'Dark', icon: Moon },
    { value: 'system' as const, label: 'System', icon: Monitor },
  ]

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-sm">
        <DialogHeader onClose={() => onOpenChange(false)}>
          <div className="flex items-center gap-2">
            <Settings className="h-5 w-5" />
            Settings
          </div>
        </DialogHeader>
        <DialogBody>
          <div className="space-y-4">
            {/* Appearance Section */}
            <div>
              <h3 className="text-sm font-medium text-muted-foreground mb-3">Appearance</h3>
              <div className="grid grid-cols-3 gap-2">
                {themeOptions.map((option) => {
                  const isSelected = theme === option.value
                  return (
                    <button
                      key={option.value}
                      onClick={() => setTheme(option.value)}
                      className={cn(
                        'flex flex-col items-center gap-2 p-3 rounded-lg border-2 transition-all',
                        isSelected
                          ? 'border-primary bg-primary/5'
                          : 'border-border hover:border-primary/50 hover:bg-accent'
                      )}
                    >
                      <div
                        className={cn(
                          'flex h-10 w-10 items-center justify-center rounded-full',
                          isSelected ? 'bg-primary text-primary-foreground' : 'bg-muted'
                        )}
                      >
                        <option.icon className="h-5 w-5" />
                      </div>
                      <span className="text-xs font-medium">{option.label}</span>
                      {isSelected && (
                        <Check className="h-4 w-4 text-primary absolute top-2 right-2" />
                      )}
                    </button>
                  )
                })}
              </div>
            </div>

            {/* App Info Section */}
            <div className="pt-4 border-t border-border">
              <h3 className="text-sm font-medium text-muted-foreground mb-2">About</h3>
              <div className="text-xs text-muted-foreground space-y-1">
                <p>Phillips Notes v1.0.0</p>
                <p>A beautiful note-taking app with AI features</p>
              </div>
            </div>
          </div>
        </DialogBody>
      </DialogContent>
    </Dialog>
  )
}
