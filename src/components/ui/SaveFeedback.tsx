import { Check } from 'lucide-react'
import { useEffect, useState } from 'react'
import { cn } from '@/lib/utils'

interface SaveFeedbackProps {
  show: boolean
  onHide: () => void
}

export function SaveFeedback({ show, onHide }: SaveFeedbackProps) {
  const [visible, setVisible] = useState(false)

  useEffect(() => {
    if (show) {
      setVisible(true)
      const timer = setTimeout(() => {
        setVisible(false)
        onHide()
      }, 1500)
      return () => clearTimeout(timer)
    }
  }, [show, onHide])

  if (!visible) return null

  return (
    <div
      className={cn(
        'fixed top-4 right-4 z-50',
        'flex items-center gap-2 px-4 py-2 rounded-lg',
        'bg-green-500 text-white shadow-lg',
        'animate-in fade-in-0 slide-in-from-top-2'
      )}
    >
      <Check className="w-4 h-4" />
      <span className="text-sm font-medium">Saved</span>
    </div>
  )
}
