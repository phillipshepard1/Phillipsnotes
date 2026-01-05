import { useEffect, useState } from 'react'
import { Check, AlertCircle, FolderInput } from 'lucide-react'
import { cn } from '@/lib/utils'

type ToastType = 'success' | 'warning' | 'info'

interface ToastProps {
  message: string
  type?: ToastType
  show: boolean
  onHide: () => void
  duration?: number
}

const iconMap = {
  success: Check,
  warning: AlertCircle,
  info: FolderInput,
}

const colorMap = {
  success: 'bg-green-500 text-white',
  warning: 'bg-amber-500 text-white',
  info: 'bg-primary text-primary-foreground',
}

export function Toast({ message, type = 'success', show, onHide, duration = 3000 }: ToastProps) {
  const [visible, setVisible] = useState(false)

  useEffect(() => {
    if (show) {
      setVisible(true)
      const timer = setTimeout(() => {
        setVisible(false)
        onHide()
      }, duration)
      return () => clearTimeout(timer)
    }
  }, [show, onHide, duration])

  if (!visible) return null

  const Icon = iconMap[type]

  return (
    <div
      className={cn(
        'fixed top-4 right-4 z-[100]',
        'flex items-center gap-2 px-4 py-3 rounded-lg',
        'shadow-lg',
        'animate-in fade-in-0 slide-in-from-top-2',
        colorMap[type]
      )}
    >
      <Icon className="w-4 h-4 flex-shrink-0" />
      <span className="text-sm font-medium">{message}</span>
    </div>
  )
}

// Hook for easier toast management
interface ToastState {
  show: boolean
  message: string
  type: ToastType
}

export function useToast() {
  const [toast, setToast] = useState<ToastState>({
    show: false,
    message: '',
    type: 'success',
  })

  const showToast = (message: string, type: ToastType = 'success') => {
    setToast({ show: true, message, type })
  }

  const hideToast = () => {
    setToast(prev => ({ ...prev, show: false }))
  }

  return {
    toast,
    showToast,
    hideToast,
  }
}
