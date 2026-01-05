import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { X, Share, Plus, Download } from 'lucide-react'

interface BeforeInstallPromptEvent extends Event {
  prompt(): Promise<void>
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>
}

export function InstallPrompt() {
  const [showPrompt, setShowPrompt] = useState(false)
  const [isIOS, setIsIOS] = useState(false)
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null)

  useEffect(() => {
    // Check if already installed (standalone mode)
    const isStandalone = window.matchMedia('(display-mode: standalone)').matches
      || (window.navigator as Navigator & { standalone?: boolean }).standalone === true

    if (isStandalone) {
      return
    }

    // Check if dismissed recently (show again after 7 days)
    const dismissed = localStorage.getItem('pwa-install-dismissed')
    if (dismissed) {
      const dismissedDate = new Date(dismissed)
      const daysSinceDismissed = (Date.now() - dismissedDate.getTime()) / (1000 * 60 * 60 * 24)
      if (daysSinceDismissed < 7) {
        return
      }
    }

    // Detect iOS
    const userAgent = window.navigator.userAgent.toLowerCase()
    const isIOSDevice = /iphone|ipad|ipod/.test(userAgent)
    const isSafari = /safari/.test(userAgent) && !/chrome/.test(userAgent) && !/crios/.test(userAgent)

    setIsIOS(isIOSDevice && isSafari)

    if (isIOSDevice && isSafari) {
      // Show iOS prompt after a delay
      const timer = setTimeout(() => setShowPrompt(true), 3000)
      return () => clearTimeout(timer)
    }

    // Handle Android/Chrome beforeinstallprompt
    const handleBeforeInstall = (e: Event) => {
      e.preventDefault()
      setDeferredPrompt(e as BeforeInstallPromptEvent)
      setShowPrompt(true)
    }

    window.addEventListener('beforeinstallprompt', handleBeforeInstall)

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstall)
    }
  }, [])

  const handleInstall = async () => {
    if (!deferredPrompt) return

    deferredPrompt.prompt()
    const { outcome } = await deferredPrompt.userChoice

    if (outcome === 'accepted') {
      setShowPrompt(false)
    }
    setDeferredPrompt(null)
  }

  const handleDismiss = () => {
    localStorage.setItem('pwa-install-dismissed', new Date().toISOString())
    setShowPrompt(false)
  }

  if (!showPrompt) return null

  return (
    <div className="fixed bottom-4 left-4 right-4 z-50 mx-auto max-w-md">
      <div className="rounded-lg border bg-card p-4 shadow-lg">
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <p className="text-sm font-medium">Install Phillips Notes</p>
            <p className="mt-1 text-xs text-muted-foreground">
              Add to your home screen for the best experience
            </p>
          </div>
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8 -mt-1 -mr-1"
            onClick={handleDismiss}
          >
            <X className="h-4 w-4" />
          </Button>
        </div>

        {isIOS ? (
          <div className="mt-3 space-y-2">
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <span className="flex h-5 w-5 items-center justify-center rounded bg-muted">1</span>
              <span>Tap the</span>
              <Share className="h-4 w-4" />
              <span>Share button below</span>
            </div>
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <span className="flex h-5 w-5 items-center justify-center rounded bg-muted">2</span>
              <span>Scroll down and tap</span>
              <span className="inline-flex items-center gap-1 rounded bg-muted px-1.5 py-0.5">
                <Plus className="h-3 w-3" />
                Add to Home Screen
              </span>
            </div>
          </div>
        ) : (
          <Button
            className="mt-3 w-full"
            size="sm"
            onClick={handleInstall}
          >
            <Download className="mr-2 h-4 w-4" />
            Install App
          </Button>
        )}
      </div>
    </div>
  )
}
