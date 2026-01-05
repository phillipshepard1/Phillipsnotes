import { useRegisterSW } from 'virtual:pwa-register/react'
import { Button } from '@/components/ui/button'
import { RefreshCw, X } from 'lucide-react'

export function UpdatePrompt() {
  const {
    needRefresh: [needRefresh, setNeedRefresh],
    updateServiceWorker,
  } = useRegisterSW({
    onRegistered(r) {
      // Check for updates every hour
      if (r) {
        setInterval(() => {
          r.update()
        }, 60 * 60 * 1000)
      }
    },
    onRegisterError(error) {
      console.error('Service worker registration error:', error)
    },
  })

  const close = () => {
    setNeedRefresh(false)
  }

  if (!needRefresh) return null

  return (
    <div className="fixed bottom-4 left-4 right-4 z-50 mx-auto max-w-md">
      <div className="flex items-center gap-3 rounded-lg border bg-card p-4 shadow-lg">
        <div className="flex-1">
          <p className="text-sm font-medium">Update available</p>
          <p className="text-xs text-muted-foreground">
            A new version is ready. Reload to update.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8"
            onClick={close}
          >
            <X className="h-4 w-4" />
          </Button>
          <Button
            size="sm"
            onClick={() => updateServiceWorker(true)}
          >
            <RefreshCw className="mr-2 h-4 w-4" />
            Reload
          </Button>
        </div>
      </div>
    </div>
  )
}
