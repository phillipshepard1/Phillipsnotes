import * as React from 'react'
import { createPortal } from 'react-dom'
import { cn } from '@/lib/utils'

interface DropdownMenuProps {
  children: React.ReactNode
}

interface DropdownMenuContextType {
  open: boolean
  setOpen: (open: boolean) => void
  triggerRef: React.RefObject<HTMLDivElement | null>
}

const DropdownMenuContext = React.createContext<DropdownMenuContextType | null>(null)

export function DropdownMenu({ children }: DropdownMenuProps) {
  const [open, setOpen] = React.useState(false)
  const triggerRef = React.useRef<HTMLDivElement>(null)

  return (
    <DropdownMenuContext.Provider value={{ open, setOpen, triggerRef }}>
      <div ref={triggerRef} className="relative inline-block">
        {children}
      </div>
    </DropdownMenuContext.Provider>
  )
}

export function DropdownMenuTrigger({ children, asChild }: { children: React.ReactNode; asChild?: boolean }) {
  const context = React.useContext(DropdownMenuContext)
  if (!context) throw new Error('DropdownMenuTrigger must be used within DropdownMenu')

  const handleClick = (e: React.MouseEvent) => {
    e.stopPropagation()
    context.setOpen(!context.open)
  }

  if (asChild && React.isValidElement(children)) {
    return React.cloneElement(children as React.ReactElement<{ onClick?: (e: React.MouseEvent) => void }>, {
      onClick: handleClick,
    })
  }

  return (
    <button onClick={handleClick}>
      {children}
    </button>
  )
}

export function DropdownMenuContent({ children, align = 'end', className }: { children: React.ReactNode; align?: 'start' | 'end'; className?: string }) {
  const context = React.useContext(DropdownMenuContext)
  if (!context) throw new Error('DropdownMenuContent must be used within DropdownMenu')

  const ref = React.useRef<HTMLDivElement>(null)
  const [position, setPosition] = React.useState({ top: 0, left: 0 })

  // Calculate position based on trigger element
  React.useEffect(() => {
    if (context.open && context.triggerRef.current) {
      const rect = context.triggerRef.current.getBoundingClientRect()
      setPosition({
        top: rect.bottom + window.scrollY + 4,
        left: align === 'end' ? rect.right + window.scrollX : rect.left + window.scrollX,
      })
    }
  }, [context.open, context.triggerRef, align])

  React.useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node) &&
          context.triggerRef.current && !context.triggerRef.current.contains(e.target as Node)) {
        context.setOpen(false)
      }
    }
    if (context.open) {
      document.addEventListener('mousedown', handleClickOutside)
    }
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [context.open, context])

  if (!context.open) return null

  return createPortal(
    <div
      ref={ref}
      style={{
        position: 'absolute',
        top: position.top,
        left: align === 'end' ? 'auto' : position.left,
        right: align === 'end' ? window.innerWidth - position.left : 'auto',
      }}
      className={cn(
        'z-50 min-w-[160px] bg-popover rounded-lg shadow-lg border border-border py-1',
        'animate-in fade-in-0 zoom-in-95',
        className
      )}
    >
      {children}
    </div>,
    document.body
  )
}

interface DropdownMenuItemProps {
  children: React.ReactNode
  onClick?: () => void
  variant?: 'default' | 'destructive'
  disabled?: boolean
}

export function DropdownMenuItem({ children, onClick, variant = 'default', disabled }: DropdownMenuItemProps) {
  const context = React.useContext(DropdownMenuContext)
  if (!context) throw new Error('DropdownMenuItem must be used within DropdownMenu')

  const handleClick = () => {
    if (disabled) return
    onClick?.()
    context.setOpen(false)
  }

  return (
    <button
      onClick={handleClick}
      disabled={disabled}
      className={cn(
        'w-full flex items-center gap-2 px-3 py-2 text-sm text-left text-popover-foreground',
        'hover:bg-accent transition-colors',
        'disabled:opacity-50 disabled:cursor-not-allowed',
        variant === 'destructive' && 'text-destructive hover:bg-destructive/10'
      )}
    >
      {children}
    </button>
  )
}

export function DropdownMenuSeparator() {
  return <div className="h-px bg-border my-1" />
}
